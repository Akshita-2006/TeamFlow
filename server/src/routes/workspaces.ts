import { Router } from "express";
import { z } from "zod";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import { requireWorkspaceRole } from "../middleware/rbac.js";
import { Workspace } from "../models/Workspace.js";
import { asyncHandler, AppError } from "../utils/errors.js";
import { User } from "../models/User.js";
import { Task } from "../models/Task.js";
import { Project } from "../models/Project.js";
import { ActivityLog } from "../models/ActivityLog.js";
import { Invite } from "../models/Invite.js";
import { Notification } from "../models/Notification.js";
import { Submission } from "../models/Submission.js";
import { createPlainToken, hashToken } from "../models/Token.js";
import { sendMail } from "../services/mail.js";
import { config } from "../config.js";

export const workspaceRouter = Router();
workspaceRouter.use(requireAuth);

async function notifyWorkspaceManagers(
  workspace: any,
  payload: { type: string; message: string; project?: any; task?: any },
  exclude: string[] = [],
) {
  const idOf = (value: any) =>
    value?._id?.toString?.() ?? value?.toString?.() ?? String(value);
  const managerIds = workspace.members
    .filter((member: any) => ["OWNER", "ADMIN"].includes(member.role))
    .map((member: any) => idOf(member.user))
    .filter(
      (userId: string, index: number, list: string[]) =>
        !exclude.includes(userId) && list.indexOf(userId) === index,
    );
  if (managerIds.length === 0) return;
  await Notification.insertMany(
    managerIds.map((userId: string) => ({
      user: userId,
      workspace: workspace._id,
      ...payload,
    })),
  );
}

workspaceRouter.get(
  "/",
  asyncHandler(async (req: AuthRequest, res) => {
    const workspaces = await Workspace.find({
      "members.user": req.user!.id,
      deletedAt: { $exists: false },
    })
      .populate("owner", "name username email")
      .populate("members.user", "name username email");
    res.json({ success: true, data: workspaces });
  }),
);

workspaceRouter.post(
  "/",
  asyncHandler(async (req: AuthRequest, res) => {
    const body = z
      .object({
        name: z.string().min(2),
        description: z.string().optional(),
        timezone: z.string().optional(),
      })
      .parse(req.body);
    const workspace = await Workspace.create({
      ...body,
      owner: req.user!.id,
      members: [{ user: req.user!.id, role: "OWNER" }],
    });
    res.status(201).json({ success: true, data: workspace });
  }),
);

workspaceRouter.get(
  "/:id",
  asyncHandler(async (req: AuthRequest, res) => {
    const { workspace } = await requireWorkspaceRole(
      req.user!.id,
      req.params.id,
      ["VIEWER"],
    );
    await workspace.populate("members.user", "name username email");
    res.json({ success: true, data: workspace });
  }),
);

workspaceRouter.patch(
  "/:id",
  asyncHandler(async (req: AuthRequest, res) => {
    await requireWorkspaceRole(req.user!.id, req.params.id, ["ADMIN"]);
    const body = z
      .object({
        name: z.string().min(2).optional(),
        description: z.string().optional(),
        timezone: z.string().optional(),
      })
      .parse(req.body);
    const workspace = await Workspace.findByIdAndUpdate(req.params.id, body, {
      new: true,
    });
    res.json({ success: true, data: workspace });
  }),
);

workspaceRouter.post(
  "/:id/members",
  asyncHandler(async (req: AuthRequest, res) => {
    const { workspace } = await requireWorkspaceRole(
      req.user!.id,
      req.params.id,
      ["ADMIN"],
    );
    const body = z
      .object({
        email: z.string().email(),
        role: z.enum(["ADMIN", "MEMBER", "VIEWER"]).default("MEMBER"),
      })
      .parse(req.body);
    const email = body.email.toLowerCase();
    const user = await User.findOne({ email });
    if (!user) {
      const plain = createPlainToken();
      await Invite.create({
        workspace: workspace._id,
        email,
        role: body.role,
        invitedBy: req.user!.id,
        tokenHash: hashToken(plain),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      });
      const inviteUrl = `${config.clientUrl}/accept-invite?token=${plain}`;
      let devLink: string | undefined;
      try {
        const mail = await sendMail({
          to: email,
          subject: `${workspace.name} invited you to TeamFlow`,
          text: [
            "Hi there,",
            "",
            `You have been invited to join ${workspace.name} on TeamFlow as ${body.role}.`,
            "",
            "TeamFlow helps your project team manage tasks, owners, deadlines, comments and blockers in one workspace.",
            "",
            "Accept your invite here:",
            inviteUrl,
            "",
            "If you do not have an account yet, register with this same email first, then open the invite link again.",
            "This invite expires in 7 days.",
            "",
            "TeamFlow",
          ].join("\n"),
        });
        if (!mail.delivered && process.env.NODE_ENV !== "production")
          devLink = inviteUrl;
      } catch (error) {
        console.warn("[mail] invite email failed", error);
        if (process.env.NODE_ENV !== "production") devLink = inviteUrl;
      }
      await notifyWorkspaceManagers(workspace, {
        type: "INVITE_SENT",
        message: `${email} was invited to ${workspace.name} as ${body.role}.`,
      });
      return res.status(202).json({
        success: true,
        message: "Invite created. User can accept after registering.",
        devLink,
      });
    }
    const existing = workspace.members.find(
      (member) => member.user.toString() === user._id.toString(),
    );
    const wasAlreadyMember = Boolean(existing);
    if (workspace.owner.toString() === user._id.toString())
      throw new AppError(
        400,
        "Workspace owner role cannot be changed here. Use ownership transfer from Settings.",
      );
    if (existing) existing.role = body.role;
    else workspace.members.push({ user: user._id, role: body.role });
    await Invite.updateMany(
      { workspace: workspace._id, email: user.email, status: "PENDING" },
      { status: "ACCEPTED", acceptedAt: new Date() },
    );
    await workspace.save();
    await workspace.populate("members.user", "name username email");
    await Notification.create({
      user: user._id,
      workspace: workspace._id,
      type: wasAlreadyMember ? "WORKSPACE_ROLE_UPDATED" : "WORKSPACE_JOINED",
      message: wasAlreadyMember
        ? `Your role in ${workspace.name} is now ${body.role}.`
        : `You were added to ${workspace.name} as ${body.role}.`,
    });
    await notifyWorkspaceManagers(
      workspace,
      {
        type: wasAlreadyMember ? "MEMBER_ROLE_UPDATED" : "MEMBER_ADDED",
        message: wasAlreadyMember
          ? `${user.name}'s role is now ${body.role}.`
          : `${user.name} joined ${workspace.name} as ${body.role}.`,
      },
      [user._id.toString()],
    );
    try {
      await sendMail({
        to: user.email,
        subject: wasAlreadyMember
          ? `Your role changed in ${workspace.name}`
          : `You were added to ${workspace.name}`,
        text: wasAlreadyMember
          ? [
              `Hi ${user.name},`,
              "",
              `Your role in ${workspace.name} has been updated to ${body.role}.`,
              "",
              "Open your workspace:",
              `${config.clientUrl}/app`,
              "",
              "TeamFlow",
            ].join("\n")
          : [
              `Hi ${user.name},`,
              "",
              `You have been added to ${workspace.name} on TeamFlow as ${body.role}.`,
              "",
              "You can now open the workspace, view projects you have access to, and collaborate on assigned work.",
              "",
              "Open your workspace:",
              `${config.clientUrl}/app`,
              "",
              "TeamFlow",
            ].join("\n"),
      });
    } catch (error) {
      console.warn("[mail] member notification email failed", error);
    }
    res.status(201).json({
      success: true,
      data: workspace,
      message: wasAlreadyMember
        ? "Member role updated and email notification sent."
        : "Registered user added and email notification sent.",
    });
  }),
);

workspaceRouter.delete(
  "/:id/members/:userId",
  asyncHandler(async (req: AuthRequest, res) => {
    const { workspace } = await requireWorkspaceRole(
      req.user!.id,
      req.params.id,
      ["ADMIN"],
    );
    if (workspace.owner.toString() === req.params.userId)
      throw new AppError(400, "Workspace owner cannot be removed");
    const removed = workspace.members.find(
      (member) => member.user.toString() === req.params.userId,
    );
    workspace.members = workspace.members.filter(
      (member) => member.user.toString() !== req.params.userId,
    );
    await workspace.save();
    if (removed) {
      await Notification.create({
        user: removed.user,
        workspace: workspace._id,
        type: "MEMBER_REMOVED",
        message: `You were removed from ${workspace.name}.`,
      });
      await notifyWorkspaceManagers(
        workspace,
        {
          type: "MEMBER_REMOVED",
          message: `A member was removed from ${workspace.name}.`,
        },
        [removed.user.toString()],
      );
    }
    await workspace.populate("members.user", "name username email");
    res.json({ success: true, data: workspace });
  }),
);

workspaceRouter.patch(
  "/:id/members/:userId",
  asyncHandler(async (req: AuthRequest, res) => {
    const { workspace } = await requireWorkspaceRole(
      req.user!.id,
      req.params.id,
      ["ADMIN"],
    );
    const body = z
      .object({ role: z.enum(["ADMIN", "MEMBER", "VIEWER"]) })
      .parse(req.body);
    if (workspace.owner.toString() === req.params.userId)
      throw new AppError(
        400,
        "Workspace owner role cannot be changed here. Use ownership transfer from Settings.",
      );
    const member = workspace.members.find(
      (item) => item.user.toString() === req.params.userId,
    );
    if (!member) throw new AppError(404, "Member not found");
    member.role = body.role;
    await workspace.save();
    await Notification.create({
      user: member.user,
      workspace: workspace._id,
      type: "WORKSPACE_ROLE_UPDATED",
      message: `Your role in ${workspace.name} is now ${body.role}.`,
    });
    await notifyWorkspaceManagers(
      workspace,
      {
        type: "MEMBER_ROLE_UPDATED",
        message: `A member role was changed to ${body.role} in ${workspace.name}.`,
      },
      [member.user.toString()],
    );
    await workspace.populate("members.user", "name username email");
    res.json({
      success: true,
      data: workspace,
      message: "Member role updated.",
    });
  }),
);

workspaceRouter.get(
  "/:id/invites",
  asyncHandler(async (req: AuthRequest, res) => {
    await requireWorkspaceRole(req.user!.id, req.params.id, ["ADMIN"]);
    const invites = await Invite.find({
      workspace: req.params.id,
      status: "PENDING",
    })
      .populate("invitedBy", "name username email")
      .sort({ createdAt: -1 });
    res.json({ success: true, data: invites });
  }),
);

workspaceRouter.delete(
  "/:id/invites/:inviteId",
  asyncHandler(async (req: AuthRequest, res) => {
    await requireWorkspaceRole(req.user!.id, req.params.id, ["ADMIN"]);
    const invite = await Invite.findOne({
      _id: req.params.inviteId,
      workspace: req.params.id,
      status: "PENDING",
    });
    if (!invite) throw new AppError(404, "Pending invite not found");
    invite.status = "REVOKED";
    await invite.save();
    const workspace = await Workspace.findById(req.params.id);
    if (workspace)
      await notifyWorkspaceManagers(workspace, {
        type: "INVITE_CANCELLED",
        message: `Invite for ${invite.email} was cancelled.`,
      });
    res.json({ success: true, message: "Invite cancelled." });
  }),
);

workspaceRouter.post(
  "/invites/accept",
  asyncHandler(async (req: AuthRequest, res) => {
    const body = z.object({ token: z.string().min(20) }).parse(req.body);
    const invite = await Invite.findOne({ tokenHash: hashToken(body.token) });
    if (!invite)
      throw new AppError(
        400,
        "This invite link is not valid. Please ask the workspace owner for a fresh invite.",
      );
    if (invite.status === "REVOKED")
      throw new AppError(
        410,
        "This invite was cancelled by the workspace owner. Please ask for a new invite.",
      );
    if (invite.status === "ACCEPTED")
      throw new AppError(
        409,
        "This invite has already been accepted. Open TeamFlow to continue.",
      );
    if (invite.expiresAt <= new Date())
      throw new AppError(
        410,
        "This invite has expired. Please ask the workspace owner to send a new one.",
      );
    const user = await User.findById(req.user!.id);
    if (!user || user.email !== invite.email)
      throw new AppError(
        403,
        "This invite was sent to a different email address. Login or register with the invited email.",
      );
    const workspace = await Workspace.findById(invite.workspace);
    if (!workspace) throw new AppError(404, "Workspace not found");
    const existing = workspace.members.find(
      (member) => member.user.toString() === req.user!.id,
    );
    if (existing) existing.role = invite.role;
    else workspace.members.push({ user: user._id, role: invite.role });
    await workspace.save();
    if (invite.project) {
      const project = await Project.findById(invite.project);
      if (
        project &&
        !project.members.some((member) => member.toString() === req.user!.id)
      ) {
        project.members.push(user._id as any);
        await project.save();
      }
    }
    invite.status = "ACCEPTED";
    invite.acceptedAt = new Date();
    await invite.save();
    await notifyWorkspaceManagers(
      workspace,
      {
        type: "INVITE_ACCEPTED",
        message: `${user.name} accepted the invite to ${workspace.name}.`,
      },
      [user._id.toString()],
    );
    await Notification.create({
      user: user._id,
      workspace: workspace._id,
      project: invite.project,
      type: "WORKSPACE_JOINED",
      message: `You joined ${workspace.name} as ${invite.role}.`,
    });
    await workspace.populate("members.user", "name username email");
    res.json({ success: true, data: workspace });
  }),
);

workspaceRouter.post(
  "/:id/transfer-owner",
  asyncHandler(async (req: AuthRequest, res) => {
    const { workspace } = await requireWorkspaceRole(
      req.user!.id,
      req.params.id,
      ["OWNER"],
    );
    const body = z.object({ userId: z.string().min(1) }).parse(req.body);
    const member = workspace.members.find(
      (item) => item.user.toString() === body.userId,
    );
    if (!member)
      throw new AppError(400, "New owner must be a workspace member");
    const currentOwner = workspace.members.find(
      (item) => item.user.toString() === workspace.owner.toString(),
    );
    if (currentOwner) currentOwner.role = "ADMIN";
    member.role = "OWNER";
    workspace.owner = member.user;
    await workspace.save();
    await workspace.populate("members.user", "name username email");
    res.json({ success: true, data: workspace });
  }),
);

workspaceRouter.get(
  "/:id/activity",
  asyncHandler(async (req: AuthRequest, res) => {
    await requireWorkspaceRole(req.user!.id, req.params.id, ["VIEWER"]);
    const optionalQueryString = z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.string().optional(),
    );
    const optionalQueryDate = z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.coerce.date().optional(),
    );
    const q = z
      .object({
        project: optionalQueryString,
        actor: optionalQueryString,
        from: optionalQueryDate,
        to: optionalQueryDate,
      })
      .parse(req.query);
    const filter: any = { workspace: req.params.id };
    if (q.project) filter.project = q.project;
    if (q.actor) filter.actor = q.actor;
    if (q.to) q.to.setHours(23, 59, 59, 999);
    if (q.from || q.to)
      filter.createdAt = {
        ...(q.from ? { $gte: q.from } : {}),
        ...(q.to ? { $lte: q.to } : {}),
      };
    const activity = await ActivityLog.find(filter)
      .populate("actor", "name username email")
      .populate("project", "name")
      .populate("task", "title")
      .sort({ createdAt: -1 })
      .limit(100);
    res.json({ success: true, data: activity });
  }),
);
workspaceRouter.get(
  "/:id/my-summary",
  asyncHandler(async (req: AuthRequest, res) => {
    await requireWorkspaceRole(req.user!.id, req.params.id, ["VIEWER"]);
    const projectFilter: any = {
      workspace: req.params.id,
      members: req.user!.id,
    };
    const projects = await Project.find(projectFilter).sort({
      deadline: 1,
      updatedAt: -1,
    });
    const projectIds = projects.map((project) => project._id);
    const today = new Date();
    const tasks = await Task.find({
      workspace: req.params.id,
      project: { $in: projectIds },
      assignee: req.user!.id,
    })
      .populate("project", "name deadline")
      .sort({ dueDate: 1, updatedAt: -1 });
    const allProjectTasks = await Task.find({
      workspace: req.params.id,
      project: { $in: projectIds },
      deletedAt: { $exists: false },
    }).select("status dependencies priority dueDate project");
    const submissions = await Submission.find({
      workspace: req.params.id,
      project: { $in: projectIds },
    })
      .populate("project", "name")
      .populate("task", "title")
      .sort({ updatedAt: -1 })
      .limit(100);
    const total = tasks.length;
    const completed = tasks.filter((task) => task.status === "DONE").length;
    const active = tasks.filter((task) => task.status !== "DONE").length;
    const overdue = tasks.filter(
      (task) => task.dueDate && task.dueDate < today && task.status !== "DONE",
    ).length;
    const highPriority = tasks.filter((task) =>
      ["HIGH", "CRITICAL"].includes(task.priority),
    ).length;
    const projectTaskById = new Map(
      allProjectTasks.map((task) => [task._id.toString(), task]),
    );
    const blockedTasks = allProjectTasks.filter((task) =>
      task.dependencies.some(
        (dependency) =>
          projectTaskById.get(dependency.toString())?.status !== "DONE",
      ),
    ).length;
    const pendingReviews = submissions.filter(
      (submission) => submission.status === "PENDING_REVIEW",
    ).length;
    const approvedDeliverables = submissions.filter(
      (submission) => submission.status === "APPROVED",
    ).length;
    const deliveredFiles = submissions
      .filter((submission) => submission.status === "APPROVED")
      .reduce((sum, submission) => sum + submission.files.length, 0);
    const byStatus = {
      todo: tasks.filter((task) => task.status === "TODO").length,
      inProgress: tasks.filter((task) => task.status === "IN_PROGRESS").length,
      inReview: tasks.filter((task) => task.status === "IN_REVIEW").length,
      done: completed,
    };
    const recentActivity = await ActivityLog.find({
      workspace: req.params.id,
      project: { $in: projectIds },
      actor: req.user!.id,
    })
      .populate("project", "name")
      .populate("task", "title")
      .sort({ createdAt: -1 })
      .limit(8);
    res.json({
      success: true,
      data: {
        assignedTaskStats: {
          total,
          completed,
          active,
          overdue,
          highPriority,
          byStatus,
        },
        deliveryStats: {
          pendingReviews,
          approvedDeliverables,
          deliveredFiles,
          blockedTasks,
        },
        recentSubmissions: submissions.slice(0, 8),
        assignedDeadlines: tasks
          .filter((task) => task.dueDate && task.status !== "DONE")
          .slice(0, 8),
        projectDeadlines: projects
          .filter((project) => project.deadline)
          .slice(0, 8),
        recentActivity,
      },
    });
  }),
);
workspaceRouter.get(
  "/:id/members/:userId/profile",
  asyncHandler(async (req: AuthRequest, res) => {
    const { workspace } = await requireWorkspaceRole(
      req.user!.id,
      req.params.id,
      ["VIEWER"],
    );
    const member = workspace.members.find(
      (item) => item.user.toString() === req.params.userId,
    );
    if (!member) throw new AppError(404, "Member not found in this workspace");
    const user = await User.findById(req.params.userId).select(
      "name username username email avatarUrl createdAt",
    );
    const tasks = await Task.find({
      workspace: workspace._id,
      assignee: req.params.userId,
    })
      .populate("project", "name")
      .sort({ updatedAt: -1 })
      .limit(20);
    const now = new Date();
    res.json({
      success: true,
      data: {
        user,
        role: member.role,
        stats: {
          assigned: tasks.length,
          completed: tasks.filter((task) => task.status === "DONE").length,
          active: tasks.filter((task) => task.status !== "DONE").length,
          overdue: tasks.filter(
            (task) =>
              task.dueDate && task.dueDate < now && task.status !== "DONE",
          ).length,
          highPriority: tasks.filter((task) =>
            ["HIGH", "CRITICAL"].includes(task.priority),
          ).length,
        },
        tasks,
      },
    });
  }),
);

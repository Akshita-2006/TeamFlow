import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { User } from "../models/User.js";
import { Workspace } from "../models/Workspace.js";
import { Project } from "../models/Project.js";
import { Task } from "../models/Task.js";
import { Comment } from "../models/Comment.js";
import { Notification } from "../models/Notification.js";
import { ActivityLog } from "../models/ActivityLog.js";
import { Invite } from "../models/Invite.js";
import { Token, createPlainToken, hashToken } from "../models/Token.js";
import { sendMail } from "../services/mail.js";
import { passwordResetEmail } from "../services/emailTemplates.js";
import { config } from "../config.js";
import { asyncHandler, AppError } from "../utils/errors.js";
import { requireAuth, signToken, type AuthRequest } from "../middleware/auth.js";

export const authRouter = Router();

function publicUser(user: any) {
  return { id: user._id, name: user.name, username: user.username, email: user.email };
}

async function acceptPendingInvitesForUser(user: any) {
  const invites = await Invite.find({
    email: user.email,
    status: "PENDING",
    expiresAt: { $gt: new Date() },
  });
  if (invites.length === 0) return [];

  const joinedWorkspaceIds: string[] = [];
  for (const invite of invites) {
    const workspace = await Workspace.findById(invite.workspace);
    if (!workspace) continue;

    const existing = workspace.members.find((member) => member.user.toString() === user._id.toString());
    if (existing) existing.role = invite.role;
    else workspace.members.push({ user: user._id, role: invite.role });
    await workspace.save();

    if (invite.project) {
      const project = await Project.findById(invite.project);
      if (project && !project.members.some((member) => member.toString() === user._id.toString())) {
        project.members.push(user._id as any);
        await project.save();
      }
    }

    invite.status = "ACCEPTED";
    invite.acceptedAt = new Date();
    await invite.save();
    joinedWorkspaceIds.push(workspace._id.toString());

    const managerIds = workspace.members
      .filter((member: any) => ["OWNER", "ADMIN"].includes(member.role))
      .map((member: any) => member.user.toString())
      .filter((userId: string, index: number, list: string[]) => userId !== user._id.toString() && list.indexOf(userId) === index);
    if (managerIds.length > 0) {
      await Notification.insertMany(
        managerIds.map((managerId) => ({
          user: managerId,
          workspace: workspace._id,
          type: "INVITE_ACCEPTED",
          message: `${user.name} accepted the invite to ${workspace.name}.`,
        })),
      );
    }
    await Notification.create({
      user: user._id,
      workspace: workspace._id,
      project: invite.project,
      type: "WORKSPACE_JOINED",
      message: `You joined ${workspace.name} as ${invite.role}.`,
    });
  }

  return joinedWorkspaceIds;
}

authRouter.post(
  "/register",
  asyncHandler(async (req, res) => {
    const body = z.object({ name: z.string().min(2), username: z.string().min(3).max(24).regex(/^[a-zA-Z0-9_]+$/, "Username can use letters, numbers and underscore only"), email: z.string().email(), password: z.string().min(8) }).parse(req.body);
    const username = body.username.toLowerCase();
    const exists = await User.findOne({ $or: [{ email: body.email.toLowerCase() }, { username }] });
    if (exists?.email === body.email.toLowerCase()) throw new AppError(409, "Email is already registered");
    if (exists?.username === username) throw new AppError(409, "Username is already taken");
    const user = await User.create({ name: body.name, username, email: body.email.toLowerCase(), passwordHash: await bcrypt.hash(body.password, 12) });
    await Workspace.create({ name: `${body.name}'s Workspace`, owner: user._id, members: [{ user: user._id, role: "OWNER" }] });
    const acceptedInviteWorkspaceIds = await acceptPendingInvitesForUser(user);
    res.status(201).json({ success: true, token: signToken(user._id.toString()), user: publicUser(user), acceptedInviteWorkspaceIds });
  })
);

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const body = z.object({ email: z.string().email(), password: z.string() }).parse(req.body);
    const user = await User.findOne({ email: body.email });
    if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) throw new AppError(401, "Invalid email or password");
    res.json({ success: true, token: signToken(user._id.toString()), user: publicUser(user) });
  })
);


authRouter.post(
  "/forgot-password",
  asyncHandler(async (req, res) => {
    const body = z.object({ email: z.string().email() }).parse(req.body);
    const user = await User.findOne({ email: body.email.toLowerCase() });
    let devLink: string | undefined;
    if (user) {
      const plain = createPlainToken();
      await Token.create({ user: user._id, email: user.email, purpose: "PASSWORD_RESET", tokenHash: hashToken(plain), expiresAt: new Date(Date.now() + 1000 * 60 * 30) });
      const resetUrl = `${config.clientUrl}/reset-password?token=${plain}`;
      try {
        const template = passwordResetEmail({ name: user.name, resetUrl });
        const mail = await sendMail({
          to: user.email,
          ...template
        });
        if (!mail.delivered && process.env.NODE_ENV !== "production") devLink = resetUrl;
      } catch (error) {
        console.warn("[mail] password reset email failed", error);
        if (process.env.NODE_ENV !== "production") devLink = resetUrl;
      }
    }
    res.json({ success: true, message: "If this email is registered, a reset link has been sent.", devLink });
  })
);

authRouter.post(
  "/reset-password",
  asyncHandler(async (req, res) => {
    const body = z.object({ token: z.string().min(20), password: z.string().min(8) }).parse(req.body);
    const reset = await Token.findOne({ tokenHash: hashToken(body.token), purpose: "PASSWORD_RESET", usedAt: { $exists: false }, expiresAt: { $gt: new Date() } });
    if (!reset?.user) throw new AppError(400, "Reset link is invalid or expired");
    const user = await User.findById(reset.user);
    if (!user) throw new AppError(404, "User not found");
    user.passwordHash = await bcrypt.hash(body.password, 12);
    await user.save();
    reset.usedAt = new Date();
    await reset.save();
    res.json({ success: true, message: "Password reset successful" });
  })
);

authRouter.post(
  "/refresh",
  requireAuth,
  asyncHandler(async (req: AuthRequest, res) => {
    res.json({ success: true, token: signToken(req.user!.id) });
  })
);
authRouter.post("/logout", (_req, res) => res.json({ success: true }));

authRouter.delete(
  "/me",
  requireAuth,
  asyncHandler(async (req: AuthRequest, res) => {
    const userId = req.user!.id;
    const ownedWorkspaces = await Workspace.find({ owner: userId });
    const ownedWorkspaceIds = ownedWorkspaces.map((workspace) => workspace._id);

    if (ownedWorkspaceIds.length > 0) {
      const ownedProjects = await Project.find({ workspace: { $in: ownedWorkspaceIds } });
      const ownedProjectIds = ownedProjects.map((project) => project._id);
      const ownedTasks = await Task.find({ workspace: { $in: ownedWorkspaceIds } });
      const ownedTaskIds = ownedTasks.map((task) => task._id);

      await Promise.all([
        Comment.deleteMany({ task: { $in: ownedTaskIds } }),
        Notification.deleteMany({ workspace: { $in: ownedWorkspaceIds } }),
        ActivityLog.deleteMany({ workspace: { $in: ownedWorkspaceIds } }),
        Task.deleteMany({ workspace: { $in: ownedWorkspaceIds } }),
        Project.deleteMany({ _id: { $in: ownedProjectIds } }),
        Workspace.deleteMany({ _id: { $in: ownedWorkspaceIds } })
      ]);
    }

    await Promise.all([
      Workspace.updateMany({ "members.user": userId }, { $pull: { members: { user: userId } } }),
      Task.updateMany({ assignee: userId }, { $unset: { assignee: "" } }),
      Task.updateMany({ creator: userId }, { $unset: { creator: "" } }),
      Comment.deleteMany({ author: userId }),
      Notification.deleteMany({ user: userId }),
      ActivityLog.deleteMany({ actor: userId }),
      User.findByIdAndDelete(userId)
    ]);

    res.status(204).end();
  })
);


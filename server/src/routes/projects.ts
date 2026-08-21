import { Router } from "express";
import { z } from "zod";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import { requireProjectAccess, requireWorkspaceRole } from "../middleware/rbac.js";
import { Project } from "../models/Project.js";
import { Task } from "../models/Task.js";
import { Comment } from "../models/Comment.js";
import { asyncHandler, AppError } from "../utils/errors.js";
import { dependencyAnalysis } from "../services/dependencies.js";
import { workload } from "../services/workload.js";
import { ActivityLog } from "../models/ActivityLog.js";
import { Submission } from "../models/Submission.js";

export const projectRouter = Router();
projectRouter.use(requireAuth);

projectRouter.get("/", asyncHandler(async (req: AuthRequest, res) => {
  const q = z.object({ workspace: z.string(), search: z.string().optional(), page: z.coerce.number().default(1), includeArchived: z.coerce.boolean().default(false) }).parse(req.query);
  await requireWorkspaceRole(req.user!.id, q.workspace, ["VIEWER"]);
  const filter: any = { workspace: q.workspace, deletedAt: { $exists: false } };
  if (!q.includeArchived) filter.archivedAt = { $exists: false };
  filter.members = req.user!.id;
  if (q.search) filter.$text = { $search: q.search };
  const data = await Project.find(filter).skip((q.page - 1) * 20).limit(20).sort({ updatedAt: -1 });
  res.json({ success: true, data });
}));

projectRouter.post("/", asyncHandler(async (req: AuthRequest, res) => {
  const body = z.object({ workspace: z.string(), name: z.string().min(2), description: z.string().optional(), startDate: z.coerce.date().optional(), deadline: z.coerce.date().optional(), status: z.enum(["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED"]).default("ACTIVE") }).parse(req.body);
  const { workspace } = await requireWorkspaceRole(req.user!.id, body.workspace, ["ADMIN"]);
  const memberIds = Array.from(new Set([req.user!.id, workspace.owner.toString()]));
  const project = await Project.create({ ...body, owner: req.user!.id, members: memberIds });
  await ActivityLog.create({ workspace: workspace._id, project: project._id, actor: req.user!.id, action: "PROJECT_CREATED", metadata: { name: project.name } });
  res.status(201).json({ success: true, data: project });
}));

projectRouter.get("/:id", asyncHandler(async (req: AuthRequest, res) => {
  const project = await Project.findById(req.params.id).populate("members", "name username email").populate("owner", "name username email");
  if (!project) throw new AppError(404, "Project not found");
  if (!project.owner) {
    project.owner = req.user!.id as any;
    if (!project.members.some((member) => member.toString() === req.user!.id)) project.members.push(req.user!.id as any);
    await project.save();
    await project.populate("owner", "name username email");
  }
  await requireProjectAccess(req.user!.id, project, ["VIEWER"]);
  const counts = await Task.aggregate([{ $match: { project: project._id } }, { $group: { _id: "$status", count: { $sum: 1 } } }]);
  res.json({ success: true, data: { project, counts } });
}));

projectRouter.patch("/:id", asyncHandler(async (req: AuthRequest, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) throw new AppError(404, "Project not found");
  await requireProjectAccess(req.user!.id, project, ["ADMIN"]);
  Object.assign(project, z.object({ name: z.string().optional(), description: z.string().optional(), status: z.enum(["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED"]).optional(), deadline: z.coerce.date().optional() }).parse(req.body));
  await project.save();
  await ActivityLog.create({ workspace: project.workspace, project: project._id, actor: req.user!.id, action: "PROJECT_UPDATED" });
  res.json({ success: true, data: project });
}));

projectRouter.post("/:id/transfer-owner", asyncHandler(async (req: AuthRequest, res) => {
  const body = z.object({ userId: z.string().min(1) }).parse(req.body);
  const project = await Project.findById(req.params.id);
  if (!project) throw new AppError(404, "Project not found");
  const { workspace, role } = await requireProjectAccess(req.user!.id, project, ["ADMIN"]);
  const isProjectOwner = project.owner?.toString() === req.user!.id;
  if (!isProjectOwner && !["OWNER", "ADMIN"].includes(role)) throw new AppError(403, "Only project owner or workspace owner/admin can transfer project ownership.");
  const isWorkspaceMember = workspace.members.some((member: any) => member.user.toString() === body.userId);
  if (!isWorkspaceMember) throw new AppError(400, "New project owner must be a workspace member.");
  if (!project.members.some((member) => member.toString() === body.userId)) project.members.push(body.userId as any);
  project.owner = body.userId as any;
  await project.save();
  await ActivityLog.create({ workspace: project.workspace, project: project._id, actor: req.user!.id, action: "PROJECT_OWNER_TRANSFERRED", metadata: { userId: body.userId } });
  await project.populate("members", "name username email");
  await project.populate("owner", "name username email");
  res.json({ success: true, data: project, message: "Project ownership transferred." });
}));

projectRouter.delete("/:id", asyncHandler(async (req: AuthRequest, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) throw new AppError(404, "Project not found");
  await requireProjectAccess(req.user!.id, project, ["ADMIN"]);
  project.deletedAt = new Date();
  await project.save();
  await Task.updateMany({ project: project._id }, { deletedAt: new Date() });
  await ActivityLog.create({ workspace: project.workspace, project: project._id, actor: req.user!.id, action: "PROJECT_DELETED", metadata: { name: project.name } });
  res.status(204).end();
}));

projectRouter.post("/:id/members", asyncHandler(async (req: AuthRequest, res) => {
  const body = z.object({ userId: z.string().min(1) }).parse(req.body);
  const project = await Project.findById(req.params.id);
  if (!project) throw new AppError(404, "Project not found");
  const { workspace } = await requireProjectAccess(req.user!.id, project, ["ADMIN"]);
  const isWorkspaceMember = workspace.members.some((member: any) => member.user.toString() === body.userId);
  if (!isWorkspaceMember) throw new AppError(400, "Add this user to the workspace team before adding them to this project.");
  if (workspace.owner.toString() === body.userId && !project.members.some((member) => member.toString() === body.userId)) {
    project.members.push(body.userId as any);
    await project.save();
    await project.populate("members", "name username email");
    return res.status(201).json({ success: true, data: project });
  }
  const isProjectMember = project.members.some((member) => member.toString() === body.userId);
  if (!isProjectMember) {
    project.members.push(body.userId as any);
    await project.save();
  }
  await project.populate("members", "name username email");
  await ActivityLog.create({ workspace: project.workspace, project: project._id, actor: req.user!.id, action: "PROJECT_MEMBER_ADDED", metadata: { userId: body.userId } });
  res.status(201).json({ success: true, data: project });
}));

projectRouter.delete("/:id/members/:userId", asyncHandler(async (req: AuthRequest, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) throw new AppError(404, "Project not found");
  const { workspace } = await requireProjectAccess(req.user!.id, project, ["ADMIN"]);
  if (workspace.owner.toString() === req.params.userId) throw new AppError(400, "Workspace owner cannot be removed from a project.");
  const taskIds = await Task.find({ project: project._id }).distinct("_id");
  project.members = project.members.filter((member) => member.toString() !== req.params.userId) as any;
  await project.save();
  await Task.updateMany({ project: project._id, assignee: req.params.userId }, { $unset: { assignee: "" } });
  await Comment.deleteMany({ task: { $in: taskIds }, author: req.params.userId });
  await project.populate("members", "name username email");
  await ActivityLog.create({ workspace: project.workspace, project: project._id, actor: req.user!.id, action: "PROJECT_MEMBER_REMOVED", metadata: { userId: req.params.userId } });
  res.json({ success: true, data: project });
}));


projectRouter.post("/:id/archive", asyncHandler(async (req: AuthRequest, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) throw new AppError(404, "Project not found");
  await requireProjectAccess(req.user!.id, project, ["ADMIN"]);
  project.archivedAt = new Date();
  project.status = "COMPLETED";
  await project.save();
  await ActivityLog.create({ workspace: project.workspace, project: project._id, actor: req.user!.id, action: "PROJECT_ARCHIVED" });
  res.json({ success: true, data: project });
}));

projectRouter.post("/:id/unarchive", asyncHandler(async (req: AuthRequest, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) throw new AppError(404, "Project not found");
  await requireProjectAccess(req.user!.id, project, ["ADMIN"]);
  project.archivedAt = undefined;
  project.status = "ACTIVE";
  await project.save();
  await ActivityLog.create({ workspace: project.workspace, project: project._id, actor: req.user!.id, action: "PROJECT_UNARCHIVED" });
  res.json({ success: true, data: project });
}));
projectRouter.get("/:id/dependency-analysis", asyncHandler(async (req: AuthRequest, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) throw new AppError(404, "Project not found");
  await requireProjectAccess(req.user!.id, project, ["VIEWER"]);
  res.json({ success: true, data: await dependencyAnalysis(req.params.id) });
}));

projectRouter.get("/:id/submissions", asyncHandler(async (req: AuthRequest, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) throw new AppError(404, "Project not found");
  await requireProjectAccess(req.user!.id, project, ["VIEWER"]);
  const data = await Submission.find({ project: project._id })
    .populate("task", "title status priority assignee")
    .populate("submitter", "name username email")
    .populate("reviewer", "name username email")
    .sort({ updatedAt: -1 })
    .limit(100);
  res.json({ success: true, data });
}));

projectRouter.get("/:id/workload", asyncHandler(async (req: AuthRequest, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) throw new AppError(404, "Project not found");
  await requireProjectAccess(req.user!.id, project, ["VIEWER"]);
  res.json({ success: true, data: await workload(req.params.id) });
}));

projectRouter.get("/:id/activity", asyncHandler(async (req: AuthRequest, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) throw new AppError(404, "Project not found");
  await requireProjectAccess(req.user!.id, project, ["VIEWER"]);
  const q = z.object({ actor: z.string().optional(), from: z.coerce.date().optional(), to: z.coerce.date().optional() }).parse(req.query);
  const filter: any = { project: req.params.id };
  if (q.actor) filter.actor = q.actor;
  if (q.from || q.to) filter.createdAt = { ...(q.from ? { $gte: q.from } : {}), ...(q.to ? { $lte: q.to } : {}) };
  res.json({ success: true, data: await ActivityLog.find(filter).sort({ createdAt: -1 }).limit(100).populate("actor", "name username email").populate("task", "title") });
}));





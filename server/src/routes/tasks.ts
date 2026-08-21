import { Router } from "express";
import { z } from "zod";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import { requireProjectAccess } from "../middleware/rbac.js";
import { Project } from "../models/Project.js";
import { Workspace } from "../models/Workspace.js";
import { Task } from "../models/Task.js";
import { Comment } from "../models/Comment.js";
import { ActivityLog } from "../models/ActivityLog.js";
import { Notification } from "../models/Notification.js";
import { Submission } from "../models/Submission.js";
import { addDependency } from "../services/dependencies.js";
import { asyncHandler, AppError } from "../utils/errors.js";

export const taskRouter = Router();
taskRouter.use(requireAuth);

async function notifyProjectAudience(project: any, payload: { type: string; message: string; task?: any }, exclude: string[] = []) {
  const workspace = await Workspace.findById(project.workspace);
  const recipients = new Set<string>();
  for (const member of project.members ?? []) recipients.add(member.toString());
  for (const member of workspace?.members ?? []) if (["OWNER", "ADMIN"].includes(member.role)) recipients.add(member.user.toString());
  for (const userId of exclude) recipients.delete(userId);
  if (recipients.size === 0) return;
  await Notification.insertMany([...recipients].map((userId) => ({ user: userId, workspace: project.workspace, project: project._id, ...payload })));
}

taskRouter.get("/", asyncHandler(async (req: AuthRequest, res) => {
  const q = z.object({
    project: z.string(),
    search: z.string().optional(),
    status: z.string().optional(),
    priority: z.string().optional(),
    assignee: z.string().optional(),
    label: z.string().optional(),
    page: z.coerce.number().default(1),
    sort: z.string().default("-updatedAt")
  }).parse(req.query);
  const project = await Project.findById(q.project);
  if (!project) throw new AppError(404, "Project not found");
  await requireProjectAccess(req.user!.id, project, ["VIEWER"]);
  const filter: any = { project: q.project, deletedAt: { $exists: false } };
  if (q.search) filter.$text = { $search: q.search };
  if (q.status) filter.status = q.status;
  if (q.priority) filter.priority = q.priority;
  if (q.assignee) filter.assignee = q.assignee;
  if (q.label) filter.labels = q.label;
  const data = await Task.find(filter).populate("assignee", "name username email").skip((q.page - 1) * 25).limit(25).sort(q.sort);
  res.json({ success: true, data });
}));

taskRouter.post("/", asyncHandler(async (req: AuthRequest, res) => {
  const body = z.object({
    project: z.string(),
    title: z.string().min(2),
    description: z.string().optional(),
    assignee: z.string().optional(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
    dueDate: z.coerce.date().optional(),
    labels: z.array(z.string()).default([]),
    estimatedEffort: z.number().min(0).default(1),
    attachments: z.array(z.object({ name: z.string(), url: z.string(), type: z.string().optional(), size: z.number().optional() })).default([])
  }).parse(req.body);
  const project = await Project.findById(body.project);
  if (!project) throw new AppError(404, "Project not found");
  await requireProjectAccess(req.user!.id, project, ["MEMBER"]);
  if (body.assignee && !project.members.some((member: any) => member.toString() === body.assignee)) throw new AppError(400, "Assignee must be a member of this project");
  const task = await Task.create({ ...body, workspace: project.workspace, creator: req.user!.id, watchers: [req.user!.id] });
  await ActivityLog.create({ workspace: project.workspace, project: project._id, task: task._id, actor: req.user!.id, action: "TASK_CREATED", metadata: { title: task.title } });
  if (body.assignee) await Notification.create({ user: body.assignee, workspace: project.workspace, project: project._id, task: task._id, type: "TASK_ASSIGNED", message: `You were assigned: ${task.title}` });
  await notifyProjectAudience(project, { task: task._id, type: "TASK_CREATED", message: `New task created: ${task.title}` }, [req.user!.id, body.assignee ?? ""]);
  req.app.get("io")?.to(`project:${project._id}`).emit("task:created", task);
  res.status(201).json({ success: true, data: task });
}));

taskRouter.patch("/:id", asyncHandler(async (req: AuthRequest, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) throw new AppError(404, "Task not found");
  const { project, role } = await requireProjectAccess(req.user!.id, task.project.toString(), ["MEMBER"]);
  const body = z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    assignee: z.string().optional(),
    status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]).optional(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
    dueDate: z.coerce.date().optional(),
    labels: z.array(z.string()).optional(),
    estimatedEffort: z.number().min(0).optional(),
    attachments: z.array(z.object({ name: z.string(), url: z.string(), type: z.string().optional(), size: z.number().optional() })).optional()
  }).parse(req.body);
  const before = task.toObject();
  const hasStatusChange = Object.prototype.hasOwnProperty.call(body, "status") && body.status !== before.status;
  const nonProgressFields = Object.keys(body).filter((key) => key !== "status");
  const isTaskOwner = task.assignee?.toString() === req.user!.id;
  const isWorkspaceManager = ["OWNER", "ADMIN"].includes(role);

  if (hasStatusChange && !isTaskOwner) throw new AppError(403, "Only the assigned task owner can update task progress.");
  if (hasStatusChange && body.status === "DONE") throw new AppError(400, "Submit the task for review. Done is set after owner/admin approval.");
  if (hasStatusChange && body.status !== "TODO") {
    const unfinishedDependencies = await Task.countDocuments({ _id: { $in: task.dependencies }, status: { $ne: "DONE" } });
    if (unfinishedDependencies > 0) throw new AppError(400, "This task is blocked. Complete its dependencies before moving it forward.");
  }
  if (nonProgressFields.length > 0 && !isWorkspaceManager) throw new AppError(403, "Only the workspace owner or admin can edit task details.");

  Object.assign(task, body);
  if (task.assignee && !project.members.some((member: any) => member.toString() === task.assignee?.toString())) throw new AppError(400, "Assignee must be a member of this project");
  if (task.status === "DONE" && before.status !== "DONE") task.actualCompletedDate = new Date();
  if (task.status !== "DONE") task.actualCompletedDate = undefined;
  await task.save();
  await ActivityLog.create({ workspace: task.workspace, project: task.project, task: task._id, actor: req.user!.id, action: "TASK_UPDATED", metadata: { beforeStatus: before.status, afterStatus: task.status, fields: Object.keys(body) } });
  if (body.assignee && body.assignee !== before.assignee?.toString()) {
    await Notification.create({ user: body.assignee, workspace: task.workspace, project: task.project, task: task._id, type: "TASK_ASSIGNED", message: `You were assigned: ${task.title}` });
  }
  if (task.status === "DONE" && before.status !== "DONE") {
    await notifyProjectAudience(project, { task: task._id, type: "TASK_COMPLETED", message: `${task.title} was marked Done.` }, [req.user!.id]);
  }
  req.app.get("io")?.to(`project:${task.project}`).emit("task:updated", task);
  res.json({ success: true, data: task });
}));

taskRouter.get("/:id/submissions", asyncHandler(async (req: AuthRequest, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) throw new AppError(404, "Task not found");
  await requireProjectAccess(req.user!.id, task.project.toString(), ["VIEWER"]);
  const data = await Submission.find({ task: task._id }).populate("submitter", "name username email").populate("reviewer", "name username email").sort({ version: -1 });
  res.json({ success: true, data });
}));

taskRouter.post("/:id/submissions", asyncHandler(async (req: AuthRequest, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) throw new AppError(404, "Task not found");
  const { project } = await requireProjectAccess(req.user!.id, task.project.toString(), ["MEMBER"]);
  const isTaskOwner = task.assignee?.toString() === req.user!.id;
  if (!isTaskOwner) throw new AppError(403, "Only the assigned task owner can submit work for review.");
  const body = z.object({
    note: z.string().optional(),
    files: z.array(z.object({ name: z.string().min(1), url: z.string().min(1), type: z.string().optional(), size: z.number().optional() })).min(1, "Add at least one file or link.")
  }).parse(req.body);
  const unfinishedDependencies = await Task.countDocuments({ _id: { $in: task.dependencies }, status: { $ne: "DONE" } });
  if (unfinishedDependencies > 0) throw new AppError(400, "This task is blocked. Complete its dependencies before submitting.");
  const previousVersion = await Submission.findOne({ task: task._id }).sort({ version: -1 });
  const submission = await Submission.create({
    workspace: task.workspace,
    project: task.project,
    task: task._id,
    submitter: req.user!.id,
    version: (previousVersion?.version ?? 0) + 1,
    status: "PENDING_REVIEW",
    note: body.note,
    files: body.files
  });
  task.status = "IN_REVIEW";
  task.attachments = body.files;
  await task.save();
  await ActivityLog.create({ workspace: task.workspace, project: task.project, task: task._id, actor: req.user!.id, action: "SUBMISSION_CREATED", metadata: { version: submission.version, files: body.files.length } });
  await notifyProjectAudience(project, { task: task._id, type: "SUBMISSION_READY", message: `${task.title} was submitted for review.` }, [req.user!.id]);
  req.app.get("io")?.to(`project:${task.project}`).emit("submission:created", submission);
  res.status(201).json({ success: true, data: submission });
}));

taskRouter.patch("/:id/submissions/:submissionId/review", asyncHandler(async (req: AuthRequest, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) throw new AppError(404, "Task not found");
  const { project } = await requireProjectAccess(req.user!.id, task.project.toString(), ["ADMIN"]);
  const submission = await Submission.findOne({ _id: req.params.submissionId, task: task._id });
  if (!submission) throw new AppError(404, "Submission not found");
  if (submission.status !== "PENDING_REVIEW") throw new AppError(400, "This submission has already been reviewed.");
  const body = z.object({
    decision: z.enum(["APPROVED", "CHANGES_REQUESTED", "REJECTED"]),
    reviewNote: z.string().optional()
  }).parse(req.body);
  submission.status = body.decision;
  submission.reviewNote = body.reviewNote;
  submission.reviewer = req.user!.id as any;
  submission.reviewedAt = new Date();
  await submission.save();
  if (body.decision === "APPROVED") {
    task.status = "DONE";
    task.actualCompletedDate = new Date();
  } else {
    task.status = "IN_PROGRESS";
    task.actualCompletedDate = undefined;
  }
  await task.save();
  const action = body.decision === "APPROVED" ? "SUBMISSION_APPROVED" : body.decision === "CHANGES_REQUESTED" ? "SUBMISSION_CHANGES_REQUESTED" : "SUBMISSION_REJECTED";
  await ActivityLog.create({ workspace: task.workspace, project: task.project, task: task._id, actor: req.user!.id, action, metadata: { version: submission.version, reviewNote: body.reviewNote } });
  if (task.assignee) {
    const message = body.decision === "APPROVED" ? `${task.title} was approved and marked Done.` : `${task.title} needs changes before approval.`;
    await Notification.create({ user: task.assignee, workspace: task.workspace, project: task.project, task: task._id, type: action, message });
  }
  await notifyProjectAudience(project, { task: task._id, type: action, message: `${task.title}: ${body.decision.replaceAll("_", " ").toLowerCase()}.` }, [req.user!.id, task.assignee?.toString() ?? ""]);
  req.app.get("io")?.to(`project:${task.project}`).emit("submission:reviewed", submission);
  res.json({ success: true, data: submission });
}));
taskRouter.delete("/:id", asyncHandler(async (req: AuthRequest, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) throw new AppError(404, "Task not found");
  await requireProjectAccess(req.user!.id, task.project.toString(), ["ADMIN"]);
  task.deletedAt = new Date();
  await task.save();
  await Task.updateMany({ project: task.project }, { $pull: { dependencies: task._id } });
  await ActivityLog.create({ workspace: task.workspace, project: task.project, task: task._id, actor: req.user!.id, action: "TASK_DELETED", metadata: { title: task.title } });
  req.app.get("io")?.to(`project:${task.project}`).emit("task:deleted", { taskId: req.params.id });
  res.status(204).end();
}));

taskRouter.post("/:id/dependencies", asyncHandler(async (req: AuthRequest, res) => {
  const body = z.object({ dependencyId: z.string() }).parse(req.body);
  const task = await Task.findById(req.params.id);
  if (!task) throw new AppError(404, "Task not found");
  await requireProjectAccess(req.user!.id, task.project.toString(), ["ADMIN"]);
  const updated = await addDependency(req.params.id, body.dependencyId, req.user!.id);
  await ActivityLog.create({ workspace: task.workspace, project: task.project, task: task._id, actor: req.user!.id, action: "DEPENDENCY_ADDED", metadata: body });
  res.status(201).json({ success: true, data: updated });
}));

taskRouter.delete("/:id/dependencies/:dependencyId", asyncHandler(async (req: AuthRequest, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) throw new AppError(404, "Task not found");
  await requireProjectAccess(req.user!.id, task.project.toString(), ["ADMIN"]);
  task.dependencies = task.dependencies.filter((dep) => dep.toString() !== req.params.dependencyId);
  await task.save();
  await ActivityLog.create({ workspace: task.workspace, project: task.project, task: task._id, actor: req.user!.id, action: "DEPENDENCY_REMOVED", metadata: { dependencyId: req.params.dependencyId } });
  res.json({ success: true, data: task });
}));

taskRouter.get("/:id/comments", asyncHandler(async (req: AuthRequest, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) throw new AppError(404, "Task not found");
  await requireProjectAccess(req.user!.id, task.project.toString(), ["VIEWER"]);
  res.json({ success: true, data: await Comment.find({ task: task._id }).populate("author", "name username").sort({ createdAt: 1 }) });
}));

taskRouter.post("/:id/comments", asyncHandler(async (req: AuthRequest, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) throw new AppError(404, "Task not found");
  await requireProjectAccess(req.user!.id, task.project.toString(), ["MEMBER"]);
  const body = z.object({ body: z.string().min(1), mentions: z.array(z.string()).default([]) }).parse(req.body);
  const comment = await Comment.create({ task: task._id, author: req.user!.id, body: body.body, mentions: body.mentions });
  await ActivityLog.create({ workspace: task.workspace, project: task.project, task: task._id, actor: req.user!.id, action: "COMMENT_ADDED" });
  if (task.assignee && task.assignee.toString() !== req.user!.id) {
    await Notification.create({ user: task.assignee, workspace: task.workspace, project: task.project, task: task._id, type: "COMMENT_ADDED", message: `New comment on: ${task.title}` });
  }
  for (const mentioned of body.mentions.filter((id) => id !== req.user!.id)) {
    await Notification.create({ user: mentioned, workspace: task.workspace, project: task.project, task: task._id, type: "COMMENT_MENTION", message: `You were mentioned on: ${task.title}` });
  }
  req.app.get("io")?.to(`project:${task.project}`).emit("comment:added", comment);
  res.status(201).json({ success: true, data: comment });
}));












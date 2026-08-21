import mongoose, { Types } from "mongoose";

export type TaskStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface ITask {
  workspace: Types.ObjectId;
  project: Types.ObjectId;
  title: string;
  description?: string;
  assignee?: Types.ObjectId;
  creator: Types.ObjectId;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: Date;
  labels: string[];
  attachments: { name: string; url: string; type?: string; size?: number }[];
  estimatedEffort: number;
  actualCompletedDate?: Date;
  dependencies: Types.ObjectId[];
  watchers: Types.ObjectId[];
  deletedAt?: Date;
}

const attachmentSchema = new mongoose.Schema(
  {
    name: String,
    url: String,
    type: String,
    size: Number
  },
  { _id: false }
);

const taskSchema = new mongoose.Schema<ITask>(
  {
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    title: { type: String, required: true, trim: true },
    description: String,
    assignee: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    creator: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"], default: "TODO" },
    priority: { type: String, enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"], default: "MEDIUM" },
    dueDate: Date,
    labels: [{ type: String, trim: true }],
    attachments: [attachmentSchema],
    estimatedEffort: { type: Number, default: 1, min: 0 },
    actualCompletedDate: Date,
    dependencies: [{ type: mongoose.Schema.Types.ObjectId, ref: "Task" }],
    watchers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    deletedAt: Date
  },
  { timestamps: true }
);

taskSchema.index({ project: 1, status: 1, priority: 1, assignee: 1, dueDate: 1 });
taskSchema.index({ title: "text", description: "text", labels: "text" });
export const Task = mongoose.model<ITask>("Task", taskSchema);


import mongoose, { Types } from "mongoose";

export type WorkspaceRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";

const memberSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: ["OWNER", "ADMIN", "MEMBER", "VIEWER"], default: "MEMBER" }
  },
  { _id: false }
);

export interface IWorkspace {
  name: string;
  description?: string;
  timezone?: string;
  owner: Types.ObjectId;
  members: { user: Types.ObjectId; role: WorkspaceRole }[];
  deletedAt?: Date;
}

const workspaceSchema = new mongoose.Schema<IWorkspace>(
  {
    name: { type: String, required: true, trim: true },
    description: String,
    timezone: { type: String, default: "Asia/Calcutta" },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    members: [memberSchema],
    deletedAt: Date
  },
  { timestamps: true }
);

workspaceSchema.index({ owner: 1, name: 1 });
workspaceSchema.index({ "members.user": 1 });
export const Workspace = mongoose.model<IWorkspace>("Workspace", workspaceSchema);


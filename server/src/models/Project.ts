import mongoose, { Types } from "mongoose";

export interface IProject {
  workspace: Types.ObjectId;
  owner: Types.ObjectId;
  name: string;
  description?: string;
  status: "PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED";
  startDate?: Date;
  deadline?: Date;
  members: Types.ObjectId[];
  archivedAt?: Date;
  deletedAt?: Date;
}

const projectSchema = new mongoose.Schema<IProject>(
  {
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true },
    description: String,
    status: { type: String, enum: ["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED"], default: "ACTIVE" },
    startDate: Date,
    deadline: Date,
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    archivedAt: Date,
    deletedAt: Date
  },
  { timestamps: true }
);

projectSchema.index({ workspace: 1, name: "text", description: "text" });
export const Project = mongoose.model<IProject>("Project", projectSchema);


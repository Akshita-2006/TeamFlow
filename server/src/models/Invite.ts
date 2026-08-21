import mongoose, { Types } from "mongoose";

export interface IInvite {
  workspace: Types.ObjectId;
  project?: Types.ObjectId;
  email: string;
  role: "ADMIN" | "MEMBER" | "VIEWER";
  invitedBy: Types.ObjectId;
  tokenHash: string;
  status: "PENDING" | "ACCEPTED" | "REVOKED";
  expiresAt: Date;
  acceptedAt?: Date;
}

const inviteSchema = new mongoose.Schema<IInvite>(
  {
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
    email: { type: String, required: true, lowercase: true, trim: true },
    role: { type: String, enum: ["ADMIN", "MEMBER", "VIEWER"], default: "MEMBER" },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    tokenHash: { type: String, required: true, unique: true },
    status: { type: String, enum: ["PENDING", "ACCEPTED", "REVOKED"], default: "PENDING" },
    expiresAt: { type: Date, required: true },
    acceptedAt: Date
  },
  { timestamps: true }
);

inviteSchema.index({ workspace: 1, email: 1, status: 1 });
inviteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const Invite = mongoose.model<IInvite>("Invite", inviteSchema);

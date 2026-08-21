import mongoose, { Types } from "mongoose";

export type SubmissionStatus = "PENDING_REVIEW" | "APPROVED" | "CHANGES_REQUESTED" | "REJECTED";

export interface ISubmission {
  workspace: Types.ObjectId;
  project: Types.ObjectId;
  task: Types.ObjectId;
  submitter: Types.ObjectId;
  reviewer?: Types.ObjectId;
  version: number;
  status: SubmissionStatus;
  note?: string;
  reviewNote?: string;
  files: { name: string; url: string; type?: string; size?: number }[];
  reviewedAt?: Date;
}

const submittedFileSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    url: { type: String, required: true },
    type: String,
    size: Number
  },
  { _id: false }
);

const submissionSchema = new mongoose.Schema<ISubmission>(
  {
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    task: { type: mongoose.Schema.Types.ObjectId, ref: "Task", required: true },
    submitter: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    reviewer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    version: { type: Number, required: true, min: 1 },
    status: { type: String, enum: ["PENDING_REVIEW", "APPROVED", "CHANGES_REQUESTED", "REJECTED"], default: "PENDING_REVIEW" },
    note: String,
    reviewNote: String,
    files: [submittedFileSchema],
    reviewedAt: Date
  },
  { timestamps: true }
);

submissionSchema.index({ project: 1, status: 1, updatedAt: -1 });
submissionSchema.index({ task: 1, version: -1 });

export const Submission = mongoose.model<ISubmission>("Submission", submissionSchema);

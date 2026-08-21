import mongoose, { Types } from "mongoose";

export interface IComment {
  task: Types.ObjectId;
  author: Types.ObjectId;
  body: string;
  mentions: Types.ObjectId[];
  editedAt?: Date;
}

const commentSchema = new mongoose.Schema<IComment>(
  {
    task: { type: mongoose.Schema.Types.ObjectId, ref: "Task", required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    body: { type: String, required: true, trim: true },
    mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    editedAt: Date
  },
  { timestamps: true }
);

export const Comment = mongoose.model<IComment>("Comment", commentSchema);


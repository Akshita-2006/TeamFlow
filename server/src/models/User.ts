import mongoose from "mongoose";

export interface IUser {
  name: string;
  username?: string;
  email: string;
  passwordHash: string;
  avatarUrl?: string;
}

const userSchema = new mongoose.Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    username: { type: String, unique: true, sparse: true, lowercase: true, trim: true, match: /^[a-z0-9_]{3,24}$/ },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    avatarUrl: String
  },
  { timestamps: true }
);
export const User = mongoose.model<IUser>("User", userSchema);

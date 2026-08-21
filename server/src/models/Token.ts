import crypto from "crypto";
import mongoose, { Types } from "mongoose";

export type TokenPurpose = "PASSWORD_RESET" | "REFRESH_TOKEN";

export interface IToken {
  user?: Types.ObjectId;
  email?: string;
  purpose: TokenPurpose;
  tokenHash: string;
  expiresAt: Date;
  usedAt?: Date;
}

const tokenSchema = new mongoose.Schema<IToken>(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    email: { type: String, lowercase: true, trim: true },
    purpose: { type: String, enum: ["PASSWORD_RESET", "REFRESH_TOKEN"], required: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    usedAt: Date
  },
  { timestamps: true }
);

tokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export function createPlainToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export const Token = mongoose.model<IToken>("Token", tokenSchema);

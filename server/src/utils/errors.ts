import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

export class AppError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req, res, next).catch(next);

function friendlyValidationMessage(err: ZodError) {
  const first = err.issues[0];
  if (!first) return "Invalid input";
  const field = first.path.join(".") || "Field";
  if (first.code === "too_small" && field.toLowerCase().includes("password")) return "Password must be at least 8 characters.";
  if (first.code === "invalid_string" && first.validation === "email") return "Please enter a valid email address.";
  return `${field}: ${first.message}`;
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({ success: false, error: friendlyValidationMessage(err) });
  }
  const status = err instanceof AppError ? err.status : 500;
  res.status(status).json({ success: false, error: status === 500 ? "Internal server error" : err.message });
}

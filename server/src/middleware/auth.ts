import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { AppError } from "../utils/errors.js";

export interface AuthRequest extends Request {
  user?: { id: string };
}

export function signToken(userId: string) {
  return jwt.sign({ sub: userId }, config.jwtSecret, { expiresIn: config.jwtExpiresIn } as jwt.SignOptions);
}

export function requireAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) throw new AppError(401, "Authentication required");
  try {
    const payload = jwt.verify(header.slice(7), config.jwtSecret) as { sub: string };
    req.user = { id: payload.sub };
    next();
  } catch {
    throw new AppError(401, "Session expired or invalid");
  }
}

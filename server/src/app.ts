import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { config } from "./config.js";
import { authRouter } from "./routes/auth.js";
import { workspaceRouter } from "./routes/workspaces.js";
import { projectRouter } from "./routes/projects.js";
import { taskRouter } from "./routes/tasks.js";
import { notificationRouter } from "./routes/notifications.js";
import { uploadRouter } from "./routes/uploads.js";
import { errorHandler } from "./utils/errors.js";

export function createApp() {
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: config.clientUrl, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use("/api/auth", rateLimit({ windowMs: 15 * 60 * 1000, limit: 50 }), authRouter);
  app.use("/api/workspaces", workspaceRouter);
  app.use("/api/projects", projectRouter);
  app.use("/api/tasks", taskRouter);
  app.use("/api/notifications", notificationRouter);
  app.use("/api/uploads", uploadRouter);
  app.get("/api/health", (_req, res) => res.json({ success: true, service: "teamflow-api" }));
  app.use(errorHandler);
  return app;
}

import { Router } from "express";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import { Notification } from "../models/Notification.js";
import { asyncHandler } from "../utils/errors.js";

export const notificationRouter = Router();
notificationRouter.use(requireAuth);


notificationRouter.get("/unread-count", asyncHandler(async (req: AuthRequest, res) => {
  const count = await Notification.countDocuments({ user: req.user!.id, readAt: null });
  res.json({ success: true, data: { count } });
}));
notificationRouter.get("/", asyncHandler(async (req: AuthRequest, res) => {
  res.json({ success: true, data: await Notification.find({ user: req.user!.id }).sort({ createdAt: -1 }).limit(50) });
}));

notificationRouter.patch("/:id/read", asyncHandler(async (req: AuthRequest, res) => {
  const notification = await Notification.findOneAndUpdate({ _id: req.params.id, user: req.user!.id }, { readAt: new Date() }, { new: true });
  res.json({ success: true, data: notification });
}));


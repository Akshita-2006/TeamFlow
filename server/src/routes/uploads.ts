import { Router } from "express";
import { z } from "zod";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import { requireProjectAccess } from "../middleware/rbac.js";
import { config } from "../config.js";
import { createPresignedUpload } from "../services/s3.js";
import { createSupabaseSignedUpload } from "../services/supabaseStorage.js";
import { asyncHandler } from "../utils/errors.js";

export const uploadRouter = Router();
uploadRouter.use(requireAuth);

uploadRouter.post("/presign", asyncHandler(async (req: AuthRequest, res) => {
  const body = z.object({
    projectId: z.string().min(1),
    fileName: z.string().min(1),
    contentType: z.string().default("application/octet-stream")
  }).parse(req.body);
  const { project } = await requireProjectAccess(req.user!.id, body.projectId, ["MEMBER"]);
  const input = {
    userId: req.user!.id,
    workspaceId: project.workspace.toString(),
    projectId: project._id.toString(),
    fileName: body.fileName,
    contentType: body.contentType
  };
  const data = config.storageProvider === "aws" ? createPresignedUpload(input) : await createSupabaseSignedUpload(input);
  res.json({ success: true, data });
}));

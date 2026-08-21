import { config } from "../config.js";
import { AppError } from "../utils/errors.js";

function safeFileName(name: string) {
  const clean = name.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
  return clean || "upload";
}

export function isSupabaseConfigured() {
  return Boolean(config.supabaseUrl && config.supabaseServiceRoleKey && config.supabaseStorageBucket);
}

export async function createSupabaseSignedUpload(input: { userId: string; workspaceId: string; projectId: string; fileName: string; contentType: string }) {
  if (!isSupabaseConfigured()) {
    throw new AppError(400, "Supabase Storage is not configured yet. Add SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and SUPABASE_STORAGE_BUCKET in .env.");
  }
  const baseUrl = config.supabaseUrl!.replace(/\/$/, "");
  const bucket = config.supabaseStorageBucket!;
  const path = `teamflow/${input.workspaceId}/${input.projectId}/${input.userId}/${Date.now()}-${safeFileName(input.fileName)}`;
  const signUrl = `${baseUrl}/storage/v1/object/upload/sign/${encodeURIComponent(bucket)}/${path.split("/").map(encodeURIComponent).join("/")}`;
  const response = await fetch(signUrl, {
    method: "POST",
    headers: {
      apikey: config.supabaseServiceRoleKey!,
      Authorization: `Bearer ${config.supabaseServiceRoleKey!}`,
      "Content-Type": "application/json",
      "x-upsert": "false"
    },
    body: JSON.stringify({})
  });
  const payload: any = await response.json().catch(() => ({}));
  if (!response.ok) throw new AppError(400, payload.message ?? payload.error ?? "Could not create Supabase upload URL.");
  const uploadUrl = payload.signedUrl ?? payload.signedURL ?? (payload.url ? `${baseUrl}/storage/v1${payload.url}` : "");
  const token = payload.token ?? new URL(uploadUrl).searchParams.get("token") ?? "";
  if (!uploadUrl || !token) throw new AppError(400, "Supabase did not return a signed upload token.");
  return {
    provider: "supabase",
    uploadUrl,
    token,
    path,
    file: {
      name: input.fileName,
      url: `${baseUrl}/storage/v1/object/public/${bucket}/${path}`,
      key: path,
      type: input.contentType
    }
  };
}

export async function createSupabaseSignedDownload(path: string, expiresIn = 300) {
  if (!isSupabaseConfigured()) {
    throw new AppError(400, "Supabase Storage is not configured yet.");
  }
  const baseUrl = config.supabaseUrl!.replace(/\/$/, "");
  const bucket = config.supabaseStorageBucket!;
  const signUrl = `${baseUrl}/storage/v1/object/sign/${encodeURIComponent(bucket)}/${path.split("/").map(encodeURIComponent).join("/")}`;
  const response = await fetch(signUrl, {
    method: "POST",
    headers: {
      apikey: config.supabaseServiceRoleKey!,
      Authorization: `Bearer ${config.supabaseServiceRoleKey!}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ expiresIn })
  });
  const payload: any = await response.json().catch(() => ({}));
  if (!response.ok) throw new AppError(400, payload.message ?? payload.error ?? "Could not create file access link.");
  const signedUrl = payload.signedUrl ?? payload.signedURL ?? (payload.signedURL ? `${baseUrl}/storage/v1${payload.signedURL}` : "");
  if (!signedUrl) throw new AppError(400, "Supabase did not return a file access link.");
  return signedUrl.startsWith("http") ? signedUrl : `${baseUrl}/storage/v1${signedUrl}`;
}

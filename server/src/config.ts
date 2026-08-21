import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(dirname, "../../.env") });
dotenv.config();

function parseTrustProxy(value: string | undefined) {
  if (!value) return process.env.RENDER ? 1 : false;
  if (value === "true") return true;
  if (value === "false") return false;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : value;
}

function cleanEnv(value: string | undefined) {
  const cleaned = value?.trim();
  return cleaned || undefined;
}

const smtpHost = cleanEnv(process.env.SMTP_HOST);
const smtpUser = cleanEnv(process.env.SMTP_USER);
const smtpPass = smtpHost === "smtp.gmail.com"
  ? cleanEnv(process.env.SMTP_PASS)?.replace(/\s+/g, "")
  : cleanEnv(process.env.SMTP_PASS);
const mailFrom = cleanEnv(process.env.MAIL_FROM) ?? (smtpUser ? `TeamFlow <${smtpUser}>` : "TeamFlow <noreply@teamflow.local>");

export const config = {
  mongoUri: process.env.MONGO_URI ?? "mongodb://127.0.0.1:27017/teamflow",
  jwtSecret: process.env.JWT_SECRET ?? "dev-secret-change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  clientUrl: process.env.CLIENT_URL ?? "http://localhost:5173",
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
  port: Number(process.env.PORT ?? 5000),
  smtpHost,
  smtpPort: Number(process.env.SMTP_PORT ?? 587),
  smtpUser,
  smtpPass,
  mailFrom,
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  supabaseStorageBucket: process.env.SUPABASE_STORAGE_BUCKET
};


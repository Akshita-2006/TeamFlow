import crypto from "node:crypto";
import { config } from "../config.js";
import { AppError } from "../utils/errors.js";

const service = "s3";
const algorithm = "AWS4-HMAC-SHA256";

function hmac(key: Buffer | string, value: string) {
  return crypto.createHmac("sha256", key).update(value).digest();
}

function hash(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function yyyymmdd(date: Date) {
  return date.toISOString().slice(0, 10).replaceAll("-", "");
}

function amzDate(date: Date) {
  return `${yyyymmdd(date)}T${date.toISOString().slice(11, 19).replaceAll(":", "")}Z`;
}

function signingKey(secret: string, date: string, region: string) {
  const dateKey = hmac(`AWS4${secret}`, date);
  const regionKey = hmac(dateKey, region);
  const serviceKey = hmac(regionKey, service);
  return hmac(serviceKey, "aws4_request");
}

function safeFileName(name: string) {
  const clean = name.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
  return clean || "upload";
}

export function assertS3Configured() {
  if (!config.awsRegion || !config.awsAccessKeyId || !config.awsSecretAccessKey || !config.awsS3Bucket) {
    throw new AppError(400, "AWS S3 is not configured yet. Add AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY and AWS_S3_BUCKET in .env.");
  }
}

export function createPresignedUpload(input: { userId: string; workspaceId: string; projectId: string; fileName: string; contentType: string }) {
  assertS3Configured();
  const region = config.awsRegion!;
  const bucket = config.awsS3Bucket!;
  const now = new Date();
  const date = yyyymmdd(now);
  const timestamp = amzDate(now);
  const expires = 600;
  const key = `teamflow/${input.workspaceId}/${input.projectId}/${input.userId}/${Date.now()}-${safeFileName(input.fileName)}`;
  const credential = `${config.awsAccessKeyId}/${date}/${region}/${service}/aws4_request`;
  const host = `${bucket}.s3.${region}.amazonaws.com`;
  const canonicalUri = `/${key.split("/").map(encodeURIComponent).join("/")}`;
  const signedHeaders = "host";
  const query = new URLSearchParams({
    "X-Amz-Algorithm": algorithm,
    "X-Amz-Credential": credential,
    "X-Amz-Date": timestamp,
    "X-Amz-Expires": String(expires),
    "X-Amz-SignedHeaders": signedHeaders
  });
  const canonicalQuery = [...query.entries()].map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).sort().join("&");
  const canonicalRequest = ["PUT", canonicalUri, canonicalQuery, `host:${host}\n`, signedHeaders, "UNSIGNED-PAYLOAD"].join("\n");
  const stringToSign = [algorithm, timestamp, `${date}/${region}/${service}/aws4_request`, hash(canonicalRequest)].join("\n");
  const signature = crypto.createHmac("sha256", signingKey(config.awsSecretAccessKey!, date, region)).update(stringToSign).digest("hex");
  query.set("X-Amz-Signature", signature);
  const uploadUrl = `https://${host}${canonicalUri}?${query.toString()}`;
  const publicBase = config.awsS3PublicBaseUrl?.replace(/\/$/, "") ?? `https://${host}`;
  return {
    uploadUrl,
    file: {
      name: input.fileName,
      url: `${publicBase}/${key}`,
      key,
      type: input.contentType
    }
  };
}

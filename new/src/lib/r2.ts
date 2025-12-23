import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const R2_ENDPOINT = process.env.R2_ENDPOINT!;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME!;
const R2_PUBLIC_BASE_URL = process.env.R2_PUBLIC_BASE_URL;

const s3Client = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

export async function uploadToR2(options: {
  key: string;
  body: Buffer | Uint8Array | string;
  contentType: string;
  cacheControl?: string;
}): Promise<{ key: string; url: string | null }> {
  const { key, body, contentType, cacheControl } = options;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: cacheControl || "public, max-age=31536000",
    })
  );

  const url = R2_PUBLIC_BASE_URL ? `${R2_PUBLIC_BASE_URL}/${key}` : null;
  return { key, url };
}

export async function fetchFromR2(key: string): Promise<{ buffer: Buffer; contentType: string }> {
  const response = await s3Client.send(
    new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    })
  );

  if (!response.Body) {
    throw new Error(`File not found: ${key}`);
  }

  const bytes = await response.Body.transformToByteArray();
  return {
    buffer: Buffer.from(bytes),
    contentType: response.ContentType || "application/octet-stream",
  };
}

export async function deleteFromR2(key: string): Promise<void> {
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    })
  );
}

export async function getDownloadPresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
  return getSignedUrl(
    s3Client,
    new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    }),
    { expiresIn }
  );
}

export function getPublicUrl(key: string): string | null {
  if (!R2_PUBLIC_BASE_URL) return null;
  return `${R2_PUBLIC_BASE_URL}/${key}`;
}

export const r2Keys = {
  photo: (eventId: string, sessionId: string, filename: string) =>
    `photos/${eventId}/${sessionId}/${filename}`,
  composite: (eventId: string, compositeId: string) =>
    `composites/${eventId}/${compositeId}.png`,
  background: (eventId: string, backgroundId: string) =>
    `backgrounds/${eventId}/${backgroundId}`,
  aiBackground: (eventId: string, backgroundId: string) =>
    `ai-backgrounds/${eventId}/${backgroundId}.png`,
  production: (productionId: string, filename: string) =>
    `productions/${productionId}/${filename}`,
};

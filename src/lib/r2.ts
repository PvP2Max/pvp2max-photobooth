import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Readable } from "node:stream";

const R2_ENDPOINT = process.env.R2_ENDPOINT;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_BASE_URL = process.env.R2_PUBLIC_BASE_URL?.replace(/\/$/, "");
const R2_REGION = process.env.R2_REGION || "auto";

function getClient() {
  if (!R2_ENDPOINT || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
    throw new Error("R2 configuration is incomplete. Set R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME.");
  }
  return new S3Client({
    region: R2_REGION,
    endpoint: R2_ENDPOINT,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
    forcePathStyle: true,
  });
}

function streamToBuffer(stream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

export async function uploadToR2({
  key,
  body,
  contentType,
  cacheControl,
}: {
  key: string;
  body: Buffer;
  contentType: string;
  cacheControl?: string;
}) {
  const client = getClient();
  await client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: cacheControl,
    }),
  );
  const url = R2_PUBLIC_BASE_URL ? `${R2_PUBLIC_BASE_URL}/${key}` : null;
  return { key, url };
}

export async function fetchFromR2(key: string) {
  const client = getClient();
  const res = await client.send(
    new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    }),
  );
  const buffer = await streamToBuffer(res.Body as Readable);
  const contentType = res.ContentType || "application/octet-stream";
  return { buffer, contentType };
}

export async function deleteFromR2(keys: string[]) {
  if (keys.length === 0) return;
  const client = getClient();
  for (const key of keys) {
    try {
      await client.send(
        new DeleteObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: key,
        }),
      );
    } catch (error) {
      console.error("Failed to delete R2 object", { key, error });
    }
  }
}

export async function presignR2(key: string, expiresInSeconds = 3600) {
  const client = getClient();
  const command = new GetObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key });
  return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}

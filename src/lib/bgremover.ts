import { createHmac, randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_BGREMOVER_BASE = "https://modnet.boothos.com";
const DEFAULT_SOURCE_BASE =
  process.env.BGREMOVER_SOURCE_BASE ||
  process.env.APP_BASE_URL ||
  "http://localhost:3000";
const TEMP_UPLOAD_DIR = path.join(process.cwd(), "storage", "tmp", "bgremover");

const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/avif": ".avif",
};

function resolveApiBase() {
  return process.env.BGREMOVER_API_BASE?.replace(/\/$/, "") ?? DEFAULT_BGREMOVER_BASE;
}

function resolveSourceBase() {
  return DEFAULT_SOURCE_BASE.replace(/\/$/, "");
}

function resolveServiceToken() {
  return process.env.BGREMOVER_SERVICE_TOKEN ?? process.env.SERVICE_API_TOKEN;
}

function extensionForFile(file: File) {
  const contentType = (file as Blob).type || "";
  if (EXTENSION_BY_TYPE[contentType]) {
    return EXTENSION_BY_TYPE[contentType];
  }
  const nameExt = file.name ? path.extname(file.name) : "";
  if (nameExt) return nameExt;
  return ".png";
}

function signUpload(name: string, secret: string) {
  return createHmac("sha256", secret).update(name).digest("hex");
}

async function stageUploadForService(file: File, secret: string) {
  const ext = extensionForFile(file);
  const uploadName = `${randomUUID()}${ext}`;
  const uploadPath = path.join(TEMP_UPLOAD_DIR, uploadName);
  const metaPath = `${uploadPath}.json`;

  await mkdir(TEMP_UPLOAD_DIR, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  const contentType = (file as Blob).type || "application/octet-stream";
  await writeFile(uploadPath, buffer);
  await writeFile(metaPath, JSON.stringify({ contentType }), "utf8");

  const token = signUpload(uploadName, secret);
  const imageUrl = `${resolveSourceBase()}/api/bgremover/source/${encodeURIComponent(uploadName)}?token=${token}`;
  const cleanup = async () => {
    await rm(uploadPath, { force: true });
    await rm(metaPath, { force: true });
  };

  return { imageUrl, cleanup };
}

export type RemoveBackgroundResult = {
  outputUrl: string;
  contentType: string;
  mode?: string;
};

export async function removeBackground(file: File): Promise<RemoveBackgroundResult> {
  const apiBase = resolveApiBase();
  const token = resolveServiceToken();

  if (!token) {
    throw new Error("Background remover service token is not configured.");
  }

  const { imageUrl, cleanup } = await stageUploadForService(file, token);

  try {
    const response = await fetch(`${apiBase}/remove-bg`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ imageUrl }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(
        `Background removal failed (${response.status}): ${detail.slice(0, 500)}`,
      );
    }

    const payload = (await response.json()) as {
      outputUrl?: string;
      mode?: string;
    };

    if (!payload.outputUrl) {
      throw new Error("Background remover did not return an output URL.");
    }

    return {
      outputUrl: payload.outputUrl,
      contentType: "image/png",
      mode: payload.mode,
    };
  } finally {
    await cleanup().catch(() => {});
  }
}

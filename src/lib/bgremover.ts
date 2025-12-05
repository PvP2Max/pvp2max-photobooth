import { Buffer } from "node:buffer";

const DEFAULT_BGREMOVER_BASE = "https://bgremover.pvp2max.com";

function resolveApiBase() {
  return process.env.BGREMOVER_API_BASE?.replace(/\/$/, "") ?? DEFAULT_BGREMOVER_BASE;
}

function resolveServiceToken() {
  return process.env.BGREMOVER_SERVICE_TOKEN ?? process.env.SERVICE_API_TOKEN;
}

export async function removeBackground(file: File) {
  const apiBase = resolveApiBase();
  const token = resolveServiceToken();

  if (!token) {
    throw new Error("Background remover service token is not configured.");
  }

  const endpoint = `${apiBase}/api/remove-background`;
  const form = new FormData();
  form.append("file", file, file.name || "upload.png");

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `Background removal failed (${response.status}): ${detail.slice(0, 500)}`,
    );
  }

  const payload = (await response.json()) as {
    imageBase64: string;
    contentType?: string;
  };

  if (!payload.imageBase64) {
    throw new Error("Background remover did not return an image payload.");
  }

  return {
    buffer: Buffer.from(payload.imageBase64, "base64"),
    contentType: payload.contentType || "image/png",
  };
}

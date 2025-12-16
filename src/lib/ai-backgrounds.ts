import { randomUUID } from "node:crypto";
import OpenAI from "openai";
import { uploadToR2 } from "./r2";
import { TenantScope } from "./tenants";

const R2_PREFIX = (process.env.R2_KEY_PREFIX || "boothos").replace(/\/+$/, "");
const R2_PUBLIC_BASE_URL = process.env.R2_PUBLIC_BASE_URL?.replace(/\/$/, "");

type GenerationKind = "background" | "frame";

function buildPrompt(kind: GenerationKind, userPrompt: string) {
  const base =
    kind === "frame"
      ? "Design a 1:1 photobooth overlay frame. Keep the center transparent/empty for subjects. Use clean edges. If text is requested, place it along the top/bottom without covering the center. High-resolution PNG/WebP style."
      : "Design a 1:1 photobooth background. Leave a clear central band for people. No text, no watermarks, high-resolution, photo-friendly lighting.";
  return `${base} Style request: ${userPrompt}`;
}

export async function generateAiBackground(
  scope: TenantScope,
  prompt: string,
  kind: GenerationKind = "background",
) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  const fullPrompt = buildPrompt(kind, prompt);
  const client = new OpenAI({ apiKey });
  const response = await client.images.generate({
    model: "gpt-image-1",
    prompt: fullPrompt,
    size: "1024x1024",
    response_format: "b64_json",
  });
  const imageB64 = response.data?.[0]?.b64_json;
  if (!imageB64) {
    throw new Error("No image returned from OpenAI");
  }

  const buffer = Buffer.from(imageB64, "base64");
  const id = randomUUID();
  const filename = `${id}.png`;
  const r2Key = `${R2_PREFIX}/ai-backgrounds/${scope.ownerUid}/${scope.eventId}/${filename}`;

  const { url } = await uploadToR2({
    key: r2Key,
    body: buffer,
    contentType: "image/png",
    cacheControl: "public, max-age=604800",
  });

  const publicUrl = url || (R2_PUBLIC_BASE_URL ? `${R2_PUBLIC_BASE_URL}/${r2Key}` : undefined);

  return { id, filename, r2Key, url: publicUrl, contentType: "image/png", buffer };
}

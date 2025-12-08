import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";
import { TenantScope, scopedStorageRoot } from "./tenants";

export async function generateAiBackground(scope: TenantScope, prompt: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  const client = new OpenAI({ apiKey });
  const response = await client.images.generate({
    model: "gpt-image-1",
    prompt,
    size: "1024x1024",
    response_format: "b64_json",
  });
  const imageB64 = response.data?.[0]?.b64_json;
  if (!imageB64) {
    throw new Error("No image returned from OpenAI");
  }

  const buffer = Buffer.from(imageB64, "base64");
  const dir = path.join(scopedStorageRoot(scope), "ai-backgrounds");
  await mkdir(dir, { recursive: true });
  const id = randomUUID();
  const filename = `${id}.png`;
  const filePath = path.join(dir, filename);
  await writeFile(filePath, buffer);
  return { id, filename, path: filePath, contentType: "image/png" };
}

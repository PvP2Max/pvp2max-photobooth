const BGREMOVER_API_BASE = process.env.BGREMOVER_API_BASE;
const BGREMOVER_SERVICE_TOKEN = process.env.BGREMOVER_SERVICE_TOKEN;

export async function removeBackground(imageBuffer: Buffer): Promise<Buffer | null> {
  if (!BGREMOVER_API_BASE) {
    console.warn("BGREMOVER_API_BASE not configured");
    return null;
  }

  try {
    const formData = new FormData();
    formData.append("image", new Blob([new Uint8Array(imageBuffer)], { type: "image/jpeg" }));
    formData.append("quality", "high");

    const headers: Record<string, string> = {};
    if (BGREMOVER_SERVICE_TOKEN) {
      headers["Authorization"] = `Bearer ${BGREMOVER_SERVICE_TOKEN}`;
    }

    const response = await fetch(`${BGREMOVER_API_BASE}/remove-bg`, {
      method: "POST",
      headers,
      body: formData,
    });

    if (!response.ok) {
      console.error("Background removal failed:", response.status);
      return null;
    }

    const data = await response.json();

    if (data.success && data.image) {
      return Buffer.from(data.image, "base64");
    }

    return null;
  } catch (error) {
    console.error("Background removal error:", error);
    return null;
  }
}

export function isBgRemoverConfigured(): boolean {
  return !!BGREMOVER_API_BASE;
}

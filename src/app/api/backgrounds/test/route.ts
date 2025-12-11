import { promises as fs } from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { removeBackground } from "@/lib/bgremover";
import { getBusinessContext } from "@/lib/tenants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_BG = "Modern White Marble.png";
const defaultDir = path.join(process.cwd(), "public", "assets", "defaults", "backgrounds");

function parseDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:(.+);base64,(.*)$/);
  if (!match) throw new Error("Invalid image payload.");
  return {
    mime: match[1],
    buffer: Buffer.from(match[2], "base64"),
  };
}

export async function POST(request: NextRequest) {
  const session = await getBusinessContext(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    image?: string;
    background?: string;
  };
  const image = body.image?.toString();
  if (!image) {
    return NextResponse.json({ error: "Image is required." }, { status: 400 });
  }

  try {
    const { buffer, mime } = parseDataUrl(image);
    const file = new File([buffer], "capture.png", { type: mime || "image/png" });
    const cutout = await removeBackground(file);

    const bgName = body.background?.trim() || DEFAULT_BG;
    const bgPath = path.join(defaultDir, bgName);
    const fallbackPath = path.join(defaultDir, DEFAULT_BG);
    let bgBuffer: Buffer | null = null;
    try {
      bgBuffer = await fs.readFile(bgPath);
    } catch {
      bgBuffer = await fs.readFile(fallbackPath).catch(() => null);
    }

    const cutoutImage = sharp(cutout.buffer);
    const meta = await cutoutImage.metadata();
    const width = meta.width ?? 1080;
    const height = meta.height ?? 1440;

    const base = bgBuffer
      ? sharp(bgBuffer).resize(width, height, { fit: "cover" })
      : sharp({
          create: {
            width,
            height,
            channels: 4,
            background: { r: 15, g: 16, b: 20, alpha: 1 },
          },
        });

    const composited = await base
      .composite([{ input: await cutoutImage.png().toBuffer() }])
      .png()
      .toBuffer();

    return NextResponse.json({
      image: `data:image/png;base64,${composited.toString("base64")}`,
      cutout: `data:${cutout.contentType};base64,${cutout.buffer.toString("base64")}`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to process background test.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

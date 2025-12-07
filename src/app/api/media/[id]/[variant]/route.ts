import { readFile } from "node:fs/promises";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { getMediaFile } from "@/lib/storage";
import { getEventContext } from "@/lib/tenants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string; variant: string }> },
) {
  const { context: eventContext, error, status } = await getEventContext(request);
  if (!eventContext) {
    return NextResponse.json({ error: error ?? "Unauthorized" }, { status: status ?? 401 });
  }
  const { id, variant } = await context.params;
  if (!id || !variant) {
    return NextResponse.json(
      { error: "Invalid media request" },
      { status: 400 },
    );
  }

  if (variant !== "original" && variant !== "cutout" && variant !== "preview") {
    return NextResponse.json(
      { error: "Unknown media variant" },
      { status: 400 },
    );
  }

  const file = await getMediaFile(
    eventContext.scope,
    id,
    variant as "original" | "cutout" | "preview",
  );
  if (!file) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const widthParam = request.nextUrl.searchParams.get("w");
  const preview = request.nextUrl.searchParams.get("preview");
  const targetWidth = widthParam ? Math.min(parseInt(widthParam, 10) || 0, 2200) : null;

  const baseBuffer = await readFile(file.path); // Buffer
  const sharpInput = new Uint8Array(baseBuffer);
  let buffer: Buffer = baseBuffer;

  if (
    preview &&
    targetWidth &&
    targetWidth > 0 &&
    file.contentType.startsWith("image/") &&
    !file.contentType.includes("svg")
  ) {
    try {
      buffer = await sharp(sharpInput)
        .resize({ width: targetWidth, withoutEnlargement: true })
        .toBuffer();
    } catch (err) {
      console.error("Failed to resize media preview", err);
    }
  }

  return new NextResponse(Buffer.from(buffer), {
    headers: {
      "Content-Type": file.contentType,
      "Cache-Control": preview ? "public, max-age=600" : "public, max-age=300",
    },
  });
}

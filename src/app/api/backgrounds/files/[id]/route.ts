import { readFile } from "node:fs/promises";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { findBackgroundAsset } from "@/lib/backgrounds";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json(
      { error: "Background id is required." },
      { status: 400 },
    );
  }

  const asset = await findBackgroundAsset(id);
  if (!asset) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const widthParam = request.nextUrl.searchParams.get("w");
  const preview = request.nextUrl.searchParams.get("preview");
  const targetWidth = widthParam ? Math.min(parseInt(widthParam, 10) || 0, 2000) : null;

  const baseBuffer = await readFile(asset.path);
  const sharpInput = new Uint8Array(baseBuffer);
  let buffer: Uint8Array = baseBuffer;

  if (
    preview &&
    targetWidth &&
    targetWidth > 0 &&
    !asset.contentType.includes("svg")
  ) {
    try {
      buffer = await sharp(sharpInput)
        .resize({ width: targetWidth, withoutEnlargement: true })
        .toBuffer();
    } catch (err) {
      console.error("Failed to resize background preview", err);
    }
  }

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": asset.contentType,
      "Cache-Control": preview ? "public, max-age=600" : "public, max-age=300",
    },
  });
}

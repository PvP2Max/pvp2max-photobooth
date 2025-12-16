import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { getBackgroundAsset } from "@/lib/backgrounds";
import { getEventContext } from "@/lib/tenants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { context: eventContext, error, status } = await getEventContext(request);
  if (!eventContext) {
    return NextResponse.json({ error: error ?? "Unauthorized" }, { status: status ?? 401 });
  }
  if (!eventContext.roles.owner && !eventContext.roles.collaborator) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json(
      { error: "Background id is required." },
      { status: 400 },
    );
  }

  const preview = request.nextUrl.searchParams.get("preview") === "1";
  const asset = await getBackgroundAsset(eventContext.scope, id, preview);

  if (!asset) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const widthParam = request.nextUrl.searchParams.get("w");
  const targetWidth = widthParam ? Math.min(parseInt(widthParam, 10) || 0, 2000) : null;

  let buffer: Buffer = asset.buffer;

  if (targetWidth && targetWidth > 0 && !asset.contentType.includes("svg")) {
    try {
      buffer = await sharp(buffer)
        .resize({ width: targetWidth, withoutEnlargement: true })
        .toBuffer();
    } catch (err) {
      console.error("Failed to resize background", err);
    }
  }

  return new NextResponse(Buffer.from(buffer), {
    headers: {
      "Content-Type": asset.contentType,
      "Cache-Control": preview ? "public, max-age=1200, immutable" : "public, max-age=300",
    },
  });
}

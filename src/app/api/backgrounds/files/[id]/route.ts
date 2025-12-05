import { readFile } from "node:fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { findBackgroundAsset } from "@/lib/backgrounds";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
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

  const buffer = await readFile(asset.path);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": asset.contentType,
      "Cache-Control": "no-store",
    },
  });
}

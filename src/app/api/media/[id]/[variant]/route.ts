import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { getMediaFile } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _: Request,
  { params }: { params: { id: string; variant: string } },
) {
  const { id, variant } = params;
  if (!id || !variant) {
    return NextResponse.json({ error: "Invalid media request" }, { status: 400 });
  }

  if (variant !== "original" && variant !== "cutout") {
    return NextResponse.json({ error: "Unknown media variant" }, { status: 400 });
  }

  const file = await getMediaFile(id, variant as "original" | "cutout");
  if (!file) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const buffer = await readFile(file.path);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": file.contentType,
      "Cache-Control": "no-store",
    },
  });
}

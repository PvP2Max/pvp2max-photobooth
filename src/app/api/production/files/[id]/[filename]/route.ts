import { NextRequest, NextResponse } from "next/server";
import { getProductionAttachment } from "@/lib/production";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOKEN = "ArcticAuraDesigns";

function authorized(request: NextRequest) {
  const header = request.headers.get("x-admin-token");
  const query = request.nextUrl.searchParams.get("token");
  return header === TOKEN || query === TOKEN;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string; filename: string }> },
) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, filename } = await context.params;
  if (!id || !filename) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const file = await getProductionAttachment(id, filename);
  if (!file) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(file.buffer, {
    headers: {
      "Content-Type": file.contentType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(file.filename)}"`,
      "Cache-Control": "no-store",
    },
  });
}

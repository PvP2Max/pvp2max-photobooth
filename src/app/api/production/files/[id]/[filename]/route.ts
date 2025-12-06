import { NextRequest, NextResponse } from "next/server";
import { getProductionAttachment, verifyProductionToken } from "@/lib/production";
import { rateLimiter, requestKey } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOKEN = "ArcticAuraDesigns";

function isAdmin(request: NextRequest) {
  const header = request.headers.get("x-admin-token");
  const query = request.nextUrl.searchParams.get("token");
  return header === TOKEN || query === TOKEN;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string; filename: string }> },
) {
  const { id, filename } = await context.params;
  if (!id || !filename) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!isAdmin(request)) {
    const rate = rateLimiter(`dl-${requestKey(request.headers)}`, 120, 60_000);
    if (!rate.allowed) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }
    const token = request.nextUrl.searchParams.get("token");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const valid = await verifyProductionToken(id, token);
    if (!valid) {
      return NextResponse.json({ error: "Invalid or expired link" }, { status: 401 });
    }
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

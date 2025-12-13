import { NextRequest, NextResponse } from "next/server";
import { getProductionAttachment, recordDownload, verifyProductionToken } from "@/lib/production";
import { rateLimiter, requestKey } from "@/lib/rate-limit";
import { getEventContext, isAdminRequest } from "@/lib/tenants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string; filename: string }> },
) {
  const { id, filename } = await context.params;
  if (!id || !filename) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const admin = isAdminRequest(request);
  const event = await getEventContext(request, { allowUnauthedHeader: true });
  if (!event.context) {
    return NextResponse.json(
      { error: event.error ?? "Missing event scope for download." },
      { status: event.status ?? 401 },
    );
  }

  if (!admin) {
    const rate = rateLimiter(`dl-${requestKey(request.headers)}`, 120, 60_000);
    if (!rate.allowed) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }
    const token = request.nextUrl.searchParams.get("token");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const valid = await verifyProductionToken(event.context.scope, id, token);
    if (!valid) {
      return NextResponse.json({ error: "Invalid or expired link" }, { status: 401 });
    }
  }

  const file = await getProductionAttachment(event.context.scope, id, filename);
  if (!file) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await recordDownload(event.context.scope, id, request.headers.get("x-forwarded-for") || undefined);

  return new NextResponse(file.buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": file.contentType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(file.filename || "download")}"`,
      "Cache-Control": "no-store",
    },
  });
}

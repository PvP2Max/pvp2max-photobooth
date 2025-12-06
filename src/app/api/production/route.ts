import { NextRequest, NextResponse } from "next/server";
import { deleteAllProduction, deleteProduction, listProduction } from "@/lib/production";
import { rateLimiter, requestKey } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOKEN = "ArcticAuraDesigns";

function authorized(request: NextRequest) {
  const header = request.headers.get("x-admin-token");
  const query = request.nextUrl.searchParams.get("token");
  return header === TOKEN || query === TOKEN;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rate = rateLimiter(`admin-prod-${requestKey(request.headers)}`, 60, 60_000);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const items = await listProduction();
  const sanitized = items.map((item) => ({
    id: item.id,
    email: item.email,
    createdAt: item.createdAt,
    downloadToken: item.downloadToken,
    tokenExpiresAt: item.tokenExpiresAt,
    attachments: item.attachments.map((a) => ({
      filename: a.filename,
      contentType: a.contentType,
      size: a.size,
    })),
  }));
  return NextResponse.json({ items: sanitized });
}

export async function DELETE(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rate = rateLimiter(`admin-prod-${requestKey(request.headers)}`, 30, 60_000);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }
  const body = await request.json().catch(() => ({}));
  if (body?.all) {
    await deleteAllProduction();
    return NextResponse.json({ status: "ok", cleared: true });
  }
  if (body?.id) {
    await deleteProduction(body.id as string);
    return NextResponse.json({ status: "ok", id: body.id });
  }
  return NextResponse.json({ error: "Missing id or all flag" }, { status: 400 });
}

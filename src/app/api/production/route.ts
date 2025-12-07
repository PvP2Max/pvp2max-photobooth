import { NextRequest, NextResponse } from "next/server";
import { deleteAllProduction, deleteProduction, listProduction } from "@/lib/production";
import { rateLimiter, requestKey } from "@/lib/rate-limit";
import { getEventContext, isAdminRequest } from "@/lib/tenants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rate = rateLimiter(`admin-prod-${requestKey(request.headers)}`, 60, 60_000);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const { context, error, status } = await getEventContext(request, { allowUnauthedHeader: true });
  if (!context) {
    return NextResponse.json(
      { error: error ?? "Event scope is required for admin actions." },
      { status: status ?? 401 },
    );
  }

  const items = await listProduction(context.scope);
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
  return NextResponse.json({ items: sanitized, event: context.scope.eventSlug, business: context.scope.businessSlug });
}

export async function DELETE(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rate = rateLimiter(`admin-prod-${requestKey(request.headers)}`, 30, 60_000);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }
  const { context, error, status } = await getEventContext(request, { allowUnauthedHeader: true });
  if (!context) {
    return NextResponse.json(
      { error: error ?? "Event scope is required for admin actions." },
      { status: status ?? 401 },
    );
  }
  const body = await request.json().catch(() => ({}));
  if (body?.all) {
    await deleteAllProduction(context.scope);
    return NextResponse.json({ status: "ok", cleared: true });
  }
  if (body?.id) {
    await deleteProduction(context.scope, body.id as string);
    return NextResponse.json({ status: "ok", id: body.id });
  }
  return NextResponse.json({ error: "Missing id or all flag" }, { status: 400 });
}

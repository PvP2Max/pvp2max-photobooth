import { NextRequest, NextResponse } from "next/server";
import { listBackgrounds } from "@/lib/backgrounds";
import { findSelectionToken, markSelectionUsed } from "@/lib/selections";
import { listPhotosByEmail } from "@/lib/storage";
import { eventUsage, getEventContext } from "@/lib/tenants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  const token = (await context.params).token;
  const { context: evt, error, status } = await getEventContext(request, { allowUnauthedHeader: true });
  if (!evt) {
    return NextResponse.json({ error: error ?? "Unauthorized" }, { status: status ?? 401 });
  }
  const selection = await findSelectionToken(evt.scope, token);
  if (!selection) {
    return NextResponse.json({ error: "Invalid or expired token." }, { status: 404 });
  }
  const photos = await listPhotosByEmail(evt.scope, selection.email);
  const backgrounds = await listBackgrounds(evt.scope);
  const usage = eventUsage(evt.event);
  const allowed = evt.event.allowedSelections ?? 3;
  return NextResponse.json({
    email: selection.email,
    photos,
    backgrounds,
    allowedSelections: allowed,
    usage,
    event: { name: evt.event.name, plan: evt.event.plan, watermark: usage.watermark },
  });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  const token = (await context.params).token;
  const { context: evt, error, status } = await getEventContext(request, { allowUnauthedHeader: true });
  if (!evt) {
    return NextResponse.json({ error: error ?? "Unauthorized" }, { status: status ?? 401 });
  }
  const selection = await findSelectionToken(evt.scope, token);
  if (!selection) {
    return NextResponse.json({ error: "Invalid or expired token." }, { status: 404 });
  }
  const body = (await request.json().catch(() => ({}))) as {
    selections?: { photoId: string; backgroundId: string; transform?: { scale?: number; offsetX?: number; offsetY?: number }; matchBackground?: boolean }[];
  };
  const allowed = evt.event.allowedSelections ?? 3;
  if (!body.selections || body.selections.length === 0) {
    return NextResponse.json({ error: "No selections provided." }, { status: 400 });
  }
  if (body.selections.length > allowed) {
    return NextResponse.json({ error: `You can select up to ${allowed} photo(s).` }, { status: 400 });
  }

  // Forward to existing email pipeline for delivery and cleanup
  const origin =
    process.env.APP_BASE_URL || request.headers.get("origin") || "http://localhost:3000";
  const res = await fetch(`${origin.replace(/\/$/, "")}/api/email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-boothos-business": evt.scope.businessSlug,
      "x-boothos-event": evt.scope.eventSlug,
    },
    body: JSON.stringify({
      clientEmail: selection.email,
      selections: body.selections,
    }),
  });
  const payload = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    return NextResponse.json(payload, { status: res.status });
  }
  await markSelectionUsed(evt.scope, token);
  return NextResponse.json({ status: "ok" });
}

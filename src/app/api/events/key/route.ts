import { NextRequest, NextResponse } from "next/server";
import { getBusinessContext, rotateEventAccess, sanitizeEventWithSecret } from "@/lib/tenants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const context = await getBusinessContext(request);
  if (!context?.business) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { eventSlug?: string } | null;
  const eventSlug = body?.eventSlug?.toString().trim();
  if (!eventSlug) {
    return NextResponse.json({ error: "eventSlug is required." }, { status: 400 });
  }

  const event = context.business.events.find((e) => e.slug === eventSlug);
  if (!event) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  const rotated = await rotateEventAccess(context.business.id, event.id);

  return NextResponse.json({
    event: sanitizeEventWithSecret(rotated.event),
    accessKey: rotated.accessCode,
  });
}

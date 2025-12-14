import { NextRequest, NextResponse } from "next/server";
import {
  getBusinessContext,
  updateEventRolesByEmails,
  sanitizeEvent,
  withEventDefaults,
} from "@/lib/tenants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const context = await getBusinessContext(request);
  if (!context?.business || !context.user) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }
  // Only the business owner may assign roles.
  if (context.business.ownerUid && context.business.ownerUid !== context.user.uid) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        eventSlug?: string;
        photographerEmails?: string[];
        reviewEmails?: string[];
      }
    | null;

  const eventSlug = body?.eventSlug?.toString().trim();
  if (!eventSlug) {
    return NextResponse.json({ error: "eventSlug is required" }, { status: 400 });
  }

  try {
    const event = await updateEventRolesByEmails(context.business.slug, eventSlug, {
      photographerEmails: body?.photographerEmails ?? [],
      reviewEmails: body?.reviewEmails ?? [],
    });
    return NextResponse.json({ event: sanitizeEvent(withEventDefaults(event)) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update roles.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

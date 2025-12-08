import { NextRequest, NextResponse } from "next/server";
import {
  createEvent,
  getBusinessContext,
  sanitizeBusiness,
  sanitizeEvent,
} from "@/lib/tenants";
import type { BoothEventPlan } from "@/lib/tenants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getBusinessContext(request);
  if (!session?.business) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    business: sanitizeBusiness(session.business),
    events: session.business.events.map(sanitizeEvent),
  });
}

export async function POST(request: NextRequest) {
  const session = await getBusinessContext(request);
  if (!session?.business) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    slug?: string;
    accessCode?: string;
    status?: "draft" | "live" | "closed";
    plan?: string;
    photoCap?: number | null;
    aiCredits?: number;
    allowBackgroundRemoval?: boolean;
    allowAiBackgrounds?: boolean;
    allowAiFilters?: boolean;
    deliveryEmail?: boolean;
    deliverySms?: boolean;
    overlayTheme?: string;
    overlayLogo?: string;
    galleryPublic?: boolean;
    eventDate?: string;
    eventTime?: string;
  };
  if (!body.name) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }

  try {
    const { event, accessCode } = await createEvent(session.business.id, {
      name: body.name,
      slug: body.slug,
      accessCode: body.accessCode,
      status: body.status ?? "live",
      plan: (body.plan as BoothEventPlan | undefined) ?? "event-basic",
      photoCap: body.photoCap ?? undefined,
      aiCredits: body.aiCredits ?? undefined,
      allowBackgroundRemoval: body.allowBackgroundRemoval ?? true,
      allowAiBackgrounds: body.allowAiBackgrounds ?? false,
      allowAiFilters: body.allowAiFilters ?? false,
      deliveryEmail: body.deliveryEmail ?? true,
      deliverySms: body.deliverySms ?? false,
      overlayTheme: body.overlayTheme ?? "none",
      overlayLogo: body.overlayLogo,
      galleryPublic: body.galleryPublic ?? false,
      eventDate: body.eventDate,
      eventTime: body.eventTime,
    });
    return NextResponse.json({
      business: sanitizeBusiness(session.business),
      event: sanitizeEvent(event),
      accessCode,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to create event.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

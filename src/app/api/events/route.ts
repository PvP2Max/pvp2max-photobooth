import { NextRequest, NextResponse } from "next/server";
import {
  BoothEvent,
  BoothEventPlan,
  createEvent,
  sanitizeEvent,
  withEventDefaults,
  getBusinessContext,
} from "@/lib/tenants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parsePlan(input: unknown): BoothEventPlan {
  const value = (input as string | undefined)?.toString() ?? "basic";
  const allowed: BoothEventPlan[] = [
    "free",
    "basic",
    "pro",
    "unlimited",
    "photographer-event",
    "photographer-subscription",
  ];
  // Legacy plan name mapping
  const legacyMap: Record<string, BoothEventPlan> = {
    "event-basic": "basic",
    "event-unlimited": "pro",
    "event-ai": "unlimited",
    "photographer-single": "photographer-event",
    "photographer-monthly": "photographer-subscription",
  };
  const mapped = legacyMap[value] || value;
  return allowed.includes(mapped as BoothEventPlan) ? (mapped as BoothEventPlan) : "basic";
}

export async function GET(request: NextRequest) {
  try {
    const context = await getBusinessContext(request);
    if (!context?.business || !context.user) {
      return NextResponse.json({ error: "Not authorized" }, { status: 401 });
    }
    const events = context.business.events.map((e: BoothEvent) => sanitizeEvent(withEventDefaults(e)));
    return NextResponse.json({
      events,
      business: {
        id: context.business.id,
        name: context.business.name,
        slug: context.business.slug,
        subscriptionPlan: context.business.subscriptionPlan,
        subscriptionStatus: context.business.subscriptionStatus,
      },
      owner: {
        id: context.user.uid,
        email: context.user.email,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load events.";
    console.error("List events failed:", message, error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getBusinessContext(request);
    if (!context?.business || !context.user) {
      return NextResponse.json({ error: "Not authorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as
      | {
          name?: string;
          plan?: BoothEventPlan;
          mode?: "self-serve" | "photographer";
          allowedSelections?: number;
          allowBackgroundRemoval?: boolean;
          allowAiBackgrounds?: boolean;
          allowAiFilters?: boolean;
          deliverySms?: boolean;
          galleryPublic?: boolean;
          overlayTheme?: string;
          eventDate?: string;
          eventTime?: string;
        }
      | null;

    const name = body?.name?.toString().trim();
    if (!name) {
      return NextResponse.json({ error: "Event name is required." }, { status: 400 });
    }

    const { event } = await createEvent(context.user.uid, {
      name,
      mode: (body?.mode as "self-serve" | "photographer") ?? "self-serve",
      plan: parsePlan(body?.plan),
      allowBackgroundRemoval: body?.allowBackgroundRemoval ?? true,
      allowAiBackgrounds: body?.allowAiBackgrounds ?? false,
      allowAiFilters: body?.allowAiFilters ?? false,
      deliverySms: body?.deliverySms ?? false,
      galleryPublic: body?.galleryPublic ?? false,
      overlayTheme: body?.overlayTheme ?? "default",
      eventDate: body?.eventDate,
      eventTime: body?.eventTime,
      allowedSelections:
        typeof body?.allowedSelections === "number" ? body.allowedSelections : undefined,
      collaboratorEmails: [],
    });

    return NextResponse.json({
      event: sanitizeEvent(withEventDefaults(event)),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create event.";
    console.error("Create event failed:", message, error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

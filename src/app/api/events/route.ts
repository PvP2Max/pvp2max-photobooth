import { NextRequest, NextResponse } from "next/server";
import {
  BoothEventPlan,
  createEvent,
  sanitizeEvent,
  withEventDefaults,
  getBusinessContext,
} from "@/lib/tenants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parsePlan(input: unknown): BoothEventPlan {
  const value = (input as string | undefined)?.toString() ?? "event-basic";
  const allowed: BoothEventPlan[] = [
    "free",
    "event-basic",
    "event-unlimited",
    "event-ai",
    "photographer-single",
    "photographer-monthly",
  ];
  return allowed.includes(value as BoothEventPlan) ? (value as BoothEventPlan) : "event-basic";
}

export async function GET(request: NextRequest) {
  const context = await getBusinessContext(request);
  if (!context?.business || !context.user) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }
  const events = context.business.events.map((e) => sanitizeEvent(withEventDefaults(e)));
  return NextResponse.json({
    events,
    owner: {
      id: context.user.uid,
      email: context.user.email,
    },
  });
}

export async function POST(request: NextRequest) {
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

  try {
    const { event } = await createEvent(context.business.id, context.user.uid, {
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
      photographerEmails: [],
      reviewEmails: [],
    });

    return NextResponse.json({
      event: sanitizeEvent(withEventDefaults(event)),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create event.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

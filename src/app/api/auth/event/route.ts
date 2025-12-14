import { NextRequest, NextResponse } from "next/server";
import { listUserEvents, sanitizeEvent, withEventDefaults } from "@/lib/tenants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const business = request.nextUrl.searchParams.get("business") || "";
  const eventSlug = request.nextUrl.searchParams.get("event") || request.nextUrl.searchParams.get("slug") || "";

  if (!business || !eventSlug) {
    return NextResponse.json({ error: "Missing business or event" }, { status: 400 });
  }

  try {
    const events = await listUserEvents(business);
    const event = events.find((e) => e.slug === eventSlug);
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    return NextResponse.json({
      business: {
        id: business,
        slug: business,
        name: "My BoothOS",
      },
      event: sanitizeEvent(withEventDefaults(event)),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load event";
    console.error("Auth event load failed:", message, error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import {
  createEvent,
  getBusinessContext,
  sanitizeBusiness,
  sanitizeEvent,
} from "@/lib/tenants";

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

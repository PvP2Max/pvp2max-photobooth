import { NextRequest, NextResponse } from "next/server";
import {
  createBusiness,
  createEvent,
  listBusinesses,
  sanitizeBusiness,
  sanitizeEvent,
} from "@/lib/tenants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function adminAuthorized(request: NextRequest) {
  const token = request.headers.get("x-admin-token");
  const query = request.nextUrl.searchParams.get("token");
  const envToken = process.env.BOOTHOS_ADMIN_TOKEN ?? "ArcticAuraDesigns";
  return token === envToken || query === envToken;
}

export async function GET(request: NextRequest) {
  if (!adminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const businesses = await listBusinesses();
  return NextResponse.json({
    businesses: businesses.map((biz) => ({
      ...sanitizeBusiness(biz),
      events: biz.events.map((event) => sanitizeEvent(event)),
    })),
  });
}

export async function POST(request: NextRequest) {
  if (!adminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as
    | {
        type?: "business" | "event";
        name?: string;
        slug?: string;
        apiKey?: string;
        businessId?: string;
        businessSlug?: string;
        accessCode?: string;
      }
    | null;

  if (!body?.type || !body.name) {
    return NextResponse.json(
      { error: "type and name are required." },
      { status: 400 },
    );
  }

  if (body.type === "business") {
    try {
      const created = await createBusiness({
        name: body.name,
        slug: body.slug,
        apiKey: body.apiKey,
      });
      return NextResponse.json({
        business: sanitizeBusiness(created.business),
        apiKey: created.apiKey,
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Unknown error";
      return NextResponse.json(
        { error: "Failed to create business", detail },
        { status: 400 },
      );
    }
  }

  if (body.type === "event") {
    const businesses = await listBusinesses();
    const business =
      businesses.find((b) => b.id === body.businessId) ||
      businesses.find((b) => b.slug === body.businessSlug);
    if (!business) {
      return NextResponse.json(
        { error: "businessId or businessSlug must match an existing business." },
        { status: 400 },
      );
    }
    try {
      const created = await createEvent(business.id, {
        name: body.name,
        slug: body.slug,
        accessCode: body.accessCode,
      });
      return NextResponse.json({
        business: sanitizeBusiness(business),
        event: sanitizeEvent(created.event),
        accessCode: created.accessCode,
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Unknown error";
      return NextResponse.json(
        { error: "Failed to create event", detail },
        { status: 400 },
      );
    }
  }

  return NextResponse.json({ error: "Unsupported type." }, { status: 400 });
}

import { NextRequest, NextResponse } from "next/server";
import { createUser, createBusiness, createEvent, sanitizeBusiness, sanitizeEvent } from "@/lib/tenants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    email?: string;
    password?: string;
    businessName?: string;
    businessSlug?: string;
  } | null;

  const email = body?.email?.toString().trim().toLowerCase();
  const password = body?.password?.toString();
  const businessName = body?.businessName?.toString().trim();
  const businessSlug = body?.businessSlug?.toString().trim();

  if (!email || !password || !businessName) {
    return NextResponse.json(
      { error: "email, password, and businessName are required." },
      { status: 400 },
    );
  }

  try {
    const { business } = await createBusiness({
      name: businessName,
      slug: businessSlug,
    });
    const user = await createUser({ email, password, businessId: business.id });
    const { event } = await createEvent(business.id, {
      name: "My first event",
      slug: "first-event",
      plan: "event-basic",
      status: "live",
    });

    return NextResponse.json({
      business: sanitizeBusiness(business),
      events: [sanitizeEvent(event)],
      user: { id: user.id, email: user.email },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to create account.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

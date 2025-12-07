import { NextRequest, NextResponse } from "next/server";
import {
  businessSessionCookieName,
  createBusinessSessionToken,
  getBusinessContext,
  sanitizeBusiness,
  sanitizeEvent,
  verifyBusinessAccess,
} from "@/lib/tenants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cookieOptions(expiresAt?: string) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt ? new Date(expiresAt) : undefined,
  };
}

export async function GET(request: NextRequest) {
  const session = await getBusinessContext(request);
  if (!session?.business) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  return NextResponse.json({
    business: sanitizeBusiness(session.business),
    events: session.business.events.map(sanitizeEvent),
    expiresAt: session.expiresAt,
  });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    businessSlug?: string;
    apiKey?: string;
  } | null;
  const businessSlug = body?.businessSlug?.toString().trim();
  const apiKey = body?.apiKey?.toString().trim();
  if (!businessSlug || !apiKey) {
    return NextResponse.json(
      { error: "businessSlug and apiKey are required." },
      { status: 400 },
    );
  }

  const business = await verifyBusinessAccess({ businessSlug, apiKey });
  if (!business) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  const session = createBusinessSessionToken(business);
  const response = NextResponse.json({
    business: sanitizeBusiness(business),
    events: business.events.map(sanitizeEvent),
    expiresAt: session.expiresAt,
  });
  response.cookies.set(businessSessionCookieName, session.token, cookieOptions(session.expiresAt));
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ status: "signed-out" });
  response.cookies.set(businessSessionCookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  });
  return response;
}

import { NextRequest, NextResponse } from "next/server";
import {
  businessSessionCookieName,
  createBusinessSessionToken,
  createUserSessionToken,
  getBusinessContext,
  sanitizeBusiness,
  sanitizeEvent,
  verifyBusinessAccess,
  verifyUserCredentials,
  findBusinessBySlug,
  findBusinessById,
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
    user: "user" in session && session.user ? { id: session.user.id, email: session.user.email } : undefined,
    expiresAt: session.expiresAt,
  });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    businessSlug?: string;
    apiKey?: string;
    email?: string;
    password?: string;
  } | null;

  if (body?.email && body?.password) {
    const user = await verifyUserCredentials(
      body.email.toString().trim(),
      body.password.toString(),
    );
    if (!user) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }
    const businessFromSlug =
      body.businessSlug && (await findBusinessBySlug(body.businessSlug.toString().trim()));
    const business =
      businessFromSlug ||
      (await findBusinessById(user.businessId)) ||
      (await getBusinessContext(request))?.business;
    if (!business) {
      return NextResponse.json(
        { error: "No business found for this user. Provide a businessSlug or create one." },
        { status: 400 },
      );
    }
    const response = NextResponse.json({
      business: sanitizeBusiness(business),
      events: business.events.map(sanitizeEvent),
      user: { id: user.id, email: user.email },
    });
    const userSession = createUserSessionToken(user);
    response.cookies.set("boothos_user", userSession.token, cookieOptions(userSession.expiresAt));
    const bizSession = createBusinessSessionToken(business);
    response.cookies.set(
      businessSessionCookieName,
      bizSession.token,
      cookieOptions(bizSession.expiresAt),
    );
    return response;
  }

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
  response.cookies.set("boothos_user", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  });
  response.cookies.set(businessSessionCookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  });
  return response;
}

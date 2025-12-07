import { NextRequest, NextResponse } from "next/server";
import {
  businessSessionCookieName,
  createBusinessSessionToken,
  createUserSessionToken,
  getBusinessContext,
  sanitizeBusiness,
  sanitizeEvent,
  sessionCookieName,
  verifyUserCredentials,
  findBusinessBySlug,
  findEventBySlugs,
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
  const context = await getBusinessContext(request);
  if (!context?.business) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  return NextResponse.json({
    business: sanitizeBusiness(context.business),
    events: context.business.events.map(sanitizeEvent),
    user: "user" in context && context.user ? { id: context.user.id, email: context.user.email } : undefined,
    expiresAt: context.expiresAt,
  });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    email?: string;
    password?: string;
    businessSlug?: string;
    eventSlug?: string;
  } | null;
  const email = body?.email?.toString().trim().toLowerCase();
  const password = body?.password?.toString();
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }
  const user = await verifyUserCredentials(email, password);
  if (!user) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }
  const business =
    (body?.businessSlug && (await findBusinessBySlug(body.businessSlug))) ||
    (await findBusinessBySlug(""));
  if (!business) {
    return NextResponse.json({ error: "Business not found for this user." }, { status: 404 });
  }

  const userSession = createUserSessionToken(user);
  const businessSession = createBusinessSessionToken(business);

  const response = NextResponse.json({
    business: sanitizeBusiness(business),
    events: business.events.map(sanitizeEvent),
    user: { id: user.id, email: user.email },
    expiresAt: userSession.expiresAt,
  });
  response.cookies.set("boothos_user", userSession.token, cookieOptions(userSession.expiresAt));
  response.cookies.set(businessSessionCookieName, businessSession.token, cookieOptions(businessSession.expiresAt));

  // Optionally set an event session if provided and valid
  if (body?.businessSlug && body?.eventSlug) {
    const ctx = await findEventBySlugs(body.businessSlug, body.eventSlug);
    if (ctx) {
      const sessionToken = createBusinessSessionToken(ctx.business);
      response.cookies.set(sessionCookieName, sessionToken.token, cookieOptions(sessionToken.expiresAt));
    }
  }

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
  response.cookies.set(sessionCookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  });
  return response;
}

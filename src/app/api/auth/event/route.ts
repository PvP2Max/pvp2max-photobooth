import { NextRequest, NextResponse } from "next/server";
import {
  createSessionToken,
  getEventContext,
  sanitizeBusiness,
  sanitizeEvent,
  sessionCookieName,
  verifyEventAccess,
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
  const { context, error, status } = await getEventContext(request);
  if (!context) {
    return NextResponse.json(
      { error: error ?? "No active event session." },
      { status: status ?? 401 },
    );
  }

  return NextResponse.json({
    business: sanitizeBusiness(context.business),
    event: sanitizeEvent(context.event),
    expiresAt: context.expiresAt,
  });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    businessSlug?: string;
    eventSlug?: string;
    accessCode?: string;
  } | null;
  const businessSlug = body?.businessSlug?.toString().trim();
  const eventSlug = body?.eventSlug?.toString().trim();
  const accessCode = body?.accessCode?.toString().trim();

  if (!businessSlug || !eventSlug || !accessCode) {
    return NextResponse.json(
      { error: "businessSlug, eventSlug, and accessCode are required." },
      { status: 400 },
    );
  }

  const verified = await verifyEventAccess({
    businessSlug,
    eventSlug,
    accessCode,
  });
  if (!verified) {
    return NextResponse.json(
      { error: "Invalid event credentials or inactive event." },
      { status: 401 },
    );
  }

  const session = createSessionToken(verified.scope);
  const response = NextResponse.json({
    business: sanitizeBusiness(verified.business),
    event: sanitizeEvent(verified.event),
    expiresAt: session.expiresAt,
  });
  response.cookies.set(sessionCookieName, session.token, cookieOptions(session.expiresAt));
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ status: "signed-out" });
  response.cookies.set(sessionCookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  });
  return response;
}

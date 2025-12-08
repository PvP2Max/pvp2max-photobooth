import { NextRequest, NextResponse } from "next/server";
import { createSelectionToken } from "@/lib/selections";
import { getEventContext } from "@/lib/tenants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const { context, error, status } = await getEventContext(request, { allowUnauthedHeader: true });
  if (!context) {
    return NextResponse.json({ error: error ?? "Unauthorized" }, { status: status ?? 401 });
  }
  const body = (await request.json().catch(() => ({}))) as { email?: string };
  const email = body.email?.toString().trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }
  const token = await createSelectionToken(context.scope, email);
  const shareUrl = `${process.env.APP_BASE_URL || request.headers.get("origin") || ""}/select/${token.token}?business=${context.scope.businessSlug}&event=${context.scope.eventSlug}`;
  return NextResponse.json({ token: token.token, shareUrl });
}

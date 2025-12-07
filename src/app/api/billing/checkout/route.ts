import { NextRequest, NextResponse } from "next/server";
import { createCheckoutSession } from "@/lib/billing";
import { getBusinessContext } from "@/lib/tenants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const businessSession = await getBusinessContext(request);
  if (!businessSession?.business) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await request.json().catch(() => ({}))) as {
    plan?: string;
    eventId?: string;
    successUrl?: string;
    cancelUrl?: string;
  };
  if (!body.plan) {
    return NextResponse.json({ error: "Plan is required" }, { status: 400 });
  }
  const session = await createCheckoutSession({
    plan: body.plan,
    businessId: businessSession.business.id,
    eventId: body.eventId,
    successUrl: body.successUrl,
    cancelUrl: body.cancelUrl,
  });
  return NextResponse.json(session);
}

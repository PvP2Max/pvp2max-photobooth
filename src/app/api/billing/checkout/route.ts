import { NextRequest, NextResponse } from "next/server";
import { getStripeClient, stripePrices } from "@/lib/stripe";
import { getBusinessContext } from "@/lib/tenants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PLAN_MAP: Record<string, keyof typeof stripePrices> = {
  "event-basic": "eventBasic",
  "event-unlimited": "eventUnlimited",
  "event-ai": "eventAi",
  "photographer-single": "photogEvent",
  "photographer-monthly": "photogMonthly",
  "ai-topup": "aiTopup",
};

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
  const plan = body.plan?.toString();
  if (!plan || !(plan in PLAN_MAP)) {
    return NextResponse.json({ error: "Invalid plan." }, { status: 400 });
  }

  const priceKey = PLAN_MAP[plan];
  const priceId = stripePrices[priceKey];
  if (!priceId) {
    return NextResponse.json(
      { error: `Missing Stripe price for ${plan}. Set env ${priceKey}.` },
      { status: 400 },
    );
  }

  let stripe;
  try {
    stripe = getStripeClient();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Stripe is not configured.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const origin = body.successUrl || request.headers.get("origin") || process.env.APP_BASE_URL || "";
  const successUrl = `${origin.replace(/\/$/, "")}/business?status=paid`;
  const cancelUrl = body.cancelUrl || `${origin.replace(/\/$/, "")}/business?status=cancel`;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: plan === "photographer-monthly" ? "subscription" : "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        plan,
        businessId: businessSession.business.id,
        eventId: body.eventId ?? "",
      },
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create checkout session.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getStripeClient, stripePrices } from "@/lib/stripe";
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
    mode?: string;
    topup?: boolean;
  };
  if (!body.plan) {
    return NextResponse.json({ error: "Plan is required" }, { status: 400 });
  }

  const price =
    {
      "event-basic": stripePrices.eventBasic,
      "event-unlimited": stripePrices.eventUnlimited,
      "event-ai": stripePrices.eventAi,
      "photographer-single": stripePrices.photogEvent,
      "photographer-monthly": stripePrices.photogMonthly,
      "ai-topup": stripePrices.aiTopup,
    }[body.plan] || null;

  if (!price) {
    return NextResponse.json({ error: "Unsupported plan or missing Stripe price id." }, { status: 400 });
  }

  try {
    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.create({
      mode: body.plan === "photographer-monthly" ? "subscription" : "payment",
      success_url: body.successUrl || request.headers.get("origin") || "http://localhost:3000",
      cancel_url: body.cancelUrl || request.headers.get("origin") || "http://localhost:3000",
      line_items: [{ price, quantity: 1 }],
      metadata: {
        businessId: businessSession.business.id,
        eventId: body.eventId ?? "",
        plan: body.plan,
        mode: body.mode ?? "",
        aiTopup: body.plan === "ai-topup" ? "1" : "0",
      },
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Stripe checkout failed.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

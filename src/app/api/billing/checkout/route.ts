import { NextRequest, NextResponse } from "next/server";
import { getStripeClient, stripePrices } from "@/lib/stripe";
import { getBusinessContext } from "@/lib/tenants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PLAN_MAP: Record<string, keyof typeof stripePrices> = {
  "basic": "basic",
  "pro": "pro",
  "unlimited": "unlimited",
  "photographer-event": "photographerEvent",
  "photographer-subscription": "photographerSubscription",
};

type EventData = {
  name: string;
  plan: string;
  mode: "self-serve" | "photographer";
  allowedSelections?: number;
  allowBackgroundRemoval?: boolean;
  allowAiBackgrounds?: boolean;
  allowAiFilters?: boolean;
  deliverySms?: boolean;
  galleryPublic?: boolean;
  overlayTheme?: string;
  eventDate?: string;
  eventTime?: string;
};

export async function POST(request: NextRequest) {
  const businessSession = await getBusinessContext(request);
  if (!businessSession?.business) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    plan?: string;
    eventId?: string;
    eventData?: EventData;
    successUrl?: string;
    cancelUrl?: string;
  };
  const plan = body.plan?.toString();
  if (!plan || !(plan in PLAN_MAP)) {
    return NextResponse.json({ error: "Invalid plan." }, { status: 400 });
  }

  // Validate event data if provided
  if (body.eventData && !body.eventData.name) {
    return NextResponse.json({ error: "Event name is required." }, { status: 400 });
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
  const successUrl = `${origin.replace(/\/$/, "")}/dashboard?status=paid`;
  const cancelUrl = body.cancelUrl || `${origin.replace(/\/$/, "")}/dashboard?status=cancel`;

  // Build metadata - Stripe has 500 char limit per value
  const metadata: Record<string, string> = {
    plan,
    businessId: businessSession.business.id,
    eventId: body.eventId ?? "",
  };

  // If event data is provided, encode it in metadata for the webhook to use
  if (body.eventData) {
    metadata.eventName = body.eventData.name;
    metadata.eventMode = body.eventData.mode;
    metadata.eventAllowedSelections = String(body.eventData.allowedSelections ?? 3);
    metadata.eventAllowBgRemoval = String(body.eventData.allowBackgroundRemoval ?? true);
    metadata.eventAllowAiBg = String(body.eventData.allowAiBackgrounds ?? false);
    metadata.eventAllowAiFilters = String(body.eventData.allowAiFilters ?? false);
    metadata.eventDeliverySms = String(body.eventData.deliverySms ?? false);
    metadata.eventGalleryPublic = String(body.eventData.galleryPublic ?? false);
    metadata.eventOverlayTheme = body.eventData.overlayTheme ?? "none";
    metadata.eventDate = body.eventData.eventDate ?? "";
    metadata.eventTime = body.eventData.eventTime ?? "";
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: plan === "photographer-subscription" ? "subscription" : "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata,
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create checkout session.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

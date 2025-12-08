import { NextRequest, NextResponse } from "next/server";
import {
  createEvent,
  getBusinessContext,
  sanitizeBusiness,
  sanitizeEvent,
  planDefaults,
} from "@/lib/tenants";
import type { BoothEventPlan } from "@/lib/tenants";
import { getStripeClient, stripePrices } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PLAN_MAP: Record<string, keyof typeof stripePrices> = {
  "event-basic": "eventBasic",
  "event-unlimited": "eventUnlimited",
  "event-ai": "eventAi",
  "photographer-single": "photogEvent",
  "photographer-monthly": "photogMonthly",
};

export async function GET(request: NextRequest) {
  const session = await getBusinessContext(request);
  if (!session?.business) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    business: sanitizeBusiness(session.business),
    events: session.business.events.map(sanitizeEvent),
  });
}

export async function POST(request: NextRequest) {
  const session = await getBusinessContext(request);
  if (!session?.business) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    slug?: string;
    accessCode?: string;
    status?: "draft" | "live" | "closed";
    plan?: string;
    photoCap?: number | null;
    aiCredits?: number;
    allowBackgroundRemoval?: boolean;
    allowAiBackgrounds?: boolean;
    allowAiFilters?: boolean;
    deliveryEmail?: boolean;
    deliverySms?: boolean;
    overlayTheme?: string;
    overlayLogo?: string;
    galleryPublic?: boolean;
    eventDate?: string;
    eventTime?: string;
  };
  if (!body.name) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }

  const plan = (body.plan as BoothEventPlan | undefined) ?? "event-basic";
  const isFree = plan === "free";

  try {
    if (isFree) {
      const { event, accessCode } = await createEvent(session.business.id, {
        name: body.name,
        slug: body.slug,
        accessCode: body.accessCode,
        status: body.status ?? "live",
        plan,
        photoCap: body.photoCap ?? undefined,
        aiCredits: body.aiCredits ?? undefined,
        allowBackgroundRemoval: body.allowBackgroundRemoval ?? true,
        allowAiBackgrounds: body.allowAiBackgrounds ?? false,
        allowAiFilters: body.allowAiFilters ?? false,
        deliveryEmail: body.deliveryEmail ?? true,
        deliverySms: body.deliverySms ?? false,
        overlayTheme: body.overlayTheme ?? "none",
        overlayLogo: body.overlayLogo,
        galleryPublic: body.galleryPublic ?? false,
        eventDate: body.eventDate,
        eventTime: body.eventTime,
      });
      return NextResponse.json({
        business: sanitizeBusiness(session.business),
        event: sanitizeEvent(event),
        accessCode,
      });
    }

    const priceKey = PLAN_MAP[plan];
    const priceId = priceKey ? stripePrices[priceKey] : undefined;
    if (!priceId) {
      return NextResponse.json(
        { error: `Missing Stripe price for ${plan}.` },
        { status: 400 },
      );
    }

    const defaults = planDefaults(plan);
    const payload = {
      name: body.name,
      status: body.status ?? "live",
      mode: (body.mode as "self-serve" | "photographer" | undefined) ?? "self-serve",
      allowBackgroundRemoval: body.allowBackgroundRemoval ?? true,
      allowAiBackgrounds: body.allowAiBackgrounds ?? defaults.allowAiBackgrounds ?? false,
      allowAiFilters: body.allowAiFilters ?? defaults.allowAiBackgrounds ?? false,
      deliveryEmail: body.deliveryEmail ?? true,
      deliverySms: body.deliverySms ?? defaults.smsEnabled ?? false,
      galleryPublic: body.galleryPublic ?? false,
      eventDate: body.eventDate,
      eventTime: body.eventTime,
      plan,
    };

    const stripe = getStripeClient();
    const origin = request.headers.get("origin") || process.env.APP_BASE_URL || "";
    const successUrl = `${origin.replace(/\/$/, "")}/business?view=events&status=paid`;
    const cancelUrl = `${origin.replace(/\/$/, "")}/business?view=events&status=cancel`;
    const eventPayload = JSON.stringify(payload);

    const sessionCheckout = await stripe.checkout.sessions.create({
      mode: plan === "photographer-monthly" ? "subscription" : "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        plan,
        businessId: session.business.id,
        eventPayload,
      },
    });

    return NextResponse.json({ checkoutUrl: sessionCheckout.url });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to create event.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

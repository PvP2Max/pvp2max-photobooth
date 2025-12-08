import { NextRequest, NextResponse } from "next/server";
import { getStripeClient } from "@/lib/stripe";
import {
  BoothEventPlan,
  applyPlanDefaults,
  updateEventConfig,
  updateBusinessSubscription,
  createEvent,
} from "@/lib/tenants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "iad1";

export async function POST(request: NextRequest) {
  const stripe = getStripeClient();
  const sig = request.headers.get("stripe-signature") || "";
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Missing webhook secret" }, { status: 500 });
  }

  const rawBody = await request.text();
  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as {
          metadata?: Record<string, string>;
          subscription?: string;
        };
        const plan = session.metadata?.plan as BoothEventPlan | undefined;
        const businessId = session.metadata?.businessId as string | undefined;
        const eventId = session.metadata?.eventId as string | undefined;
        if (plan && businessId && eventId) {
          await markEventPaid(businessId, eventId, plan);
        } else if (plan && businessId && session.metadata?.eventPayload) {
          await createPaidEventFromMetadata(businessId, plan, session.metadata.eventPayload);
        }
        if (plan === "photographer-monthly" && businessId) {
          await markSubscription(businessId, session.subscription as string, "active", plan);
        }
        break;
      }
      case "invoice.paid":
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as {
          id: string;
          status: "active" | "past_due" | "canceled" | "incomplete" | "trialing";
          metadata?: Record<string, string>;
        };
        const businessId = sub.metadata?.businessId;
        if (businessId) {
          await markSubscription(businessId, sub.id, sub.status, "photographer-monthly");
        }
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as { metadata?: Record<string, string> };
        const businessId = sub.metadata?.businessId;
        if (businessId) {
          await markSubscription(businessId, undefined, "canceled", "photographer-monthly");
        }
        break;
      }
      default:
        break;
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Webhook handling failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function markEventPaid(businessId: string, eventId: string, plan: BoothEventPlan) {
  const defaults = applyPlanDefaults(plan);
  await updateEventConfig(businessId, eventId, { ...defaults, paymentStatus: "paid" });
}

async function createPaidEventFromMetadata(businessId: string, plan: BoothEventPlan, payload: string) {
  try {
    const parsed = JSON.parse(payload) as {
      name?: string;
      status?: string;
      mode?: "self-serve" | "photographer";
      allowBackgroundRemoval?: boolean;
      allowAiBackgrounds?: boolean;
      allowAiFilters?: boolean;
      deliveryEmail?: boolean;
      deliverySms?: boolean;
      galleryPublic?: boolean;
      eventDate?: string;
      eventTime?: string;
    };
    if (!parsed?.name) return;
    const defaults = applyPlanDefaults(plan);
    const { event } = await createEvent(businessId, {
      name: parsed.name,
      status: (parsed.status as any) ?? "live",
      mode: parsed.mode ?? "self-serve",
      plan,
      allowBackgroundRemoval: parsed.allowBackgroundRemoval ?? true,
      allowAiBackgrounds: parsed.allowAiBackgrounds ?? defaults.allowAiBackgrounds ?? false,
      allowAiFilters: parsed.allowAiFilters ?? defaults.allowAiBackgrounds ?? false,
      deliveryEmail: parsed.deliveryEmail ?? true,
      deliverySms: parsed.deliverySms ?? defaults.smsEnabled ?? false,
      galleryPublic: parsed.galleryPublic ?? false,
      eventDate: parsed.eventDate,
      eventTime: parsed.eventTime,
      overlayTheme: "none",
    });
    await updateEventConfig(businessId, event.id, { ...defaults, paymentStatus: "paid" });
  } catch {
    // swallow malformed payloads; we don't fail the webhook
  }
}

async function markSubscription(
  businessId: string,
  subscriptionId: string | undefined,
  status: "active" | "past_due" | "canceled" | "incomplete" | "trialing",
  plan: BoothEventPlan,
) {
  await updateBusinessSubscription(businessId, {
    subscriptionId,
    subscriptionStatus: status,
    subscriptionPlan: plan,
  });
}

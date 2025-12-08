import { NextRequest, NextResponse } from "next/server";
import { getStripeClient } from "@/lib/stripe";
import {
  BoothEventPlan,
  applyPlanDefaults,
  updateEventConfig,
  updateBusinessSubscription,
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
  await updateEventConfig(businessId, eventId, {
    plan,
    paymentStatus: "paid",
    ...applyPlanDefaults(plan),
  });
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

import Stripe from "stripe";
import db from "./db";
import { getPlanLimits } from "./utils";
import type { EventPlan } from "@prisma/client";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_PRICE_PRO = process.env.STRIPE_PRICE_PRO;
const STRIPE_PRICE_CORPORATE = process.env.STRIPE_PRICE_CORPORATE;

if (!STRIPE_SECRET_KEY) {
  console.warn("STRIPE_SECRET_KEY not configured");
}

const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2025-02-24.acacia" as Stripe.LatestApiVersion })
  : null;

function getStripe(): Stripe {
  if (!stripe) throw new Error("Stripe not configured");
  return stripe;
}

export type CheckoutParams = {
  plan: "PRO" | "CORPORATE";
  eventId?: string;
  eventName: string;
  customerId?: string;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
  metadata: Record<string, string>;
};

export async function createCheckoutSession(params: CheckoutParams) {
  const { plan, eventName, customerId, customerEmail, successUrl, cancelUrl, metadata } = params;
  const s = getStripe();

  const priceId = plan === "PRO" ? STRIPE_PRICE_PRO : STRIPE_PRICE_CORPORATE;
  if (!priceId) throw new Error(`No price configured for ${plan} plan`);

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata,
    payment_intent_data: { description: `${plan} Event: ${eventName}`, metadata },
  };

  if (customerId) {
    sessionParams.customer = customerId;
  } else {
    sessionParams.customer_email = customerEmail;
  }

  return s.checkout.sessions.create(sessionParams);
}

export async function handlePaymentSuccess(session: Stripe.Checkout.Session) {
  const metadata = session.metadata || {};
  const { businessId, eventId, plan } = metadata;

  if (!businessId) return;

  if (session.customer && typeof session.customer === "string") {
    await db.business.update({
      where: { id: businessId },
      data: { stripeCustomerId: session.customer },
    });
  }

  if (eventId) {
    const planLimits = getPlanLimits(plan as EventPlan);
    await db.event.update({
      where: { id: eventId },
      data: {
        plan: plan as EventPlan,
        status: "LIVE",
        photoCap: planLimits.photoCap,
        aiCredits: planLimits.aiCredits,
        backgroundRemovalEnabled: planLimits.backgroundRemoval,
        stripePaymentId: session.payment_intent as string,
        paidAt: new Date(),
      },
    });
  }
}

export function verifyWebhookSignature(payload: string | Buffer, signature: string): Stripe.Event {
  const s = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET not configured");
  return s.webhooks.constructEvent(payload, signature, webhookSecret);
}

export type WebhookResult = {
  success: boolean;
  error?: string;
  type?: string;
  metadata?: Record<string, string>;
  paymentId?: string;
  customerId?: string;
};

export async function handleStripeWebhook(body: string, signature: string): Promise<WebhookResult> {
  try {
    const event = verifyWebhookSignature(body, signature);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      return {
        success: true,
        type: event.type,
        metadata: session.metadata as Record<string, string>,
        paymentId: typeof session.payment_intent === "string" ? session.payment_intent : undefined,
        customerId: typeof session.customer === "string" ? session.customer : undefined,
      };
    }

    return { success: true, type: event.type };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

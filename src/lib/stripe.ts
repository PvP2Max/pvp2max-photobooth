import Stripe from "stripe";

export function getStripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  return new Stripe(key, { apiVersion: "2024-11-20.acacia" as any });
}

export const stripePrices = {
  eventBasic: process.env.STRIPE_PRICE_EVENT_BASIC,
  eventUnlimited: process.env.STRIPE_PRICE_EVENT_UNLIMITED,
  eventAi: process.env.STRIPE_PRICE_EVENT_AI,
  photogEvent: process.env.STRIPE_PRICE_PHOTOG_EVENT,
  photogMonthly: process.env.STRIPE_PRICE_PHOTOG_MONTHLY,
  aiTopup: process.env.STRIPE_PRICE_AI_TOPUP,
};

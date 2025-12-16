import Stripe from "stripe";

export function getStripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  return new Stripe(key);
}

export const stripePrices = {
  basic: process.env.STRIPE_PRICE_BASIC,           // $10
  pro: process.env.STRIPE_PRICE_PRO,               // $20
  unlimited: process.env.STRIPE_PRICE_UNLIMITED,   // $30
  photographerEvent: process.env.STRIPE_PRICE_PHOTOG_EVENT,     // $100
  photographerSubscription: process.env.STRIPE_PRICE_PHOTOG_SUB, // $250/mo
};

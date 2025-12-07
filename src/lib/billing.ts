type CheckoutPayload = {
  plan: string;
  businessId?: string;
  eventId?: string;
  successUrl?: string;
  cancelUrl?: string;
};

export function isStripeEnabled() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export async function createCheckoutSession(payload: CheckoutPayload) {
  if (!isStripeEnabled()) {
    return {
      url: null,
      message: "Stripe is not configured. Set STRIPE_SECRET_KEY to enable billing.",
    };
  }
  // Placeholder: integrate Stripe SDK when keys are available.
  return {
    url: payload.successUrl || "/",
    message: "Stripe integration pending; no live session created.",
  };
}

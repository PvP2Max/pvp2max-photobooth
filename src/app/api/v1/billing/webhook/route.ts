import { NextRequest, NextResponse } from "next/server";
import { handleStripeWebhook } from "@/lib/stripe";
import { getPlanLimits } from "@/lib/utils";
import db from "@/lib/db";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const result = await handleStripeWebhook(body, signature);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  if (result.type === "checkout.session.completed" && result.metadata) {
    const { businessId, eventName, eventSlug, plan, eventDate, userId } = result.metadata;

    if (!businessId || !eventName || !eventSlug || !plan) {
      return NextResponse.json({ error: "Missing metadata" }, { status: 400 });
    }

    const limits = getPlanLimits(plan as "FREE" | "PRO" | "CORPORATE");

    await db.event.create({
      data: {
        businessId,
        name: eventName,
        slug: eventSlug,
        plan: plan as "FREE" | "PRO" | "CORPORATE",
        mode: "SELF_SERVICE",
        status: "DRAFT",
        photoCap: limits.photoCap,
        aiCredits: limits.aiCredits,
        backgroundRemovalEnabled: limits.backgroundRemoval,
        eventDate: eventDate ? new Date(eventDate) : null,
        stripePaymentId: result.paymentId,
        paidAt: new Date(),
      },
    });

    if (result.customerId) {
      await db.business.update({
        where: { id: businessId },
        data: { stripeCustomerId: result.customerId },
      });
    }
  }

  return NextResponse.json({ received: true });
}

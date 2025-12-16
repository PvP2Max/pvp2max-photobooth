import { NextRequest, NextResponse } from "next/server";
import { getStripeClient } from "@/lib/stripe";
import {
  BoothEventPlan,
  applyPlanDefaults,
  updateEventConfig,
  createEvent,
  updateUserSubscription,
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
        const eventName = session.metadata?.eventName as string | undefined;

        // businessId is now the user's UID
        const ownerUid = businessId;

        // If we have event data in metadata, create a new event
        if (plan && ownerUid && eventName) {
          await createPaidEventFromMetadata(ownerUid, plan, session.metadata!);
        }
        // Otherwise, if we have an existing eventId, just mark it as paid
        else if (plan && ownerUid && eventId) {
          await markEventPaid(ownerUid, eventId, plan);
        }
        // Legacy: handle JSON-encoded payload
        else if (plan && ownerUid && session.metadata?.eventPayload) {
          await createPaidEventFromJsonPayload(ownerUid, plan, session.metadata.eventPayload);
        }

        if (plan === "photographer-subscription" && ownerUid) {
          await updateUserSubscription(ownerUid, {
            subscriptionId: session.subscription as string,
            subscriptionStatus: "active",
            subscriptionPlan: plan,
            aiCreditsRemaining: 10,
            aiCreditsResetAt: new Date().toISOString(),
          });
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
        const ownerUid = sub.metadata?.businessId;
        if (ownerUid) {
          await updateUserSubscription(ownerUid, {
            subscriptionId: sub.id,
            subscriptionStatus: sub.status,
            subscriptionPlan: "photographer-subscription",
          });
          // Reset AI credits on invoice.paid (monthly renewal)
          if (event.type === "invoice.paid" && sub.status === "active") {
            await updateUserSubscription(ownerUid, {
              aiCreditsRemaining: 10,
              aiCreditsResetAt: new Date().toISOString(),
            });
          }
        }
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as { metadata?: Record<string, string> };
        const ownerUid = sub.metadata?.businessId;
        if (ownerUid) {
          await updateUserSubscription(ownerUid, {
            subscriptionStatus: "canceled",
          });
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

async function markEventPaid(ownerUid: string, eventId: string, plan: BoothEventPlan) {
  const defaults = applyPlanDefaults(plan);
  await updateEventConfig(ownerUid, eventId, { ...defaults, paymentStatus: "paid" });
}

// Create event from individual metadata fields (new format)
async function createPaidEventFromMetadata(
  ownerUid: string,
  plan: BoothEventPlan,
  metadata: Record<string, string>,
) {
  try {
    const eventName = metadata.eventName;
    if (!eventName) return;

    const defaults = applyPlanDefaults(plan);
    const mode = (metadata.eventMode as "self-serve" | "photographer") ?? "self-serve";
    const allowedSelections = parseInt(metadata.eventAllowedSelections ?? "3", 10);

    const { event } = await createEvent(ownerUid, {
      name: eventName,
      status: "live",
      mode,
      plan,
      allowedSelections,
      allowBackgroundRemoval: metadata.eventAllowBgRemoval === "true",
      allowAiBackgrounds: metadata.eventAllowAiBg === "true",
      allowAiFilters: metadata.eventAllowAiFilters === "true",
      deliveryEmail: true,
      deliverySms: metadata.eventDeliverySms === "true",
      galleryPublic: metadata.eventGalleryPublic === "true",
      eventDate: metadata.eventDate || undefined,
      eventTime: metadata.eventTime || undefined,
      overlayTheme: metadata.eventOverlayTheme || "none",
    });

    await updateEventConfig(ownerUid, event.id, { ...defaults, paymentStatus: "paid" });
  } catch {
    // swallow errors; we don't fail the webhook
  }
}

// Legacy: Create event from JSON-encoded payload
async function createPaidEventFromJsonPayload(
  ownerUid: string,
  plan: BoothEventPlan,
  payload: string,
) {
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
    const { event } = await createEvent(ownerUid, {
      name: parsed.name,
      status: parsed.status === "closed" ? "closed" : "live",
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
    await updateEventConfig(ownerUid, event.id, { ...defaults, paymentStatus: "paid" });
  } catch {
    // swallow malformed payloads; we don't fail the webhook
  }
}

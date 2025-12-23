import { NextRequest } from "next/server";
import { withAuth, apiSuccess, apiError, parseBody } from "@/lib/api-middleware";
import { createCheckoutSession } from "@/lib/stripe";
import db from "@/lib/db";
import { z } from "zod";

const checkoutSchema = z.object({
  businessId: z.string(),
  eventName: z.string().min(1),
  eventSlug: z.string().min(1),
  plan: z.enum(["PRO", "CORPORATE"]),
  eventDate: z.string().optional(),
});

export const POST = withAuth(async (request, context) => {
  const body = await parseBody<z.infer<typeof checkoutSchema>>(request);
  if (!body) return apiError("Invalid request body", 400);

  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message || "Validation failed", 400);

  const { businessId, eventName, eventSlug, plan, eventDate } = parsed.data;

  const business = await db.business.findFirst({
    where: { id: businessId, ownerId: context.user.id },
  });

  if (!business) return apiError("Business not found", 404);

  const existingEvent = await db.event.findFirst({
    where: { businessId, slug: eventSlug },
  });

  if (existingEvent) return apiError("Event slug already exists", 400);

  const user = await db.user.findUnique({ where: { id: context.user.id } });
  if (!user) return apiError("User not found", 404);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const session = await createCheckoutSession({
    plan,
    eventName,
    customerId: business.stripeCustomerId || undefined,
    customerEmail: user.email,
    metadata: {
      businessId, eventName, eventSlug, plan, eventDate: eventDate || "",
      userId: context.user.id,
    },
    successUrl: `${appUrl}/dashboard/events?success=true`,
    cancelUrl: `${appUrl}/dashboard/events/new?canceled=true`,
  });

  if (!session?.url) return apiError("Failed to create checkout session", 500);

  return apiSuccess({ url: session.url });
});

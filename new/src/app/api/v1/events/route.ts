import { NextRequest } from "next/server";
import { withAuth, apiSuccess, apiError, parseBody, getPaginationParams } from "@/lib/api-middleware";
import { slugify, getPlanLimits } from "@/lib/utils";
import db from "@/lib/db";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).optional(),
  businessId: z.string().uuid(),
  plan: z.enum(["FREE", "PRO", "CORPORATE"]).default("FREE"),
  mode: z.enum(["SELF_SERVICE", "PHOTOGRAPHER"]).default("SELF_SERVICE"),
  eventDate: z.string().optional(),
});

export const GET = withAuth(async (request, context) => {
  const url = new URL(request.url);
  const businessId = url.searchParams.get("businessId");
  const { page, pageSize, skip } = getPaginationParams(request);

  const where: Record<string, unknown> = { business: { ownerId: context.user.id } };
  if (businessId) where.businessId = businessId;

  const [events, total] = await Promise.all([
    db.event.findMany({
      where,
      include: { business: { select: { name: true, slug: true } }, _count: { select: { sessions: true, photos: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    db.event.count({ where }),
  ]);

  return apiSuccess({
    items: events.map((e) => ({
      id: e.id, name: e.name, slug: e.slug, business: e.business, plan: e.plan, mode: e.mode, status: e.status,
      photoUsed: e.photoUsed, photoCap: e.photoCap, sessionCount: e._count.sessions, photoCount: e._count.photos,
      eventDate: e.eventDate, createdAt: e.createdAt,
    })),
    total, page, pageSize, hasMore: skip + events.length < total,
  });
});

export const POST = withAuth(async (request, context) => {
  const body = await parseBody<z.infer<typeof createSchema>>(request);
  if (!body) return apiError("Invalid request body", 400);

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message || "Validation failed", 400);

  const business = await db.business.findUnique({ where: { id: parsed.data.businessId } });
  if (!business || business.ownerId !== context.user.id) {
    return apiError("Business not found", 404);
  }

  const slug = parsed.data.slug || slugify(parsed.data.name);
  const existing = await db.event.findUnique({ where: { businessId_slug: { businessId: business.id, slug } } });
  if (existing) return apiError("Event slug already exists", 409);

  const planLimits = getPlanLimits(parsed.data.plan);
  const event = await db.event.create({
    data: {
      name: parsed.data.name,
      slug,
      businessId: business.id,
      plan: parsed.data.plan,
      mode: parsed.data.mode,
      status: parsed.data.plan === "FREE" ? "LIVE" : "DRAFT",
      photoCap: planLimits.photoCap,
      aiCredits: planLimits.aiCredits,
      backgroundRemovalEnabled: planLimits.backgroundRemoval,
      eventDate: parsed.data.eventDate ? new Date(parsed.data.eventDate) : null,
    },
  });

  return apiSuccess({ id: event.id, name: event.name, slug: event.slug, status: event.status }, 201);
});

import { NextRequest } from "next/server";
import { withAuth, apiSuccess, apiError, parseBody, type RouteContext } from "@/lib/api-middleware";
import db from "@/lib/db";
import { z } from "zod";

type Params = { slug: string };

const updateSchema = z.object({ name: z.string().min(1).max(100).optional() });

export const GET = withAuth<Params>(async (request, context, routeContext) => {
  const { slug } = await routeContext.params;

  const business = await db.business.findUnique({
    where: { slug },
    include: { _count: { select: { events: true } } },
  });

  if (!business || business.ownerId !== context.user.id) {
    return apiError("Business not found", 404);
  }

  return apiSuccess({
    id: business.id, name: business.name, slug: business.slug, eventCount: business._count.events, createdAt: business.createdAt,
  });
});

export const PATCH = withAuth<Params>(async (request, context, routeContext) => {
  const { slug } = await routeContext.params;

  const business = await db.business.findUnique({ where: { slug } });
  if (!business || business.ownerId !== context.user.id) {
    return apiError("Business not found", 404);
  }

  const body = await parseBody<z.infer<typeof updateSchema>>(request);
  if (!body) return apiError("Invalid request body", 400);

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return apiError("Validation failed", 400);

  const updated = await db.business.update({ where: { id: business.id }, data: parsed.data });
  return apiSuccess({ id: updated.id, name: updated.name, slug: updated.slug });
});

export const DELETE = withAuth<Params>(async (request, context, routeContext) => {
  const { slug } = await routeContext.params;

  const business = await db.business.findUnique({ where: { slug }, include: { _count: { select: { events: true } } } });
  if (!business || business.ownerId !== context.user.id) {
    return apiError("Business not found", 404);
  }

  if (business._count.events > 0) {
    return apiError("Cannot delete business with events", 400);
  }

  await db.business.delete({ where: { id: business.id } });
  return apiSuccess({ message: "Business deleted" });
});

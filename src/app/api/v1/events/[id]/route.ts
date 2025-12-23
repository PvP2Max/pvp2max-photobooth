import { NextRequest } from "next/server";
import { withAuth, apiSuccess, apiError, parseBody, validateEventAccess, type RouteContext } from "@/lib/api-middleware";
import db from "@/lib/db";
import { z } from "zod";

type Params = { id: string };

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  status: z.enum(["DRAFT", "LIVE", "CLOSED"]).optional(),
  mode: z.enum(["SELF_SERVICE", "PHOTOGRAPHER"]).optional(),
  backgroundRemovalEnabled: z.boolean().optional(),
  eventDate: z.string().nullable().optional(),
});

export const GET = withAuth<Params>(async (request, context, routeContext) => {
  const { id } = await routeContext.params;
  const { hasAccess, role } = await validateEventAccess(context.user.id, id);
  if (!hasAccess) return apiError("Event not found", 404);

  const event = await db.event.findUnique({
    where: { id },
    include: {
      business: { select: { id: true, name: true, slug: true } },
      _count: { select: { sessions: true, photos: true, backgrounds: true, productions: true } },
    },
  });

  if (!event) return apiError("Event not found", 404);

  return apiSuccess({
    id: event.id, name: event.name, slug: event.slug, business: event.business, plan: event.plan, mode: event.mode,
    status: event.status, photoCap: event.photoCap, photoUsed: event.photoUsed, aiCredits: event.aiCredits, aiUsed: event.aiUsed,
    backgroundRemovalEnabled: event.backgroundRemovalEnabled, paidAt: event.paidAt, eventDate: event.eventDate,
    counts: event._count, role, createdAt: event.createdAt,
  });
});

export const PATCH = withAuth<Params>(async (request, context, routeContext) => {
  const { id } = await routeContext.params;
  const { hasAccess, role } = await validateEventAccess(context.user.id, id);
  if (!hasAccess || role !== "owner") return apiError("Not authorized", 403);

  const body = await parseBody<z.infer<typeof updateSchema>>(request);
  if (!body) return apiError("Invalid request body", 400);

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return apiError("Validation failed", 400);

  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.eventDate !== undefined) {
    updateData.eventDate = parsed.data.eventDate ? new Date(parsed.data.eventDate) : null;
  }

  const updated = await db.event.update({ where: { id }, data: updateData });
  return apiSuccess({ id: updated.id, name: updated.name, status: updated.status });
});

export const DELETE = withAuth<Params>(async (request, context, routeContext) => {
  const { id } = await routeContext.params;
  const { hasAccess, role } = await validateEventAccess(context.user.id, id);
  if (!hasAccess || role !== "owner") return apiError("Not authorized", 403);

  await db.event.delete({ where: { id } });
  return apiSuccess({ message: "Event deleted" });
});

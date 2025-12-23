import { NextRequest } from "next/server";
import { withAuth, apiSuccess, apiError, validateEventAccess, getPaginationParams, type RouteContext } from "@/lib/api-middleware";
import db from "@/lib/db";

type Params = { id: string };

export const GET = withAuth<Params>(async (request, context, routeContext) => {
  const { id } = await routeContext.params;
  const { hasAccess } = await validateEventAccess(context.user.id, id);
  if (!hasAccess) return apiError("Event not found", 404);

  const { page, pageSize, skip } = getPaginationParams(request);

  const [sessions, total] = await Promise.all([
    db.guestSession.findMany({
      where: { eventId: id },
      include: { _count: { select: { photos: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    db.guestSession.count({ where: { eventId: id } }),
  ]);

  return apiSuccess({
    items: sessions.map((s) => ({
      id: s.id, email: s.email, name: s.name, photoCount: s._count.photos, createdAt: s.createdAt,
    })),
    total, page, pageSize, hasMore: skip + sessions.length < total,
  });
});

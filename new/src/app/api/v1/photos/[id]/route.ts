import { NextRequest } from "next/server";
import { withAuth, apiSuccess, apiError, validateEventAccess } from "@/lib/api-middleware";
import { deleteFromR2 } from "@/lib/r2";
import db from "@/lib/db";

type Params = { id: string };

export const GET = withAuth<Params>(async (request, context, routeContext) => {
  const { id } = await routeContext.params;

  const photo = await db.photo.findUnique({
    where: { id },
    include: { session: { select: { email: true, name: true } } },
  });

  if (!photo) return apiError("Photo not found", 404);

  const { hasAccess } = await validateEventAccess(context.user.id, photo.eventId);
  if (!hasAccess) return apiError("Photo not found", 404);

  const r2BaseUrl = process.env.R2_PUBLIC_BASE_URL;

  return apiSuccess({
    id: photo.id,
    originalName: photo.originalName,
    originalUrl: `${r2BaseUrl}/${photo.originalKey}`,
    cutoutUrl: photo.cutoutKey ? `${r2BaseUrl}/${photo.cutoutKey}` : null,
    session: photo.session,
    createdAt: photo.createdAt,
  });
});

export const DELETE = withAuth<Params>(async (request, context, routeContext) => {
  const { id } = await routeContext.params;

  const photo = await db.photo.findUnique({ where: { id } });
  if (!photo) return apiError("Photo not found", 404);

  const { hasAccess, role } = await validateEventAccess(context.user.id, photo.eventId);
  if (!hasAccess || role !== "owner") return apiError("Unauthorized", 403);

  await db.photo.delete({ where: { id } });
  await deleteFromR2(photo.originalKey);
  if (photo.cutoutKey) await deleteFromR2(photo.cutoutKey);

  await db.event.update({
    where: { id: photo.eventId },
    data: { photoUsed: { decrement: 1 } },
  });

  return apiSuccess({ deleted: true });
});

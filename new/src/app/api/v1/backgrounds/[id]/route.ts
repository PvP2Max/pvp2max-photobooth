import { NextRequest } from "next/server";
import { withAuth, apiSuccess, apiError, parseBody } from "@/lib/api-middleware";
import { deleteFromR2 } from "@/lib/r2";
import db from "@/lib/db";
import { z } from "zod";

type Params = { id: string };

export const GET = withAuth<Params>(async (request, context, routeContext) => {
  const { id } = await routeContext.params;

  const background = await db.background.findUnique({ where: { id } });
  if (!background) return apiError("Background not found", 404);

  if (background.eventId) {
    const event = await db.event.findUnique({
      where: { id: background.eventId },
      include: { business: { select: { ownerId: true } } },
    });
    if (!event || event.business.ownerId !== context.user.id) {
      return apiError("Background not found", 404);
    }
  }

  const r2BaseUrl = process.env.R2_PUBLIC_BASE_URL;

  return apiSuccess({
    id: background.id,
    name: background.name,
    description: background.description,
    category: background.category,
    url: `${r2BaseUrl}/${background.r2Key}`,
    previewUrl: background.previewKey ? `${r2BaseUrl}/${background.previewKey}` : null,
    isAiGenerated: background.isAiGenerated,
    isDefault: background.isDefault,
    isEnabled: background.isEnabled,
  });
});

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  isEnabled: z.boolean().optional(),
});

export const PATCH = withAuth<Params>(async (request, context, routeContext) => {
  const { id } = await routeContext.params;

  const background = await db.background.findUnique({ where: { id } });
  if (!background) return apiError("Background not found", 404);
  if (!background.eventId) return apiError("Cannot modify default backgrounds", 403);

  const event = await db.event.findUnique({
    where: { id: background.eventId },
    include: { business: { select: { ownerId: true } } },
  });
  if (!event || event.business.ownerId !== context.user.id) {
    return apiError("Background not found", 404);
  }

  const body = await parseBody<z.infer<typeof updateSchema>>(request);
  if (!body) return apiError("Invalid request body", 400);

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return apiError("Validation failed", 400);

  const updated = await db.background.update({
    where: { id },
    data: parsed.data,
  });

  return apiSuccess({ id: updated.id, name: updated.name, isEnabled: updated.isEnabled });
});

export const DELETE = withAuth<Params>(async (request, context, routeContext) => {
  const { id } = await routeContext.params;

  const background = await db.background.findUnique({ where: { id } });
  if (!background) return apiError("Background not found", 404);
  if (!background.eventId) return apiError("Cannot delete default backgrounds", 403);
  if (background.isDefault) return apiError("Cannot delete default backgrounds", 403);

  const event = await db.event.findUnique({
    where: { id: background.eventId },
    include: { business: { select: { ownerId: true } } },
  });
  if (!event || event.business.ownerId !== context.user.id) {
    return apiError("Background not found", 404);
  }

  await db.background.delete({ where: { id } });
  await deleteFromR2(background.r2Key);
  if (background.previewKey) await deleteFromR2(background.previewKey);

  return apiSuccess({ deleted: true });
});

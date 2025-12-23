import { NextRequest } from "next/server";
import { withAuth, apiSuccess, apiError, validateEventAccess, getPaginationParams, type RouteContext } from "@/lib/api-middleware";
import { uploadToR2, r2Keys } from "@/lib/r2";
import { removeBackground } from "@/lib/bgremover";
import db from "@/lib/db";

type Params = { id: string };

export const GET = withAuth<Params>(async (request, context, routeContext) => {
  const { id } = await routeContext.params;
  const { hasAccess } = await validateEventAccess(context.user.id, id);
  if (!hasAccess) return apiError("Event not found", 404);

  const url = new URL(request.url);
  const sessionId = url.searchParams.get("sessionId");
  const { page, pageSize, skip } = getPaginationParams(request);

  const where: Record<string, unknown> = { eventId: id };
  if (sessionId) where.sessionId = sessionId;

  const r2BaseUrl = process.env.R2_PUBLIC_BASE_URL;
  const [photos, total] = await Promise.all([
    db.photo.findMany({
      where,
      include: { session: { select: { email: true, name: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    db.photo.count({ where }),
  ]);

  return apiSuccess({
    items: photos.map((p) => ({
      id: p.id, originalName: p.originalName, originalUrl: `${r2BaseUrl}/${p.originalKey}`,
      cutoutUrl: p.cutoutKey ? `${r2BaseUrl}/${p.cutoutKey}` : null, session: p.session, createdAt: p.createdAt,
    })),
    total, page, pageSize, hasMore: skip + photos.length < total,
  });
});

export const POST = withAuth<Params>(async (request, context, routeContext) => {
  const { id } = await routeContext.params;
  const { hasAccess, role } = await validateEventAccess(context.user.id, id);
  if (!hasAccess) return apiError("Event not found", 404);

  const event = await db.event.findUnique({
    where: { id },
    select: { id: true, status: true, photoCap: true, photoUsed: true, backgroundRemovalEnabled: true },
  });

  if (!event) return apiError("Event not found", 404);
  if (event.status !== "LIVE") return apiError("Event is not active", 400);

  const formData = await request.formData();
  const sessionId = formData.get("sessionId") as string;
  const files = formData.getAll("photos") as File[];

  if (!sessionId) return apiError("Session ID required", 400);
  if (files.length === 0) return apiError("No photos provided", 400);

  const session = await db.guestSession.findFirst({ where: { id: sessionId, eventId: id } });
  if (!session) return apiError("Session not found", 404);

  const photosRemaining = event.photoCap - event.photoUsed;
  if (files.length > photosRemaining) return apiError(`Only ${photosRemaining} photos remaining`, 400);

  const results: Array<{ id: string; originalName: string; success: boolean }> = [];

  for (const file of files) {
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const originalName = file.name || `photo-${Date.now()}.jpg`;
      const originalKey = r2Keys.photo(id, sessionId, `original-${Date.now()}`);

      await uploadToR2({ key: originalKey, body: buffer, contentType: file.type || "image/jpeg" });

      let cutoutKey: string | null = null;
      if (event.backgroundRemovalEnabled) {
        try {
          const cutoutBuffer = await removeBackground(buffer);
          if (cutoutBuffer) {
            cutoutKey = r2Keys.photo(id, sessionId, `cutout-${Date.now()}`);
            await uploadToR2({ key: cutoutKey, body: cutoutBuffer, contentType: "image/png" });
          }
        } catch (e) { console.error("BG removal failed:", e); }
      }

      const photo = await db.photo.create({
        data: { eventId: id, sessionId, originalName, originalKey, cutoutKey, uploadedBy: role !== "owner" ? context.user.id : null },
      });

      results.push({ id: photo.id, originalName, success: true });
    } catch (e) {
      results.push({ id: "", originalName: file.name || "unknown", success: false });
    }
  }

  const successCount = results.filter((r) => r.success).length;
  if (successCount > 0) {
    await db.event.update({ where: { id }, data: { photoUsed: { increment: successCount } } });
  }

  return apiSuccess({ uploaded: successCount, failed: results.length - successCount, results });
});

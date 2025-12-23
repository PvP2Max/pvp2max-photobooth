import { NextRequest } from "next/server";
import { apiSuccess, apiError, parseBody } from "@/lib/api-middleware";
import { composeImage } from "@/lib/compositor";
import { applyWatermark } from "@/lib/watermark";
import { uploadToR2, fetchFromR2, r2Keys } from "@/lib/r2";
import { sendPhotosEmail } from "@/lib/email";
import db from "@/lib/db";
import { z } from "zod";
import { v4 as uuid } from "uuid";

type RouteParams = Promise<{ id: string }>;

const deliverSchema = z.object({
  email: z.string().email(),
  sessionId: z.string().optional(),
  selections: z.array(z.object({
    photoId: z.string(),
    backgroundId: z.string().nullable().optional(),
    transform: z.object({ scale: z.number().default(1), offsetX: z.number().default(0), offsetY: z.number().default(0) }).optional(),
  })),
});

export async function POST(request: NextRequest, { params }: { params: RouteParams }) {
  const { id } = await params;

  const event = await db.event.findUnique({
    where: { id },
    select: { id: true, name: true, plan: true, status: true, backgroundRemovalEnabled: true },
  });

  if (!event) return apiError("Event not found", 404);
  if (event.status !== "LIVE") return apiError("Event is not active", 400);

  const body = await parseBody<z.infer<typeof deliverSchema>>(request);
  if (!body) return apiError("Invalid request body", 400);

  const parsed = deliverSchema.safeParse(body);
  if (!parsed.success) return apiError("Validation failed", 400);

  const { email, sessionId, selections } = parsed.data;
  if (selections.length === 0) return apiError("No photos selected", 400);

  const r2BaseUrl = process.env.R2_PUBLIC_BASE_URL;
  const compositeUrls: string[] = [];
  const attachments: Array<{ filename: string; r2Key: string; contentType: string; size: number }> = [];

  for (const selection of selections) {
    const photo = await db.photo.findUnique({ where: { id: selection.photoId } });
    if (!photo || photo.eventId !== id) continue;

    const sourceKey = event.backgroundRemovalEnabled && photo.cutoutKey ? photo.cutoutKey : photo.originalKey;
    const { buffer: photoBuffer } = await fetchFromR2(sourceKey);

    let finalBuffer: Buffer;
    let filename: string;

    if (selection.backgroundId && event.backgroundRemovalEnabled && photo.cutoutKey) {
      const background = await db.background.findUnique({ where: { id: selection.backgroundId } });
      if (background) {
        const { buffer: bgBuffer } = await fetchFromR2(background.r2Key);
        finalBuffer = await composeImage({ foreground: photoBuffer, background: bgBuffer, transform: selection.transform });
        filename = `${photo.originalName.replace(/\.[^.]+$/, "")}-composed.png`;
      } else {
        finalBuffer = photoBuffer;
        filename = photo.originalName;
      }
    } else {
      finalBuffer = photoBuffer;
      filename = photo.originalName;
    }

    if (event.plan === "FREE") {
      finalBuffer = await applyWatermark(finalBuffer);
    }

    const compositeKey = r2Keys.composite(id, `${selection.photoId}-${Date.now()}`);
    await uploadToR2({ key: compositeKey, body: finalBuffer, contentType: "image/png" });

    compositeUrls.push(`${r2BaseUrl}/${compositeKey}`);
    attachments.push({ filename, r2Key: compositeKey, contentType: "image/png", size: finalBuffer.length });
  }

  if (attachments.length === 0) return apiError("No valid photos", 400);

  const downloadToken = uuid();
  const production = await db.production.create({
    data: {
      eventId: id, email, sessionId: sessionId || null, downloadToken,
      tokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      attachments: { create: attachments.map((a) => ({ filename: a.filename, r2Key: a.r2Key, contentType: a.contentType, size: a.size })) },
    },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  await sendPhotosEmail({ to: email, eventName: event.name, photoCount: attachments.length, downloadUrl: `${appUrl}/download/${downloadToken}`, thumbnailUrls: compositeUrls.slice(0, 4) });

  return apiSuccess({ productionId: production.id, downloadToken, photoCount: attachments.length, email });
}

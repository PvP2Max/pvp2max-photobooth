import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api-middleware";
import db from "@/lib/db";

type RouteParams = Promise<{ id: string }>;

export async function GET(request: NextRequest, { params }: { params: RouteParams }) {
  const { id } = await params;

  const session = await db.guestSession.findUnique({
    where: { id },
    include: {
      event: { select: { id: true, status: true, backgroundRemovalEnabled: true } },
      photos: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!session) return apiError("Session not found", 404);
  if (session.event.status !== "LIVE") return apiError("Event not active", 400);

  const r2BaseUrl = process.env.R2_PUBLIC_BASE_URL;

  return apiSuccess({
    sessionId: session.id,
    email: session.email,
    name: session.name,
    backgroundRemovalEnabled: session.event.backgroundRemovalEnabled,
    photos: session.photos.map((p) => ({
      id: p.id,
      originalName: p.originalName,
      originalUrl: `${r2BaseUrl}/${p.originalKey}`,
      cutoutUrl: p.cutoutKey ? `${r2BaseUrl}/${p.cutoutKey}` : null,
      createdAt: p.createdAt,
    })),
  });
}

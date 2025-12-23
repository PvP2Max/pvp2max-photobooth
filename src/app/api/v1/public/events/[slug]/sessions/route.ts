import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api-middleware";
import db from "@/lib/db";

type RouteParams = Promise<{ slug: string }>;

export async function GET(request: NextRequest, { params }: { params: RouteParams }) {
  const { slug } = await params;
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");

  const event = await db.event.findFirst({
    where: { slug, status: "LIVE" },
    select: { id: true, mode: true },
  });

  if (!event) return apiError("Event not found", 404);
  if (event.mode !== "PHOTOGRAPHER") return apiError("Not in photographer mode", 400);

  const where: Record<string, unknown> = { eventId: event.id };
  if (email) where.email = email;

  const sessions = await db.guestSession.findMany({
    where,
    include: { _count: { select: { photos: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return apiSuccess({
    items: sessions.map((s) => ({
      id: s.id, email: s.email, name: s.name,
      photoCount: s._count.photos, createdAt: s.createdAt,
    })),
  });
}

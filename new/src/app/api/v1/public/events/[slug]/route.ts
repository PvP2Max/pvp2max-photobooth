import { NextRequest } from "next/server";
import { apiSuccess, apiError, parseBody } from "@/lib/api-middleware";
import db from "@/lib/db";
import { z } from "zod";

type RouteParams = Promise<{ slug: string }>;

export async function GET(request: NextRequest, { params }: { params: RouteParams }) {
  const { slug } = await params;

  const event = await db.event.findFirst({
    where: { slug, status: "LIVE" },
    select: {
      id: true, name: true, slug: true, mode: true, plan: true,
      backgroundRemovalEnabled: true,
      business: { select: { name: true } },
    },
  });

  if (!event) return apiError("Event not found", 404);

  const r2BaseUrl = process.env.R2_PUBLIC_BASE_URL;
  const backgrounds = await db.background.findMany({
    where: {
      OR: [
        { eventId: event.id, isEnabled: true },
        { eventId: null, isDefault: true, isEnabled: true },
      ],
    },
    orderBy: [{ isDefault: "asc" }, { createdAt: "desc" }],
  });

  return apiSuccess({
    id: event.id,
    name: event.name,
    slug: event.slug,
    mode: event.mode,
    businessName: event.business.name,
    backgroundRemovalEnabled: event.backgroundRemovalEnabled,
    backgrounds: backgrounds.map((bg) => ({
      id: bg.id, name: bg.name, category: bg.category,
      url: `${r2BaseUrl}/${bg.r2Key}`,
      previewUrl: bg.previewKey ? `${r2BaseUrl}/${bg.previewKey}` : null,
    })),
  });
}

const checkinSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
});

export async function POST(request: NextRequest, { params }: { params: RouteParams }) {
  const { slug } = await params;

  const event = await db.event.findFirst({
    where: { slug, status: "LIVE" },
    select: { id: true, name: true, mode: true },
  });

  if (!event) return apiError("Event not found", 404);

  const body = await parseBody<z.infer<typeof checkinSchema>>(request);
  if (!body) return apiError("Invalid request body", 400);

  const parsed = checkinSchema.safeParse(body);
  if (!parsed.success) return apiError("Valid email required", 400);

  const { email, name } = parsed.data;

  const session = await db.guestSession.create({
    data: { eventId: event.id, email, name },
  });

  return apiSuccess({
    sessionId: session.id,
    eventId: event.id,
    eventName: event.name,
    mode: event.mode,
  }, 201);
}

import { NextRequest } from "next/server";
import { withAuth, apiSuccess, apiError, parseBody } from "@/lib/api-middleware";
import { slugify } from "@/lib/utils";
import db from "@/lib/db";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).optional(),
});

export const GET = withAuth(async (request, context) => {
  const businesses = await db.business.findMany({
    where: { ownerId: context.user.id },
    include: { _count: { select: { events: true } } },
    orderBy: { createdAt: "desc" },
  });

  return apiSuccess({
    items: businesses.map((b) => ({
      id: b.id, name: b.name, slug: b.slug, eventCount: b._count.events, createdAt: b.createdAt,
    })),
  });
});

export const POST = withAuth(async (request, context) => {
  const body = await parseBody<z.infer<typeof createSchema>>(request);
  if (!body) return apiError("Invalid request body", 400);

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message || "Validation failed", 400);

  const slug = parsed.data.slug || slugify(parsed.data.name);

  const existing = await db.business.findUnique({ where: { slug } });
  if (existing) return apiError("Business slug already taken", 409);

  const business = await db.business.create({
    data: { name: parsed.data.name, slug, ownerId: context.user.id },
  });

  return apiSuccess({ id: business.id, name: business.name, slug: business.slug }, 201);
});

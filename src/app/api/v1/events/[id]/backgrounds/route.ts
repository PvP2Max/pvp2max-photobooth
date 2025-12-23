import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api-middleware";
import { uploadToR2, r2Keys } from "@/lib/r2";
import db from "@/lib/db";

type RouteParams = Promise<{ id: string }>;

export async function GET(request: NextRequest, { params }: { params: RouteParams }) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const includeAll = searchParams.get("all") === "true";

  const event = await db.event.findUnique({ where: { id }, select: { id: true } });
  if (!event) return apiError("Event not found", 404);

  const r2BaseUrl = process.env.R2_PUBLIC_BASE_URL;

  const backgrounds = await db.background.findMany({
    where: includeAll
      ? { OR: [{ eventId: id }, { eventId: null, isDefault: true }] }
      : { OR: [{ eventId: id, isEnabled: true }, { eventId: null, isDefault: true, isEnabled: true }] },
    orderBy: [{ isDefault: "asc" }, { createdAt: "desc" }],
  });

  return apiSuccess({
    items: backgrounds.map((bg) => ({
      id: bg.id, name: bg.name, description: bg.description, category: bg.category,
      url: `${r2BaseUrl}/${bg.r2Key}`, previewUrl: bg.previewKey ? `${r2BaseUrl}/${bg.previewKey}` : null,
      isDefault: bg.isDefault, isAiGenerated: bg.isAiGenerated, isEnabled: bg.isEnabled,
    })),
  });
}

export async function POST(request: NextRequest, { params }: { params: RouteParams }) {
  const { id } = await params;

  const event = await db.event.findUnique({
    where: { id },
    include: { business: { select: { ownerId: true } }, _count: { select: { backgrounds: true } } },
  });

  if (!event) return apiError("Event not found", 404);
  if (event._count.backgrounds >= 10) return apiError("Maximum 10 custom backgrounds", 400);

  const formData = await request.formData();
  const file = formData.get("file") as File;
  const name = formData.get("name") as string;
  const category = (formData.get("category") as string) || "BACKGROUND";

  if (!file || !name) return apiError("File and name required", 400);

  const buffer = Buffer.from(await file.arrayBuffer());
  const r2Key = r2Keys.background(id, `custom-${Date.now()}`);

  await uploadToR2({ key: r2Key, body: buffer, contentType: file.type || "image/jpeg" });

  const background = await db.background.create({
    data: { eventId: id, name, category: category === "FRAME" ? "FRAME" : "BACKGROUND", r2Key, isDefault: false, isAiGenerated: false, isEnabled: true },
  });

  const r2BaseUrl = process.env.R2_PUBLIC_BASE_URL;
  return apiSuccess({ id: background.id, name: background.name, url: `${r2BaseUrl}/${r2Key}` }, 201);
}

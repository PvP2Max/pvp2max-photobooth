import { NextRequest } from "next/server";
import { withAuth, apiSuccess, apiError, parseBody, validateEventAccess, type RouteContext } from "@/lib/api-middleware";
import { generateBackground, backgroundPromptSuggestions, type GenerationStyle } from "@/lib/stability";
import { uploadToR2, r2Keys } from "@/lib/r2";
import db from "@/lib/db";
import { z } from "zod";

type Params = { id: string };

const generateSchema = z.object({
  prompt: z.string().min(10).max(500),
  style: z.enum(["photographic", "digital-art", "fantasy-art", "neon-punk", "anime", "cinematic", "3d-model", "pixel-art"]).default("photographic"),
  name: z.string().min(1).max(100).optional(),
});

export const POST = withAuth<Params>(async (request, context, routeContext) => {
  const { id } = await routeContext.params;
  const { hasAccess, role } = await validateEventAccess(context.user.id, id);
  if (!hasAccess) return apiError("Event not found", 404);
  if (role !== "owner") return apiError("Only owner can generate AI backgrounds", 403);

  const event = await db.event.findUnique({
    where: { id },
    select: { id: true, aiCredits: true, aiUsed: true },
  });

  if (!event) return apiError("Event not found", 404);
  if (event.aiCredits <= 0) return apiError("AI backgrounds not available on this plan", 400);
  if (event.aiUsed >= event.aiCredits) return apiError("No AI credits remaining", 400);

  const body = await parseBody<z.infer<typeof generateSchema>>(request);
  if (!body) return apiError("Invalid request body", 400);

  const parsed = generateSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message || "Validation failed", 400);

  const { prompt, style, name } = parsed.data;

  const result = await generateBackground({ prompt, style: style as GenerationStyle, width: 1920, height: 1080 });
  if (!result.success || !result.buffer) return apiError(result.error || "Failed to generate", 500);

  const backgroundId = `ai-${Date.now()}-${result.seed || "0"}`;
  const r2Key = r2Keys.aiBackground(id, backgroundId);

  await uploadToR2({ key: r2Key, body: result.buffer, contentType: "image/png" });

  const background = await db.background.create({
    data: {
      eventId: id, name: name || `AI: ${prompt.substring(0, 50)}...`,
      description: `Generated with: "${prompt}" (style: ${style})`,
      category: "BACKGROUND", r2Key, isDefault: false, isAiGenerated: true, isEnabled: true,
    },
  });

  await db.event.update({ where: { id }, data: { aiUsed: { increment: 1 } } });

  const r2BaseUrl = process.env.R2_PUBLIC_BASE_URL;
  return apiSuccess({ id: background.id, name: background.name, url: `${r2BaseUrl}/${r2Key}`, seed: result.seed, creditsRemaining: event.aiCredits - event.aiUsed - 1 }, 201);
});

export const GET = withAuth<Params>(async (request, context, routeContext) => {
  const { id } = await routeContext.params;
  const { hasAccess } = await validateEventAccess(context.user.id, id);
  if (!hasAccess) return apiError("Event not found", 404);

  const event = await db.event.findUnique({ where: { id }, select: { aiCredits: true, aiUsed: true } });
  if (!event) return apiError("Event not found", 404);

  return apiSuccess({
    available: event.aiCredits > 0,
    creditsRemaining: Math.max(0, event.aiCredits - event.aiUsed),
    totalCredits: event.aiCredits,
    suggestions: backgroundPromptSuggestions,
    styles: [
      { id: "photographic", name: "Photographic", description: "Realistic photos" },
      { id: "digital-art", name: "Digital Art", description: "Modern digital artwork" },
      { id: "fantasy-art", name: "Fantasy Art", description: "Magical scenes" },
      { id: "cinematic", name: "Cinematic", description: "Movie-like lighting" },
      { id: "anime", name: "Anime", description: "Japanese animation" },
      { id: "neon-punk", name: "Neon Punk", description: "Cyberpunk neon" },
      { id: "3d-model", name: "3D Render", description: "3D graphics" },
      { id: "pixel-art", name: "Pixel Art", description: "Retro pixels" },
    ],
  });
});

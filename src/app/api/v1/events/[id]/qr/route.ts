import { NextRequest, NextResponse } from "next/server";
import { withAuth, apiError, validateEventAccess, type RouteContext } from "@/lib/api-middleware";
import QRCode from "qrcode";

type Params = { id: string };

export const GET = withAuth<Params>(async (request, context, routeContext) => {
  const { id } = await routeContext.params;
  const { hasAccess } = await validateEventAccess(context.user.id, id);
  if (!hasAccess) return apiError("Event not found", 404);

  const event = await (await import("@/lib/db")).default.event.findUnique({
    where: { id },
    include: { business: { select: { slug: true } } },
  });

  if (!event) return apiError("Event not found", 404);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const boothUrl = `${appUrl}/booth/${event.slug}`;

  const png = await QRCode.toBuffer(boothUrl, { type: "png", width: 400, margin: 2 });

  return new NextResponse(new Uint8Array(png), {
    headers: { "Content-Type": "image/png", "Content-Disposition": `inline; filename="${event.slug}-qr.png"` },
  });
});

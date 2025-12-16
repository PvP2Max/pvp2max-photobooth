import { NextRequest, NextResponse } from "next/server";
import archiver from "archiver";
import { listProduction, getProductionAttachment, purgeExpiredProduction, findProductionById } from "@/lib/production";
import { eventUsage, getEventContext, isAdminRequest } from "@/lib/tenants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { context, error, status } = await getEventContext(request);
  if (!context) {
    return NextResponse.json(
      { error: error ?? "Event scope is required for archive downloads." },
      { status: status ?? 401 },
    );
  }
  if (!context.roles.owner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const usage = eventUsage(context.event);
  if (!usage.galleryZipEnabled && !isAdminRequest(request)) {
    return NextResponse.json(
      { error: "Archive download is only available on paid plans. Upgrade to enable." },
      { status: 403 },
    );
  }

  await purgeExpiredProduction(context.scope);

  const id = request.nextUrl.searchParams.get("id");

  // Single production archive
  if (id) {
    const production = await findProductionById(context.scope, id);
    if (!production) {
      return NextResponse.json({ error: "Production not found" }, { status: 404 });
    }

    const archive = archiver("zip", { zlib: { level: 6 } });
    const chunks: Buffer[] = [];

    archive.on("data", (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });

    // Add all attachments from the production
    for (const attachment of production.attachments) {
      const file = await getProductionAttachment(context.scope, id, attachment.filename);
      if (file) {
        archive.append(file.buffer, { name: attachment.filename });
      }
    }

    await archive.finalize();

    const buffer = Buffer.concat(chunks);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="photobooth-${id}.zip"`,
        "Cache-Control": "no-store",
      },
    });
  }

  // All productions archive
  const productions = await listProduction(context.scope);

  const archive = archiver("zip", { zlib: { level: 6 } });
  const chunks: Buffer[] = [];

  archive.on("data", (chunk) => {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  });

  for (const production of productions) {
    for (const attachment of production.attachments) {
      const file = await getProductionAttachment(context.scope, production.id, attachment.filename);
      if (file) {
        // Organize by production ID to avoid filename conflicts
        archive.append(file.buffer, { name: `${production.id}/${attachment.filename}` });
      }
    }
  }

  await archive.finalize();

  const buffer = Buffer.concat(chunks);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": 'attachment; filename="photobooth-production.zip"',
      "Cache-Control": "no-store",
    },
  });
}

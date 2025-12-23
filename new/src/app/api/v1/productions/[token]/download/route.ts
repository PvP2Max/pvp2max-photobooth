import { NextRequest, NextResponse } from "next/server";
import { fetchFromR2 } from "@/lib/r2";
import db from "@/lib/db";
import archiver from "archiver";

type RouteParams = Promise<{ token: string }>;

export async function GET(request: NextRequest, { params }: { params: RouteParams }) {
  const { token } = await params;

  const production = await db.production.findUnique({
    where: { downloadToken: token },
    include: {
      attachments: true,
      event: { select: { name: true } },
    },
  });

  if (!production) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (production.tokenExpiresAt < new Date()) {
    return NextResponse.json({ error: "Download link expired" }, { status: 410 });
  }

  await db.production.update({
    where: { id: production.id },
    data: { downloadCount: { increment: 1 } },
  });

  if (production.attachments.length === 1) {
    const attachment = production.attachments[0];
    const { buffer, contentType } = await fetchFromR2(attachment.r2Key);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType || attachment.contentType,
        "Content-Disposition": `attachment; filename="${attachment.filename}"`,
        "Content-Length": buffer.length.toString(),
      },
    });
  }

  const chunks: Buffer[] = [];
  const archive = archiver("zip", { zlib: { level: 5 } });

  archive.on("data", (chunk) => chunks.push(chunk));

  for (const attachment of production.attachments) {
    try {
      const { buffer } = await fetchFromR2(attachment.r2Key);
      archive.append(buffer, { name: attachment.filename });
    } catch (e) {
      console.error(`Failed to fetch ${attachment.r2Key}:`, e);
    }
  }

  await archive.finalize();

  const zipBuffer = Buffer.concat(chunks);
  const zipFilename = `${production.event.name.replace(/[^a-zA-Z0-9]/g, "-")}-photos.zip`;

  return new NextResponse(new Uint8Array(zipBuffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${zipFilename}"`,
      "Content-Length": zipBuffer.length.toString(),
    },
  });
}

import { spawn } from "node:child_process";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { productionRoot, purgeExpiredProduction } from "@/lib/production";
import { eventUsage, getEventContext, isAdminRequest } from "@/lib/tenants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { context, error, status } = await getEventContext(request, { allowUnauthedHeader: true });
  if (!context) {
    return NextResponse.json(
      { error: error ?? "Event scope is required for archive downloads." },
      { status: status ?? 401 },
    );
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
  const root = productionRoot(context.scope);
  if (id) {
    const recordRoot = path.join(root, id);
    const parentDir = path.dirname(recordRoot);
    const folderName = path.basename(recordRoot);
    const tar = spawn("tar", ["-czf", "-", folderName], { cwd: parentDir });
    return new NextResponse(tar.stdout as unknown as ReadableStream, {
      headers: {
        "Content-Type": "application/gzip",
        "Content-Disposition": `attachment; filename="photobooth-${id}.tar.gz"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const parentDir = path.dirname(root);
  const folderName = path.basename(root);

  const tar = spawn("tar", ["-czf", "-", folderName], { cwd: parentDir });

  return new NextResponse(tar.stdout as unknown as ReadableStream, {
    headers: {
      "Content-Type": "application/gzip",
      "Content-Disposition": 'attachment; filename="photobooth-production.tar.gz"',
      "Cache-Control": "no-store",
    },
  });
}

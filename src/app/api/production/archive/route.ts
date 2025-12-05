import { spawn } from "node:child_process";
import { NextRequest, NextResponse } from "next/server";
import { productionRoot } from "@/lib/production";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOKEN = "ArcticAuraDesigns";

function authorized(request: NextRequest) {
  const header = request.headers.get("x-admin-token");
  const query = request.nextUrl.searchParams.get("token");
  return header === TOKEN || query === TOKEN;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Stream a tar.gz of the production directory
  const root = productionRoot();
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

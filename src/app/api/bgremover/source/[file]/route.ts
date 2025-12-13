import { createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TEMP_UPLOAD_DIR = path.join(process.cwd(), "storage", "tmp", "bgremover");

function resolveServiceToken() {
  return process.env.BGREMOVER_SERVICE_TOKEN ?? process.env.SERVICE_API_TOKEN;
}

function signUpload(name: string, secret: string) {
  return createHmac("sha256", secret).update(name).digest("hex");
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ file: string }> },
) {
  const token = request.nextUrl.searchParams.get("token") || "";
  const secret = resolveServiceToken();

  if (!secret) {
    return NextResponse.json(
      { error: "Service token is not configured" },
      { status: 500 },
    );
  }

  const { file } = await context.params;
  const safeName = path.basename(file);
  const expected = signUpload(safeName, secret);

  if (!token || token !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const filePath = path.join(TEMP_UPLOAD_DIR, safeName);
  const metaPath = `${filePath}.json`;

  try {
    const [buffer, metaRaw] = await Promise.all([
      readFile(filePath),
      readFile(metaPath, "utf8").catch(() => null),
    ]);

    let contentType = "application/octet-stream";
    if (metaRaw) {
      try {
        const parsed = JSON.parse(metaRaw) as { contentType?: string };
        if (parsed.contentType) {
          contentType = parsed.contentType;
        }
      } catch {
        // ignore parse errors; fall back to default content type
      }
    }

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

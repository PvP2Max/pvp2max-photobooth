import { NextRequest, NextResponse } from "next/server";
import { addCheckin, listCheckins } from "@/lib/checkins";
import { getEventContext } from "@/lib/tenants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { context, error, status } = await getEventContext(request);
  if (!context) {
    return NextResponse.json({ error: error ?? "Unauthorized" }, { status: status ?? 401 });
  }
  const checkins = await listCheckins(context.scope);
  return NextResponse.json({ checkins });
}

export async function POST(request: NextRequest) {
  const { context, error, status } = await getEventContext(request);
  if (!context) {
    return NextResponse.json({ error: error ?? "Unauthorized" }, { status: status ?? 401 });
  }
  const body = (await request.json().catch(() => null)) as
    | { name?: string; email?: string }
    | null;
  const name = (body?.name || "").toString().trim();
  const email = (body?.email || "").toString().trim();

  if (!name) {
    return NextResponse.json(
      { error: "Name is required to check in." },
      { status: 400 },
    );
  }

  if (!email) {
    return NextResponse.json(
      { error: "Email is required to check in." },
      { status: 400 },
    );
  }

  try {
    const checkin = await addCheckin(context.scope, { name, email });
    return NextResponse.json({ checkin });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to save check-in", detail: message },
      { status: 500 },
    );
  }
}

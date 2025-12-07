import { NextRequest, NextResponse } from "next/server";
import { getBusinessContext, sanitizeEvent, updateEventStatus } from "@/lib/tenants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } },
) {
  const session = await getBusinessContext(request);
  if (!session?.business) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await request.json().catch(() => ({}))) as { status?: string };
  if (!body.status || !["live", "draft", "closed"].includes(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  try {
    const updated = await updateEventStatus(
      session.business.id,
      params.eventId,
      body.status as "live" | "draft" | "closed",
    );
    return NextResponse.json({ event: sanitizeEvent(updated) });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to update status.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

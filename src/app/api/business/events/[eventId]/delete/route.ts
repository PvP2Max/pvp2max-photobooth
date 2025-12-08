import { NextRequest, NextResponse } from "next/server";
import { deleteEventById, getBusinessContext, sanitizeBusiness, sanitizeEvent } from "@/lib/tenants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const session = await getBusinessContext(request);
  if (!session?.business) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { eventId } = await params;
  const deleted = await deleteEventById(session.business.id, eventId);
  if (!deleted) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const filtered = session.business.events.filter((e) => e.id !== eventId);
  return NextResponse.json({
    business: sanitizeBusiness(session.business),
    events: filtered.map(sanitizeEvent),
    status: "deleted",
  });
}

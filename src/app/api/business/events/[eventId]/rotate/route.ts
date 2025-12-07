import { NextRequest, NextResponse } from "next/server";
import { getBusinessContext, rotateEventAccess, sanitizeEvent } from "@/lib/tenants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ eventId: string }> },
) {
  const session = await getBusinessContext(request);
  if (!session?.business) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { eventId } = await context.params;
  if (!eventId) {
    return NextResponse.json({ error: "Missing event id" }, { status: 400 });
  }
  try {
    const { event, accessCode } = await rotateEventAccess(session.business.id, eventId);
    return NextResponse.json({ event: sanitizeEvent(event), accessCode });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to rotate key.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

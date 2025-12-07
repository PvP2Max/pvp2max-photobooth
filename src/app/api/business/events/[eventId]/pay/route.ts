import { NextRequest, NextResponse } from "next/server";
import { getBusinessContext, sanitizeEvent, updateEventConfig } from "@/lib/tenants";

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
  const { status } = (await request.json().catch(() => ({}))) as { status?: "paid" | "pending" | "unpaid" };
  const paymentStatus = status ?? "paid";
  const eventId = (await context.params).eventId;
  try {
    const updated = await updateEventConfig(session.business.id, eventId, { paymentStatus });
    return NextResponse.json({ event: sanitizeEvent(updated) });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to update payment status.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

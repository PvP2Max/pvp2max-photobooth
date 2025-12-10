import { NextRequest, NextResponse } from "next/server";
import { deleteEventById, getBusinessContext } from "@/lib/tenants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const context = await getBusinessContext(request);
  if (!context?.business) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { eventId?: string } | null;
  const eventId = body?.eventId?.toString();
  if (!eventId) {
    return NextResponse.json({ error: "eventId is required." }, { status: 400 });
  }

  const ok = await deleteEventById(context.business.id, eventId);
  if (!ok) return NextResponse.json({ error: "Event not found." }, { status: 404 });

  return NextResponse.json({ status: "deleted" });
}

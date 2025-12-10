import { NextRequest, NextResponse } from "next/server";
import { getBusinessContext, updateEventStatus } from "@/lib/tenants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const context = await getBusinessContext(request);
  if (!context?.business) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { eventSlug?: string; status?: "live" | "closed" | "draft" }
    | null;
  const eventSlug = body?.eventSlug?.toString().trim();
  const status = body?.status;
  if (!eventSlug || !status) {
    return NextResponse.json({ error: "eventSlug and status are required." }, { status: 400 });
  }

  const updated = await updateEventStatus({
    businessId: context.business.id,
    eventSlug,
    status,
  });
  if (!updated) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  return NextResponse.json({ event: updated });
}

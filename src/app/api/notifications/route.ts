import { NextRequest, NextResponse } from "next/server";
import { popNotifications } from "@/lib/notifications";
import { getEventContext } from "@/lib/tenants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { context, error, status } = await getEventContext(request);
  if (!context) {
    return NextResponse.json({ error: error ?? "Unauthorized" }, { status: status ?? 401 });
  }
  const items = await popNotifications(context.scope);
  return NextResponse.json({ notifications: items });
}

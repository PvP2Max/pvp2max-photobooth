import { NextResponse } from "next/server";
import { popNotifications } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const items = await popNotifications();
  return NextResponse.json({ notifications: items });
}

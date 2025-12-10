import { NextRequest, NextResponse } from "next/server";
import { getBusinessContext, updateUserPasswordById } from "@/lib/tenants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const context = await getBusinessContext(request);
  if (!context?.user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const body = (await request.json().catch(() => ({}))) as {
    currentPassword?: string;
    newPassword?: string;
  };
  const currentPassword = body.currentPassword?.toString() ?? "";
  const newPassword = body.newPassword?.toString() ?? "";
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "Current and new passwords are required." }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: "New password must be at least 8 characters." }, { status: 400 });
  }
  try {
    const user = await updateUserPasswordById(context.user.id, currentPassword, newPassword);
    return NextResponse.json({ user: { id: user.id, email: user.email }, status: "ok" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update password.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

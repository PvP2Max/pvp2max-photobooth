import { NextRequest, NextResponse } from "next/server";
import { createSelectionToken } from "@/lib/selections";
import { sendMail } from "@/lib/mailer";
import { getEventContext } from "@/lib/tenants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const { context, error, status } = await getEventContext(request, { allowUnauthedHeader: true });
  if (!context) {
    return NextResponse.json({ error: error ?? "Unauthorized" }, { status: status ?? 401 });
  }
  const body = (await request.json().catch(() => ({}))) as { email?: string; sendEmail?: boolean };
  const email = body.email?.toString().trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }
  const token = await createSelectionToken(context.scope, email);
  const baseUrl = process.env.APP_BASE_URL || request.headers.get("origin") || "";
  const shareUrl = `${baseUrl}/select/${token.token}?business=${context.scope.businessSlug}&event=${context.scope.eventSlug}`;

  let emailed: boolean | undefined;
  if (body.sendEmail !== false) {
    try {
      const html = `
        <div style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;padding:22px;background:#0f172a;">
          <div style="max-width:640px;margin:0 auto;border:1px solid rgba(255,255,255,0.08);border-radius:18px;overflow:hidden;background:#0b1022;">
            <div style="padding:22px 24px;">
              <p style="margin:0 0 6px;color:#67e8f9;letter-spacing:0.18em;font-size:11px;text-transform:uppercase;">${context.business.name}</p>
              <h1 style="margin:0 0 10px;color:#fff;font-size:22px;">Choose your photos from ${context.event.name}</h1>
              <p style="margin:0 0 12px;color:#cbd5e1;font-size:13px;line-height:1.5;">
                Tap the button below to view the photos your photographer uploaded. Pick your favorites and they will be delivered automatically.
              </p>
              <div style="margin:14px 0;">
                <a href="${shareUrl}" style="display:inline-flex;padding:12px 18px;background:#9b5cff;color:#0b1022;font-weight:700;border-radius:12px;text-decoration:none;box-shadow:0 12px 30px rgba(155,92,255,0.32);">Open selection</a>
              </div>
              <p style="margin:0;color:#94a3b8;font-size:12px;">Link will expire in 72 hours. If it stops working, ask your photographer for a fresh link.</p>
            </div>
          </div>
        </div>`;
      const result = await sendMail({
        to: email,
        subject: `Select your photos from ${context.event.name}`,
        html,
        attachments: [],
      });
      emailed = result.delivered;
    } catch (err) {
      console.error("Failed to email selection link", err);
      emailed = false;
    }
  }

  return NextResponse.json({ token: token.token, shareUrl, emailed });
}

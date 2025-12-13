import { NextRequest, NextResponse } from "next/server";
import { findProductionById } from "@/lib/production";
import { sendMail } from "@/lib/mailer";
import { rateLimiter, requestKey } from "@/lib/rate-limit";
import { getBusinessContext, getEventContext, isAdminRequest } from "@/lib/tenants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const isAdmin = isAdminRequest(request);
  const businessSession = await getBusinessContext(request);
  if (!isAdmin && !businessSession?.business) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rate = rateLimiter(`admin-resend-${requestKey(request.headers)}`, 20, 60_000);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const { context, error, status } = await getEventContext(request, {
    allowUnauthedHeader: true,
    allowBusinessSession: true,
  });
  if (!context) {
    return NextResponse.json(
      { error: error ?? "Event scope is required." },
      { status: status ?? 401 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    id?: string;
    email?: string;
  };

  if (!body.id || !body.email) {
    return NextResponse.json(
      { error: "Both id and email are required." },
      { status: 400 },
    );
  }

  try {
    const record = await findProductionById(context.scope, body.id);
    if (!record) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const html = `
  <div style="padding:24px;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <div style="max-width:640px;margin:0 auto;background:#0f172a;border:1px solid rgba(255,255,255,0.08);border-radius:18px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.25);">
      <div style="padding:28px 28px 12px;">
        <p style="letter-spacing:0.2em;text-transform:uppercase;color:#67e8f9;font-size:11px;margin:0 0 8px;">BOSS Holiday Photobooth</p>
        <h1 style="color:#fff;font-size:26px;margin:0 0 12px;">Your photos are ready!</h1>
        <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);border-radius:14px;padding:12px 14px;margin:12px 0;">
          <p style="margin:0;color:#cbd5e1;font-size:13px;">Thank you for using the Better Opportunities for Single Soldiers Holiday Photobooth! Your edited shots are attached to this email, paired with your chosen backgrounds.</p>
        </div>
      </div>
      <div style="padding:22px 28px;">
        <p style="margin:0 0 10px;color:#cbd5e1;font-size:13px;line-height:1.5;">
          If you have any issues opening the files, let us know and we’ll resend them.
        </p>
        <p style="margin:0;color:#cbd5e1;font-size:12px;">
          With gratitude,<br/>BOSS Holiday Photobooth team
        </p>
      </div>
      <div style="background:#0f172a;padding:0 28px 24px;">
        <div style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);border-radius:14px;padding:14px 16px;text-align:center;">
          <span style="color:#e2e8f0;font-size:12px;">Need a photobooth for your next event? </span>
          <a href="https://arcticauradesigns.com" style="color:#67e8f9;text-decoration:none;font-weight:700;">Contact Arctic Aura Designs to book.</a>
        </div>
      </div>
      <div style="background:#0b1022;padding:14px 28px;color:#94a3b8;font-size:11px;border-top:1px solid rgba(255,255,255,0.06);display:flex;justify-content:space-between;align-items:center;">
        <span>© ${new Date().getFullYear()} <a href="https://arcticauradesigns.com" style="color:#67e8f9;text-decoration:none;">Arctic Aura Designs</a></span>
      </div>
    </div>
  </div>
  `;

    const origin =
      request.headers.get("origin") || process.env.APP_BASE_URL || "";
    const baseUrl = origin.replace(/\/$/, "");
    const bundleName = record.bundleFilename || "photos.zip";
    const bundleLink = `${baseUrl}/api/production/files/${record.id}/${encodeURIComponent(
      bundleName,
    )}?token=${record.downloadToken}&business=${context.scope.businessSlug}&event=${context.scope.eventSlug}`;
    const downloadLinks = [
      `<li><a href="${bundleLink}" style="color:#67e8f9;text-decoration:none;">Download all photos (zip)</a></li>`,
    ];

    const htmlWithLinks = html.replace(
      "</ul>",
      downloadLinks.join("") + "</ul>",
    );

    const result = await sendMail({
      to: body.email,
      subject: "Your Photos are Ready! - BOSS Holiday Photobooth (Resent)",
      html: htmlWithLinks,
      attachments: [],
    });

    return NextResponse.json({ status: "ok", delivery: result, downloadLinks });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Production resend failed", { error: message });
    return NextResponse.json(
      { error: "Failed to resend email", detail: message },
      { status: 500 },
    );
  }
}

import { Buffer } from "node:buffer";
import { NextRequest, NextResponse } from "next/server";
import { getBackgroundName } from "@/lib/backgrounds";
import { sendMail } from "@/lib/mailer";
import { findPhotoById, removePhotos } from "@/lib/storage";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

type Selection = {
  photoId: string;
  backgroundId: string;
  compositeDataUrl: string;
};

function parseDataUrl(dataUrl: string) {
  const match = /^data:(.+);base64,(.*)$/.exec(dataUrl);
  if (!match) return null;
  const [, contentType, base64] = match;
  return {
    contentType,
    buffer: Buffer.from(base64, "base64"),
  };
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    clientEmail?: string;
    selections?: Selection[];
  };

  if (!body.clientEmail) {
    return NextResponse.json(
      { error: "Client email is required to send photos." },
      { status: 400 },
    );
  }

  if (!body.selections || body.selections.length === 0) {
    return NextResponse.json(
      { error: "No photo selections were provided." },
      { status: 400 },
    );
  }

  const attachments = [];
  const processedPhotoIds = new Set<string>();

  for (const selection of body.selections) {
    const record = await findPhotoById(selection.photoId);
    if (!record) {
      return NextResponse.json(
        { error: `Photo ${selection.photoId} was not found.` },
        { status: 404 },
      );
    }

    if (!selection.compositeDataUrl) {
      return NextResponse.json(
        {
          error: `Photo ${selection.photoId} missing composed preview payload.`,
        },
        { status: 400 },
      );
    }

    const decoded = parseDataUrl(selection.compositeDataUrl);
    if (!decoded) {
      return NextResponse.json(
        { error: `Could not parse composed image for ${selection.photoId}.` },
        { status: 400 },
      );
    }

    processedPhotoIds.add(selection.photoId);
    const backgroundName = await getBackgroundName(selection.backgroundId);

    attachments.push({
      filename: `${record.originalName.replace(/\.[^.]+$/, "")}-${backgroundName}.png`,
      content: decoded.buffer,
      contentType: decoded.contentType,
    });
  }

  const html = `
  <div style="padding:24px;font-family:Arial,Helvetica,sans-serif;color:#0f172a;background:#f8fafc;">
    <div style="max-width:640px;margin:0 auto;background:#0f172a;border:1px solid rgba(255,255,255,0.08);border-radius:18px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.25);">
      <div style="padding:28px 28px 12px;">
        <p style="letter-spacing:0.2em;text-transform:uppercase;color:#67e8f9;font-size:11px;margin:0 0 8px;">BOSS Holiday Photobooth</p>
        <h1 style="color:#fff;font-size:26px;margin:0 0 12px;">Your photos are ready!</h1>
        <p style="margin:0 0 16px;color:#cbd5e1;font-size:14px;line-height:1.5;">
          Thank you for using the Better Opportunities for Single Soldiers Holiday Photobooth! Your edited shots are attached to this email, paired with your chosen backgrounds.
        </p>
        <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);border-radius:14px;padding:12px 14px;margin:12px 0;">
          <p style="margin:0;color:#cbd5e1;font-size:13px;">Your photos are attached to this email. Open and save them at your convenience.</p>
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
      <div style="background:#0b1022;padding:12px 28px;color:#cbd5e1;font-size:11px;border-top:1px solid rgba(255,255,255,0.05);text-align:center;">
        <span>Need a photobooth for your next event? </span>
        <a href="https://arcticauradesigns.com" style="color:#67e8f9;text-decoration:none;font-weight:600;">Contact Arctic Aura Designs to book.</a>
      </div>
      <div style="background:#0b1022;padding:14px 28px;color:#94a3b8;font-size:11px;border-top:1px solid rgba(255,255,255,0.06);display:flex;justify-content:space-between;align-items:center;">
        <span>© ${new Date().getFullYear()} <a href="https://arcticauradesigns.com" style="color:#67e8f9;text-decoration:none;">Arctic Aura Designs</a></span>
      </div>
    </div>
  </div>
  `;

  try {
    const result = await sendMail({
      to: body.clientEmail,
      subject: "Your Photos are Ready! - BOSS Holiday Photobooth",
      html,
      attachments,
    });

    // Clean up all stored photo artifacts once email is dispatched.
    await removePhotos(Array.from(processedPhotoIds));

    return NextResponse.json({ status: "ok", delivery: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to send email", detail: message },
      { status: 500 },
    );
  }
}

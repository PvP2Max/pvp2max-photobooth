import sharp from "sharp";
import { NextRequest, NextResponse } from "next/server";
import { findBackgroundAsset, getBackgroundName } from "@/lib/backgrounds";
import { sendMail } from "@/lib/mailer";
import {
  findPhotoById,
  getMediaFile,
  listPhotoIdsByEmail,
  removePhotos,
} from "@/lib/storage";
import { saveProduction } from "@/lib/production";
import { eventUsage, getEventContext } from "@/lib/tenants";
import { applyFilterToBuffer } from "@/lib/filters";
import { allowedOverlayTheme, loadWatermark, renderOverlay } from "@/lib/overlays";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

type Selection = {
  photoId: string;
  backgroundId: string;
  transform?: {
    scale?: number;
    offsetX?: number;
    offsetY?: number;
  };
  matchBackground?: boolean;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

async function applyWatermark(buffer: Buffer, watermarkEnabled: boolean) {
  if (!watermarkEnabled) return buffer;
  const watermark = await loadWatermark();
  const composed = await sharp(buffer)
    .composite([
      {
        input: watermark,
        gravity: "south",
      },
    ])
    .png()
    .toBuffer();
  return composed;
}

export async function POST(request: NextRequest) {
  const { context, error, status } = await getEventContext(request);
  if (!context) {
    return NextResponse.json({ error: error ?? "Unauthorized" }, { status: status ?? 401 });
  }
  const usage = eventUsage(context.event);
  try {
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
    let productionId: string | null = null;

    for (const selection of body.selections) {
      try {
        const record = await findPhotoById(context.scope, selection.photoId);
        if (!record) {
          return NextResponse.json(
            { error: `Photo ${selection.photoId} was not found.` },
            { status: 404 },
          );
        }

        const cutoutFile = await getMediaFile(context.scope, selection.photoId, "cutout");
        if (!cutoutFile) {
          return NextResponse.json(
            { error: `Cutout for photo ${selection.photoId} not found.` },
            { status: 404 },
          );
        }

        const backgroundAsset = await findBackgroundAsset(
          context.scope,
          selection.backgroundId,
        );
        if (!backgroundAsset) {
          return NextResponse.json(
            { error: `Background ${selection.backgroundId} not found.` },
            { status: 404 },
          );
        }

        const background = sharp(backgroundAsset.path).ensureAlpha();
        const [bgMeta, cutoutMeta] = await Promise.all([
          background.metadata(),
          sharp(cutoutFile.buffer).metadata(),
        ]);
        const bgWidth = bgMeta.width ?? 1600;
        const bgHeight = bgMeta.height ?? 900;
        const cutoutWidth = cutoutMeta.width ?? 1000;
        const cutoutHeight = cutoutMeta.height ?? 1000;

        const maxWidth = bgWidth * 0.55;
        const maxHeight = bgHeight * 0.75;
        const baseScale = Math.min(
          maxWidth / cutoutWidth,
          maxHeight / cutoutHeight,
          1.1,
        );
        const rawScale =
          typeof selection.transform?.scale === "number"
            ? selection.transform.scale
            : baseScale;
        const maxScaleByBg = Math.max(
          0.05,
          Math.min(
            (bgWidth - 2) / Math.max(cutoutWidth, 1),
            (bgHeight - 2) / Math.max(cutoutHeight, 1),
            6,
          ),
        );
        const appliedScale = Math.max(
          0.05,
          Math.min(Number.isFinite(rawScale) ? rawScale : baseScale, maxScaleByBg),
        );
        const offsetX = Number.isFinite(selection.transform?.offsetX)
          ? selection.transform!.offsetX!
          : 0;
        const offsetY = Number.isFinite(selection.transform?.offsetY)
          ? selection.transform!.offsetY!
          : 0;

        const targetWidth = cutoutWidth * appliedScale;
        const targetHeight = cutoutHeight * appliedScale;
        const rawX = bgWidth / 2 - targetWidth / 2 + offsetX;
        const rawY = bgHeight * 0.18 + offsetY;
        const left = Math.round(
          Math.min(Math.max(rawX, 0), Math.max(bgWidth - targetWidth, 0)),
        );
        const top = Math.round(
          Math.min(Math.max(rawY, 0), Math.max(bgHeight - targetHeight, 0)),
        );

        const cutoutBuffer = await sharp(cutoutFile.buffer)
          .ensureAlpha()
          .resize(
            Math.max(1, Math.round(targetWidth)),
            Math.max(1, Math.round(targetHeight)),
            {
              fit: "contain",
              background: { r: 0, g: 0, b: 0, alpha: 0 },
            },
          )
          .toBuffer();
        let cutoutComposite = cutoutBuffer;

        if (selection.matchBackground) {
          try {
            const [bgStats, cutStats] = await Promise.all([
              sharp(backgroundAsset.path).stats(),
              sharp(cutoutBuffer).stats(),
            ]);
            const bgMean =
              ((bgStats.channels?.[0]?.mean ?? 0) +
                (bgStats.channels?.[1]?.mean ?? 0) +
                (bgStats.channels?.[2]?.mean ?? 0)) /
              3;
            const cutMean =
              ((cutStats.channels?.[0]?.mean ?? 0) +
                (cutStats.channels?.[1]?.mean ?? 0) +
                (cutStats.channels?.[2]?.mean ?? 0)) /
              3;
            const brightnessFactor =
              cutMean > 0 ? clamp(bgMean / cutMean, 0.7, 1.3) : 1;
            const saturationFactor = 1.05;
            cutoutComposite = await sharp(cutoutBuffer)
              .modulate({
                brightness: brightnessFactor,
                saturation: saturationFactor,
              })
              .toBuffer();
          } catch (error) {
            console.error("Color match failed", {
              photoId: selection.photoId,
              backgroundId: selection.backgroundId,
              error,
            });
          }
        }

        // Apply selected filter after background removal
        if (record.filterUsed) {
          try {
            cutoutComposite = await applyFilterToBuffer(cutoutComposite, record.filterUsed);
          } catch (error) {
            console.error("Filter apply failed", { filter: record.filterUsed, error });
          }
        }

        const layers: sharp.OverlayOptions[] = [{ input: cutoutComposite, left, top }];
        const overlayTheme = allowedOverlayTheme(usage.overlaysAll === true, context.event.overlayTheme);
        if (overlayTheme) {
          const overlayFrame = await renderOverlay(bgWidth, bgHeight, overlayTheme);
          layers.push({ input: overlayFrame });
        }
        const composed = await background
          .composite(layers)
          .png()
          .toBuffer();

        const backgroundName = await getBackgroundName(context.scope, selection.backgroundId);

        const finalBuffer = await applyWatermark(
          composed,
          usage.watermark || context.event.watermarkEnabled === true,
        );

        attachments.push({
          filename: `${
            record.originalName.replace(/\.[^.]+$/, "") || record.id
          }-${backgroundName}.png`,
          content: finalBuffer,
          contentType: "image/png",
        });
      } catch (error) {
        const detail = error instanceof Error ? error.message : "Unknown error";
        console.error("Email composition failed", {
          photoId: selection.photoId,
          backgroundId: selection.backgroundId,
          detail,
        });
        return NextResponse.json(
          { error: `Failed to compose photo ${selection.photoId}`, detail },
          { status: 500 },
        );
      }
    }

    if (attachments.length === 0) {
      return NextResponse.json(
        { error: "No attachments generated for this request." },
        { status: 400 },
      );
    }

    // Save production copies for potential resend and downloads
    const production = await saveProduction(context.scope, body.clientEmail, attachments);
    productionId = production.id;

    const origin =
      request.headers.get("origin") || process.env.APP_BASE_URL || "";
    const baseUrl = origin.replace(/\/$/, "");
    const bundleName = production.bundleFilename || "photos.zip";
    const bundleLink = `${baseUrl}/api/production/files/${productionId}/${encodeURIComponent(
      bundleName,
    )}?token=${production.downloadToken}&business=${context.scope.businessSlug}&event=${context.scope.eventSlug}`;
    const downloadLinks = [
      `<li><a href="${bundleLink}" style="color:#67e8f9;text-decoration:none;">Download all photos (zip)</a></li>`,
    ];

    const watermarkNote = usage.watermark
      ? `<p style="margin:0 0 10px;color:#cbd5e1;font-size:12px;line-height:1.5;">This event is on the free tier, so a BoothOS watermark is present. Upgrade the event to remove it.</p>`
      : "";

    const html = `
      <div style="padding:24px;font-family:Arial,Helvetica,sans-serif;color:#0f172a;background:#0b1022;">
        <div style="max-width:640px;margin:0 auto;background:#0f172a;border:1px solid rgba(255,255,255,0.08);border-radius:18px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.25);">
          <div style="padding:26px 28px 12px;">
            <p style="letter-spacing:0.2em;text-transform:uppercase;color:#67e8f9;font-size:11px;margin:0 0 8px;">${context.business.name}</p>
            <h1 style="color:#fff;font-size:24px;margin:0 0 10px;">Your photos from ${context.event.name} are ready</h1>
            <p style="margin:0 0 12px;color:#cbd5e1;font-size:13px;line-height:1.5;">Thanks for visiting our booth. Use the secure links below to view and download your photos.</p>
          </div>
          <div style="padding:18px 28px;">
            <p style="margin:0 0 10px;color:#cbd5e1;font-size:13px;line-height:1.5;">Download your photos:</p>
            <ul style="margin:0 0 12px 18px;color:#cbd5e1;font-size:13px;line-height:1.6;">
              ${downloadLinks.join("")}
            </ul>
            ${watermarkNote}
            <p style="margin:10px 0 0;color:#94a3b8;font-size:12px;">Links expire after a few days. If they stop working, reply to this email and we’ll refresh them.</p>
          </div>
          <div style="background:#0f172a;padding:0 28px 24px;">
            <div style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);border-radius:14px;padding:14px 16px;text-align:center;">
              <span style="color:#e2e8f0;font-size:12px;">Want BoothOS at your next event? </span>
              <a href="https://arcticauradesigns.com" style="color:#67e8f9;text-decoration:none;font-weight:700;">Contact Arctic Aura Designs.</a>
            </div>
          </div>
          <div style="background:#0b1022;padding:14px 28px;color:#94a3b8;font-size:11px;border-top:1px solid rgba(255,255,255,0.06);display:flex;justify-content:space-between;align-items:center;">
            <span>© ${new Date().getFullYear()} <a href="https://arcticauradesigns.com" style="color:#67e8f9;text-decoration:none;">Arctic Aura Designs</a></span>
            <span style="color:#475569;">Powered by BoothOS</span>
          </div>
        </div>
      </div>
    `;

    try {
      const result = await sendMail({
        to: body.clientEmail,
        subject: `Your photos from ${context.event.name}`,
        html,
        attachments: [],
      });

      // Clean up all stored photo artifacts for this client once email is dispatched.
      const idsForEmail = await listPhotoIdsByEmail(context.scope, body.clientEmail);
      await removePhotos(context.scope, idsForEmail);

      return NextResponse.json({ status: "ok", delivery: result });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("Email send failed", { message });
      return NextResponse.json(
        { error: "Failed to send email", detail: message },
        { status: 500 },
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Email endpoint crashed", message);
    return NextResponse.json(
      { error: "Unexpected error", detail: message },
      { status: 500 },
    );
  }
}

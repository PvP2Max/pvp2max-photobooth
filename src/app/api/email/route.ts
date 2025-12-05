import { Buffer } from "node:buffer";
import { NextRequest, NextResponse } from "next/server";
import { BACKGROUND_OPTIONS } from "@/lib/backgrounds";
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
    const backgroundName =
      BACKGROUND_OPTIONS.find((bg) => bg.id === selection.backgroundId)?.name ??
      selection.backgroundId;

    attachments.push({
      filename: `${record.originalName.replace(/\.[^.]+$/, "")}-${backgroundName}.png`,
      content: decoded.buffer,
      contentType: decoded.contentType,
    });
  }

  const html = [
    `<p>Hi there,</p>`,
    `<p>Your edited photobooth shots are ready. Download them below.</p>`,
    `<p>Backgrounds used: ${[
      ...new Set(
        body.selections?.map((s) => s.backgroundId.toString()) ?? [],
      ),
    ].join(", ")}</p>`,
    `<p>Thank you for visiting our booth!</p>`,
  ].join("\n");

  try {
    const result = await sendMail({
      to: body.clientEmail,
      subject: "Your photobooth set is ready",
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

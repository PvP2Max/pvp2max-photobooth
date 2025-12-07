import { NextRequest, NextResponse } from "next/server";
import { removeBackground } from "@/lib/bgremover";
import { savePhoto, listPhotosByEmail } from "@/lib/storage";
import { addNotification } from "@/lib/notifications";
import { removeCheckinByEmail } from "@/lib/checkins";
import {
  getEventContext,
  incrementEventUsage,
  eventUsage,
  eventRequiresPayment,
} from "@/lib/tenants";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { context, error, status } = await getEventContext(request);
  if (!context) {
    return NextResponse.json({ error: error ?? "Unauthorized" }, { status: status ?? 401 });
  }
  const email = request.nextUrl.searchParams.get("email");
  if (!email) {
    return NextResponse.json(
      { error: "Query param 'email' is required" },
      { status: 400 },
    );
  }

  const photos = await listPhotosByEmail(context.scope, email);
  return NextResponse.json({ photos });
}

export async function POST(request: NextRequest) {
  const { context, error, status } = await getEventContext(request);
  if (!context) {
    return NextResponse.json({ error: error ?? "Unauthorized" }, { status: status ?? 401 });
  }
  const currentUsage = eventUsage(context.event);
  if (eventRequiresPayment(context.event)) {
    return NextResponse.json(
      { error: "Event requires payment before uploads. Complete checkout to continue." },
      { status: 402 },
    );
  }
  if (currentUsage.photoCap !== null && currentUsage.photoUsed >= currentUsage.photoCap) {
    return NextResponse.json(
      { error: "Photo limit reached for this event. Top up to continue." },
      { status: 402 },
    );
  }
  const formData = await request.formData();
  const email = formData.get("email");
  const uploaded = formData.getAll("file");
  const removeBgInput = formData.get("removeBackground");
  const removeBg = removeBgInput === null ? true : removeBgInput === "true" || removeBgInput === "1";
  const aiPromptRaw = formData.get("aiPrompt");
  const wantsAiBackground =
    aiPromptRaw && typeof aiPromptRaw === "string" && aiPromptRaw.trim().length > 0;
  const overlayPack = formData.get("overlayPack");
  const filterUsed = formData.get("filter");

  if (removeBg && !context.event.allowBackgroundRemoval) {
    return NextResponse.json(
      { error: "Background removal is disabled for this event." },
      { status: 403 },
    );
  }

  if (wantsAiBackground) {
    if (!context.event.allowAiBackgrounds) {
      return NextResponse.json(
        { error: "AI backgrounds are not enabled for this event." },
        { status: 403 },
      );
    }
    const remainingAi = currentUsage.remainingAi ?? 0;
    if (remainingAi <= 0) {
      return NextResponse.json(
        { error: "AI credits exhausted for this event. Top up to continue." },
        { status: 402 },
      );
    }
  }

  if (!email || typeof email !== "string") {
    return NextResponse.json(
      { error: "Email is required to attach uploads to a client." },
      { status: 400 },
    );
  }

  const files = uploaded.filter((f): f is File => f instanceof File);

  if (files.length === 0) {
    return NextResponse.json(
      { error: "At least one image file is required." },
      { status: 400 },
    );
  }

  try {
    const results: {
      photo?: Awaited<ReturnType<typeof savePhoto>>;
      error?: string;
      fileName?: string;
    }[] = [];
    for (const file of files) {
      try {
        const cutout = removeBg
          ? await removeBackground(file)
          : { buffer: Buffer.from(await file.arrayBuffer()), contentType: (file as Blob).type || "image/png" };
        const photo = await savePhoto({
          email,
          file,
          cutout: cutout.buffer,
          cutoutContentType: cutout.contentType,
          scope: context.scope,
          overlayPack: typeof overlayPack === "string" ? overlayPack : undefined,
          filterUsed: typeof filterUsed === "string" ? filterUsed : undefined,
          mode: context.event.mode,
        });
        results.push({ photo });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error removing background";
        results.push({ error: message, fileName: (file as File).name });
      }
    }

    const photos = results.filter((r) => r.photo).map((r) => r.photo!);
    const failures = results.filter((r) => r.error);

    if (photos.length === 0) {
      return NextResponse.json(
        { error: "All uploads failed to process.", failures },
        { status: 502 },
      );
    }

    const usage = await incrementEventUsage(context.scope, {
      photos: photos.length,
      aiCredits: wantsAiBackground ? 1 : 0,
    });
    await addNotification(context.scope, email, photos.length);
    await removeCheckinByEmail(context.scope, email);

    return NextResponse.json({ photos, failures, usage: usage.usage ?? eventUsage(context.event) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to process photo", detail: message },
      { status: 500 },
    );
  }
}

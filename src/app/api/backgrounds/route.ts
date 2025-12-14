import { NextRequest, NextResponse } from "next/server";
import {
  addBackground,
  listBackgrounds,
  removeBackground,
} from "@/lib/backgrounds";
import { getEventContext } from "@/lib/tenants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const { context, error, status } = await getEventContext(request);
  if (!context) {
    return NextResponse.json({ error: error ?? "Unauthorized" }, { status: status ?? 401 });
  }
  if (!context.roles.owner && !context.roles.photographer) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const allowedIds = context.event.allowedBackgroundIds ?? null;
  const backgrounds = await listBackgrounds(context.scope, allowedIds);
  return NextResponse.json({ backgrounds });
}

export async function POST(request: NextRequest) {
  const { context, error, status } = await getEventContext(request);
  if (!context) {
    return NextResponse.json({ error: error ?? "Unauthorized" }, { status: status ?? 401 });
  }
  if (!context.roles.owner && !context.roles.photographer) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (context.event.mode !== "photographer") {
    return NextResponse.json(
      { error: "Background uploads are limited to photographer events." },
      { status: 403 },
    );
  }
  const formData = await request.formData();
  const name = (formData.get("name") || "").toString().trim();
  const description = (formData.get("description") || "").toString().trim();
  const file = formData.get("file");
  const categoryRaw = formData.get("category");
  const category = categoryRaw === "frame" ? "frame" : "background";

  if (!name) {
    return NextResponse.json(
      { error: "Background name is required." },
      { status: 400 },
    );
  }

  if (category === "frame" && context.event.plan !== "event-ai") {
    return NextResponse.json(
      { error: "Frame uploads require the AI event plan ($30)." },
      { status: 403 },
    );
  }

  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: "Background file is required." },
      { status: 400 },
    );
  }

  try {
    const background = await addBackground(context.scope, { name, description, file, category });
    return NextResponse.json({ background });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to save background", detail: message },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  const { context, error, status } = await getEventContext(request);
  if (!context) {
    return NextResponse.json({ error: error ?? "Unauthorized" }, { status: status ?? 401 });
  }
  if (!context.roles.owner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = (await request.json().catch(() => null)) as { allowedIds?: string[] } | null;
  if (!body?.allowedIds || !Array.isArray(body.allowedIds)) {
    return NextResponse.json({ error: "allowedIds array is required." }, { status: 400 });
  }
  await (await import("@/lib/tenants")).updateEventConfig(
    context.scope.businessId,
    context.scope.eventId,
    {
      allowedBackgroundIds: body.allowedIds,
    },
  );
  return NextResponse.json({ status: "ok" });
}

export async function DELETE(request: NextRequest) {
  const { context, error, status } = await getEventContext(request);
  if (!context) {
    return NextResponse.json({ error: error ?? "Unauthorized" }, { status: status ?? 401 });
  }
  if (!context.roles.owner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = (await request.json().catch(() => null)) as {
    id?: string;
  } | null;
  const id = body?.id;
  if (!id) {
    return NextResponse.json(
      { error: "Background id is required to delete." },
      { status: 400 },
    );
  }

  try {
    await removeBackground(context.scope, id);
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to delete background", detail: message },
      { status: 400 },
    );
  }
}

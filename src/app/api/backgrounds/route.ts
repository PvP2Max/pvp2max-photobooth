import { NextRequest, NextResponse } from "next/server";
import {
  addBackground,
  listBackgrounds,
  removeBackground,
} from "@/lib/backgrounds";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  const backgrounds = await listBackgrounds();
  return NextResponse.json({ backgrounds });
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const name = (formData.get("name") || "").toString().trim();
  const description = (formData.get("description") || "").toString().trim();
  const file = formData.get("file");

  if (!name) {
    return NextResponse.json(
      { error: "Background name is required." },
      { status: 400 },
    );
  }

  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: "Background file is required." },
      { status: 400 },
    );
  }

  try {
    const background = await addBackground({ name, description, file });
    return NextResponse.json({ background });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to save background", detail: message },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
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
    await removeBackground(id);
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to delete background", detail: message },
      { status: 400 },
    );
  }
}

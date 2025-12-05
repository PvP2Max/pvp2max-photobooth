import { NextRequest, NextResponse } from "next/server";
import { removeBackground } from "@/lib/bgremover";
import { savePhoto, listPhotosByEmail } from "@/lib/storage";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email");
  if (!email) {
    return NextResponse.json(
      { error: "Query param 'email' is required" },
      { status: 400 },
    );
  }

  const photos = await listPhotosByEmail(email);
  return NextResponse.json({ photos });
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const email = formData.get("email");
  const file = formData.get("file");

  if (!email || typeof email !== "string") {
    return NextResponse.json(
      { error: "Email is required to attach uploads to a client." },
      { status: 400 },
    );
  }

  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: "Image file is required." },
      { status: 400 },
    );
  }

  try {
    const cutout = await removeBackground(file);
    const photo = await savePhoto({
      email,
      file,
      cutout: cutout.buffer,
      cutoutContentType: cutout.contentType,
    });

    return NextResponse.json({ photo });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to process photo", detail: message },
      { status: 500 },
    );
  }
}

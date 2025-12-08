import { NextRequest, NextResponse } from "next/server";
import { generateAiBackground } from "@/lib/ai-backgrounds";
import { addBackground } from "@/lib/backgrounds";
import { getEventContext, incrementEventUsage, eventRequiresPayment } from "@/lib/tenants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const { context, error, status } = await getEventContext(request, { allowBusinessSession: true });
  if (!context) {
    return NextResponse.json({ error: error ?? "Unauthorized" }, { status: status ?? 401 });
  }
  const body = (await request.json().catch(() => ({}))) as { prompt?: string; kind?: "background" | "frame" };
  const prompt = body.prompt?.toString().trim();
  if (!prompt) {
    return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
  }
  if (!context.event.allowAiBackgrounds) {
    return NextResponse.json({ error: "AI backgrounds not enabled for this event." }, { status: 403 });
  }
  if (eventRequiresPayment(context.event, context.business)) {
    return NextResponse.json(
      { error: "Complete event payment before generating AI backgrounds." },
      { status: 402 },
    );
  }
  if (body.kind === "frame") {
    return NextResponse.json(
      { error: "AI frame generation is disabled. Upload frames manually on AI plan events." },
      { status: 400 },
    );
  }
  const kind = "background";
  const usage = await incrementEventUsage(context.scope, { aiCredits: 1 });
  if (usage.usage.remainingAi < 0) {
    return NextResponse.json({ error: "AI credits exhausted." }, { status: 402 });
  }
  try {
    const file = await generateAiBackground(context.scope, prompt, kind);
    const fs = await import("node:fs/promises");
    const buffer = await fs.readFile(file.path);
    const background = await addBackground(context.scope, {
      name: prompt.slice(0, 60),
      description: "AI generated",
      file: new File([buffer], file.filename, {
        type: file.contentType,
      }),
    });
    return NextResponse.json({ background, usage: usage.usage });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to generate background.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

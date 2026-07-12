/**
 * AI Mock dictation endpoint — voice-to-text only. Accepts a recorded audio blob
 * (multipart/form-data, field "audio") and returns its transcript via OpenAI.
 * Server-side so OPENAI_API_KEY never ships to the browser. Node runtime: the
 * form upload + OpenAI SDK need Node, not Edge. This is the app's only
 * req.formData() route — every other endpoint uses req.json().
 */
import { NextResponse } from "next/server";
import { transcribeAudio, OpenAIUnavailableError } from "@/lib/llm/transcribe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let file: File | null = null;
  try {
    const audio = (await req.formData()).get("audio");
    if (audio instanceof File) file = audio;
  } catch {
    return NextResponse.json({ error: "invalid_form" }, { status: 400 });
  }
  if (!file || file.size === 0) return NextResponse.json({ error: "missing_audio" }, { status: 400 });

  try {
    const { text } = await transcribeAudio(file);
    return NextResponse.json({ text });
  } catch (err) {
    if (err instanceof OpenAIUnavailableError) {
      return NextResponse.json({ error: "openai_unavailable" }, { status: 400 });
    }
    console.error("POST /api/transcribe failed:", err);
    return NextResponse.json(
      { error: "transcribe_failed", message: String((err as Error).message).slice(0, 300) },
      { status: 502 },
    );
  }
}

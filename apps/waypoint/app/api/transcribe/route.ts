/**
 * AI Mock dictation endpoint — voice-to-text only. Accepts a recorded audio blob
 * (multipart/form-data, field "audio") and returns its transcript via OpenAI.
 * Server-side so OPENAI_API_KEY never ships to the browser. Node runtime: the
 * form upload + OpenAI SDK need Node, not Edge. This is the app's only
 * req.formData() route — every other endpoint uses req.json().
 */
import { NextResponse } from "next/server";
import { transcribeAudio, OpenAIUnavailableError } from "@/lib/llm/transcribe";
import { BODY_LIMITS, readAudioUpload } from "@/lib/http/parse";
import { errorResponse, failureResponse } from "@/lib/http/respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // Same ingest discipline as the JSON routes: one bounded read, one parse, a
  // 4xx failure value — never an unbounded upload and never a cast.
  const audio = await readAudioUpload(req, "audio", BODY_LIMITS.audio);
  if (!audio.ok) return failureResponse(audio.failure);

  try {
    const { text } = await transcribeAudio(audio.value);
    return NextResponse.json({ text });
  } catch (err) {
    if (err instanceof OpenAIUnavailableError) {
      return NextResponse.json(
        { error: "openai_unavailable", kind: "client_input" },
        { status: 400 },
      );
    }
    return errorResponse("POST /api/transcribe", "transcribe", err);
  }
}

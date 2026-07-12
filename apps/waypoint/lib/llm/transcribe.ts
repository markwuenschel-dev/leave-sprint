/**
 * Speech-to-text for AI Mock dictation (voice input only — no TTS). OpenAI-specific:
 * transcription is not part of the provider-neutral InterviewProvider seam (ADR-0002),
 * so it lives beside the registry rather than in an adapter. Reads OPENAI_API_KEY
 * server-side; the browser only ever POSTs audio to /api/transcribe.
 */
import OpenAI from "openai";
import { PROVIDER_ENV_KEY } from "./registry";

const TRANSCRIBE_MODEL = "gpt-4o-transcribe";

/** Thrown when dictation is requested but no OpenAI key is configured. */
export class OpenAIUnavailableError extends Error {
  constructor() {
    super(`Dictation unavailable: ${PROVIDER_ENV_KEY.openai} is not set.`);
    this.name = "OpenAIUnavailableError";
  }
}

/**
 * Transcribe a recorded audio file to text. The uploaded File carries its own
 * name/extension (e.g. answer.webm) so OpenAI can sniff the container.
 * Throws OpenAIUnavailableError when the OpenAI key is missing.
 */
export async function transcribeAudio(
  file: File,
  env: NodeJS.ProcessEnv = process.env,
): Promise<{ text: string }> {
  const apiKey = env[PROVIDER_ENV_KEY.openai];
  if (!apiKey) throw new OpenAIUnavailableError();
  const client = new OpenAI({ apiKey });
  const res = await client.audio.transcriptions.create({ file, model: TRANSCRIBE_MODEL });
  return { text: res.text ?? "" };
}

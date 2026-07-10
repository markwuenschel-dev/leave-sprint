/**
 * AI Interviewer provider seam (ADR-0002). Server-side only.
 *
 * One active provider per session behind a common interface; the pipeline owns
 * the observations intake + monotonicity retry. Adapters normalize each vendor's
 * structured output to OBSERVATIONS_JSON_SCHEMA (three shapes: OpenAI-compatible
 * covers OpenAI + Grok, plus Anthropic and Gemini).
 */
export * from "./types";
export * from "./pipeline";
export * from "./registry";
export { anthropicProvider } from "./adapters/anthropic";
export { openaiProvider, grokProvider } from "./adapters/openai";
export { geminiProvider } from "./adapters/gemini";

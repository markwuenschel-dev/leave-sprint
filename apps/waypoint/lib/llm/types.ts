/**
 * Provider seam types (ADR-0002). A provider-agnostic interface every adapter
 * implements; the pipeline (pipeline.ts) wraps it with the retry-once policy and
 * the observations intake. Server-side only — adapters hold API keys.
 */

import { assertObservations, ObservationsValidationError } from "@waypoint/rubric";
import type { Observations } from "@waypoint/rubric";

export type ProviderId = "anthropic" | "openai" | "grok" | "gemini";

/** A prepared grading prompt. Orchestration builds `system`/`user`; the seam
 *  appends `retryNote` on a monotonicity retry. */
export interface GradeInput {
  system: string;
  user: string;
  retryNote?: string;
}

/** One active provider per session (ADR-0002). `grade` returns raw Observations
 *  constrained to OBSERVATIONS_JSON_SCHEMA; the pipeline validates + scores. */
export interface InterviewProvider {
  readonly id: ProviderId;
  /** Exact model id — stamped as `calibration.graderModel` provenance. */
  readonly model: string;
  /** Structured grade: raw Observations constrained to OBSERVATIONS_JSON_SCHEMA. */
  grade(input: GradeInput): Promise<Observations>;
  /** Free-text completion — question generation and probing (no structured output). */
  complete(input: GradeInput): Promise<string>;
}

/** Merge the retry note into the user turn. */
export function userContent(input: GradeInput): string {
  return input.retryNote ? `${input.user}\n\n[CORRECTION] ${input.retryNote}` : input.user;
}

/**
 * Parse a provider's structured grade — the trust boundary for everything the model
 * says. Structured output is a *request*, not a guarantee: it degrades on refusals,
 * truncation and fallback paths, so the response is checked against the very schema
 * the adapters sent (`OBSERVATIONS_JSON_SCHEMA`, via `assertObservations`) instead of
 * being cast. A missing or mistyped score-bearing field throws
 * `ObservationsValidationError` here rather than becoming a real all-zero grade
 * downstream; off-vocabulary enum values still flow through to the intake's tiered
 * coercion untouched.
 *
 * @throws {ObservationsValidationError} the model returned garbage — never persist.
 */
export function parseObservations(text: string): Observations {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  const json = start >= 0 && end > start ? text.slice(start, end + 1) : text;
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (err) {
    throw new ObservationsValidationError([
      `response was not JSON (${(err as Error).message}) — ${text.length} chars beginning ${JSON.stringify(text.slice(0, 80))}`,
    ]);
  }
  return assertObservations(parsed);
}

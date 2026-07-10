/**
 * Provider seam types (ADR-0002). A provider-agnostic interface every adapter
 * implements; the pipeline (pipeline.ts) wraps it with the retry-once policy and
 * the observations intake. Server-side only — adapters hold API keys.
 */

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
  grade(input: GradeInput): Promise<Observations>;
}

/** Merge the retry note into the user turn. */
export function userContent(input: GradeInput): string {
  return input.retryNote ? `${input.user}\n\n[CORRECTION] ${input.retryNote}` : input.user;
}

/** Lenient parse — the structured-output schema already constrains shape, and
 *  intakeObservations coerces/clamps, so trust-and-cast here. */
export function parseObservations(text: string): Observations {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  const json = start >= 0 && end > start ? text.slice(start, end + 1) : text;
  return JSON.parse(json) as Observations;
}

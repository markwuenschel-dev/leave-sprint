/**
 * Grade pipeline (ADR-0004 §5). Calls a provider, runs the observations intake,
 * and owns the one-shot monotonicity retry: on a non-monotonic first grade, it
 * re-asks the same provider with a correction note; a second failure is accepted
 * but flagged (confidence forced Low). The graderModel provenance is taken from
 * the provider, so callers never pass it.
 */

import { intakeObservations, type IntakeResult, type ObservationContext } from "@waypoint/rubric";
import type { GradeInput, InterviewProvider } from "./types";

export const MONOTONIC_RETRY_NOTE =
  "Your level scores were not monotonic. They must satisfy L3 ≤ L2 ≤ L1 " +
  "(a candidate cannot demonstrate a higher level more strongly than a lower one). Re-grade with corrected level scores.";

/** Provider-agnostic: grade → intake → retry-once-on-monotonicity → scored entry. */
export async function gradeToEntry(
  provider: InterviewProvider,
  input: GradeInput,
  ctx: Omit<ObservationContext, "graderModel">,
): Promise<IntakeResult> {
  const fullCtx: ObservationContext = { ...ctx, graderModel: provider.model };

  const obs1 = await provider.grade(input);
  const res1 = intakeObservations(obs1, fullCtx);
  if (res1.monotonicOk) return res1;

  // One retry with the violation fed back; a second failure is flagged, not looped.
  const obs2 = await provider.grade({ ...input, retryNote: MONOTONIC_RETRY_NOTE });
  return intakeObservations(obs2, fullCtx, { retried: true });
}

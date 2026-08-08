/**
 * Grade pipeline (ADR-0004 §5). Calls a provider, runs the observations intake,
 * and owns the one-shot monotonicity retry: on a non-monotonic first grade, it
 * re-asks the same provider with a correction note; a second failure is accepted
 * but flagged (confidence forced Low). The graderModel provenance is taken from
 * the provider, so callers never pass it.
 *
 * WP-C11: the retry call can also THROW (a parse failure or a rate limit — both
 * more likely on a second consecutive call). That used to destroy `res1`, a grade
 * the system had already parsed successfully, and surface as an opaque 502. The
 * ADR's policy is explicit that this must not happen (docs/adr/0004-ai-interviewer-observations-contract.md:77-79):
 *
 *   "Monotonicity (`validateMonotonic` fails) → reject + one retry with the
 *    violation fed back; if still failing, accept but force
 *    `calibrationConfidence: 'Low'` + flag (never lose the interview)."
 *
 * "Never lose the interview" is the binding clause: a retry that throws is still
 * a retry that did not fix the violation, so the first result is accepted under
 * the same flagged-acceptance rule. The two cases stay distinguishable —
 * `retryError` is set only when the retry threw.
 */

import { intakeObservations, type IntakeResult, type ObservationContext } from "@waypoint/rubric";
import type { GradeInput, InterviewProvider } from "./types";

export const MONOTONIC_RETRY_NOTE =
  "Your level scores were not monotonic. They must satisfy L3 ≤ L2 ≤ L1 " +
  "(a candidate cannot demonstrate a higher level more strongly than a lower one). Re-grade with corrected level scores.";

/** Stamped into the accepted entry's `scoreUncertainty.reason` when the retry threw,
 *  so the flag survives into the persisted record — not just this response. */
export const RETRY_FAILED_MARKER = "[flagged: monotonicity retry failed]";

/** An IntakeResult plus why a flagged fallback happened, when one did. */
export interface GradeResult extends IntakeResult {
  /**
   * Present only when the monotonicity retry THREW and the first grade was
   * accepted under the flagged-acceptance policy. Absent when the retry returned
   * a (still non-monotonic) result — that case is `flagged` without `retryError`.
   */
  retryError?: string;
}

type Uncertainty = NonNullable<IntakeResult["entry"]["scoreUncertainty"]>;

/** Record the flag durably: force the ADR's flagged state onto the entry that ships. */
function markRetryFailure(res: IntakeResult, reason: string): GradeResult {
  const prior: Uncertainty = res.entry.scoreUncertainty ?? {};
  const priorReason = typeof prior.reason === "string" ? prior.reason.trim() : "";
  return {
    ...res,
    entry: {
      ...res.entry,
      scoreUncertainty: {
        ...prior,
        reason: `${RETRY_FAILED_MARKER}${priorReason ? ` ${priorReason}` : ""}`,
      },
    },
    retryError: reason,
  };
}

/** Provider-agnostic: grade → intake → retry-once-on-monotonicity → scored entry. */
export async function gradeToEntry(
  provider: InterviewProvider,
  input: GradeInput,
  ctx: Omit<ObservationContext, "graderModel">,
): Promise<GradeResult> {
  const fullCtx: ObservationContext = { ...ctx, graderModel: provider.model };

  const obs1 = await provider.grade(input);
  const res1 = intakeObservations(obs1, fullCtx);
  if (res1.monotonicOk) return res1;

  // One retry with the violation fed back; a second failure is flagged, not looped.
  // Both halves of the retry are guarded: the provider call can throw (rate limit,
  // parse failure at the seam) and so can the intake — `intakeObservations` rejects
  // a response that violates the ADR-0004 emission contract
  // (packages/rubric/src/observations.ts:228-241, ObservationsValidationError).
  try {
    const obs2 = await provider.grade({ ...input, retryNote: MONOTONIC_RETRY_NOTE });
    return intakeObservations(obs2, fullCtx, { retried: true });
  } catch (err) {
    // The retry threw. res1 is a grade we already parsed — accept it under the
    // ADR's flagged-acceptance policy (confidence forced Low + flagged) instead
    // of throwing away a graded turn the user cannot get back.
    const reason = String((err as Error)?.message ?? err).slice(0, 300);
    console.warn(`gradeToEntry: monotonicity retry failed; accepting flagged first grade — ${reason}`);
    return markRetryFailure(intakeObservations(obs1, fullCtx, { retried: true }), reason);
  }
}

/**
 * WP-C11 regression: a monotonicity retry that THROWS must not destroy the first
 * grade the pipeline already parsed. ADR-0004 §5 (docs/adr/0004-ai-interviewer-observations-contract.md:77-79)
 * says a retry that fails to fix the violation is "accept but force
 * calibrationConfidence: 'Low' + flag (never lose the interview)" — a throw is
 * still a retry that did not fix it.
 *
 * Before the fix these tests fail: `gradeToEntry` rejected with the retry's error
 * and the graded turn was gone (surfacing as an opaque 502 grade_failed).
 */

import { describe, expect, it, vi } from "vitest";
import { RD, type Observations, type ObservationContext, type UniversalSubScores } from "@waypoint/rubric";
import type { GradeInput, InterviewProvider } from "./types";
import { MONOTONIC_RETRY_NOTE, RETRY_FAILED_MARKER, gradeToEntry } from "./pipeline";

const CTX: Omit<ObservationContext, "graderModel"> = {
  task: "Explain hash map collisions",
  date: "2026-08-08",
  taskType: "knowledge",
  domain: "Java",
  primaryRole: "SWE",
  problemLevel: "L2",
  difficulty: 2,
  questionSource: "qbank",
};

/** Every universal dimension, as the ADR-0004 emission contract requires. */
function fullSubScores(): UniversalSubScores {
  const out: UniversalSubScores = {};
  for (const d of RD.universalDims) out[d.id] = Math.min(3, d.max);
  return out;
}

function obs(levelScores: { L1: number; L2: number; L3: number }, reason = "thin evidence"): Observations {
  return {
    universalSubScores: fullSubScores(),
    levelScores,
    taskSpecificScore: 60,
    gates: [],
    gapTypes: [],
    knowledgeGapTags: [],
    weaknessTags: [],
    severity: "Medium",
    nextActionType: "retest",
    strengths: "named the mechanism",
    weaknesses: "no resizing story",
    surviveProbing: "held up",
    calibrationConfidence: "High",
    scoreUncertainty: { range: [55, 70], reason },
    proposedNewTags: [],
  };
}

/** L2 > L1 violates L3 ≤ L2 ≤ L1, so the pipeline must retry. */
const NON_MONOTONIC = { L1: 40, L2: 80, L3: 10 };
const MONOTONIC = { L1: 80, L2: 60, L3: 40 };

function providerOf(grade: InterviewProvider["grade"]): InterviewProvider {
  return {
    id: "anthropic",
    model: "test-model-1",
    grade,
    complete: async () => "",
  };
}

describe("gradeToEntry — monotonicity retry", () => {
  it("returns the first grade untouched when it is already monotonic", async () => {
    const grade = vi.fn<InterviewProvider["grade"]>(async () => obs(MONOTONIC));
    const res = await gradeToEntry(providerOf(grade), { system: "s", user: "u" }, CTX);

    expect(grade).toHaveBeenCalledTimes(1);
    expect(res.monotonicOk).toBe(true);
    expect(res.flagged).toBe(false);
    expect(res.retryError).toBeUndefined();
  });

  it("uses the retry's result when the retry succeeds", async () => {
    const grade = vi
      .fn<InterviewProvider["grade"]>()
      .mockResolvedValueOnce(obs(NON_MONOTONIC))
      .mockResolvedValueOnce(obs(MONOTONIC));

    const res = await gradeToEntry(providerOf(grade), { system: "s", user: "u" }, CTX);

    expect(grade).toHaveBeenCalledTimes(2);
    const second = grade.mock.calls[1][0] as GradeInput;
    expect(second.retryNote).toBe(MONOTONIC_RETRY_NOTE);
    expect(res.flagged).toBe(false);
    expect(res.retryError).toBeUndefined();
  });

  it("accepts and flags when the retry comes back still non-monotonic", async () => {
    const grade = vi
      .fn<InterviewProvider["grade"]>()
      .mockResolvedValueOnce(obs(NON_MONOTONIC))
      .mockResolvedValueOnce(obs(NON_MONOTONIC));

    const res = await gradeToEntry(providerOf(grade), { system: "s", user: "u" }, CTX);

    expect(res.flagged).toBe(true);
    expect(res.entry.calibration?.calibrationConfidence).toBe("Low");
    // The distinction the policy draws: this one did NOT throw.
    expect(res.retryError).toBeUndefined();
    expect(res.entry.scoreUncertainty?.reason ?? "").not.toContain(RETRY_FAILED_MARKER);
  });

  it("falls back to the first grade — flagged, not lost — when the retry THROWS", async () => {
    const grade = vi
      .fn<InterviewProvider["grade"]>()
      .mockResolvedValueOnce(obs(NON_MONOTONIC, "model was terse"))
      .mockRejectedValueOnce(new Error("429 rate_limit_exceeded"));

    const res = await gradeToEntry(providerOf(grade), { system: "s", user: "u" }, CTX);

    expect(grade).toHaveBeenCalledTimes(2);
    // The graded turn survives.
    expect(res.entry).toBeTruthy();
    expect(res.entry.finalScore).not.toBeNull();
    // ADR flagged-acceptance: flagged + confidence forced Low.
    expect(res.flagged).toBe(true);
    expect(res.monotonicOk).toBe(false);
    expect(res.entry.calibration?.calibrationConfidence).toBe("Low");
    // Recorded, not swallowed: in the response AND durably on the entry that the
    // client persists through /api/state.
    expect(res.retryError).toContain("rate_limit_exceeded");
    expect(res.entry.scoreUncertainty?.reason).toContain(RETRY_FAILED_MARKER);
    expect(res.entry.scoreUncertainty?.reason).toContain("model was terse");
    // Provenance still comes from the provider.
    expect(res.entry.calibration?.graderModel).toBe("test-model-1");
  });

  it("falls back when the retry returns a response the intake REJECTS", async () => {
    // Cross-lane: packages/rubric/src/observations.ts now throws
    // ObservationsValidationError on a contract violation, so the second intake
    // is a throw site too — it must not lose the first grade either.
    const broken = { ...obs(MONOTONIC), universalSubScores: {} } as Observations;
    const grade = vi
      .fn<InterviewProvider["grade"]>()
      .mockResolvedValueOnce(obs(NON_MONOTONIC))
      .mockResolvedValueOnce(broken);

    const res = await gradeToEntry(providerOf(grade), { system: "s", user: "u" }, CTX);

    expect(res.flagged).toBe(true);
    expect(res.entry.calibration?.calibrationConfidence).toBe("Low");
    expect(res.retryError).toContain("ADR-0004");
    expect(res.entry.scoreUncertainty?.reason).toContain(RETRY_FAILED_MARKER);
  });

  it("still propagates when the FIRST call throws (nothing was parsed to keep)", async () => {
    const grade = vi.fn<InterviewProvider["grade"]>().mockRejectedValueOnce(new Error("boom"));
    await expect(gradeToEntry(providerOf(grade), { system: "s", user: "u" }, CTX)).rejects.toThrow("boom");
  });
});

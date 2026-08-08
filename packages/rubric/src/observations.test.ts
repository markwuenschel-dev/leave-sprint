/**
 * Observations intake — the AI-grade trust boundary (ADR-0004 §5).
 *
 * The load-bearing property under test: an ABSENT field is distinguishable from a
 * genuine ZERO. A partial model response must be rejected loudly; a candidate who
 * actually scored nothing must still be graded 0. These two cases used to produce
 * byte-identical RubricEntries.
 *
 * This file is also the executable counterpart to ADR-0004 §5's tag policy — the
 * prose and the implementation had drifted precisely because nothing pinned them.
 */

import { describe, expect, it } from 'vitest';

import { RD } from './referenceData';
import {
  ObservationsValidationError,
  OBSERVATIONS_JSON_SCHEMA,
  assertObservations,
  checkObservations,
  intakeObservations,
  type ObservationContext,
  type Observations,
} from './observations';

const CTX: ObservationContext = {
  task: 'Explain database indexes',
  date: '2026-08-08',
  taskType: 'knowledge',
  domain: 'SQL',
  primaryRole: 'SWE',
  problemLevel: 'L2',
  difficulty: 3,
  graderModel: 'test-model-1',
  questionSource: 'qbank',
};

/** All six universal dimensions at their maximum (sums to the 100-point scale). */
const fullSubs = (): Record<string, number> =>
  Object.fromEntries(RD.universalDims.map((d) => [d.id, d.max]));

/** Every dimension at a genuine zero — a real, badly-answered question. */
const zeroSubs = (): Record<string, number> =>
  Object.fromEntries(RD.universalDims.map((d) => [d.id, 0]));

/** A fully schema-compliant response; `patch` overrides individual fields. */
function obs(patch: Partial<Record<keyof Observations, unknown>> = {}): Observations {
  return {
    universalSubScores: fullSubs(),
    levelScores: { L1: 90, L2: 80, L3: 70 },
    taskSpecificScore: 85,
    gates: [{ gate: RD.gates[0].gate, verdict: 'Pass' }],
    gapTypes: ['Mechanism gap'],
    knowledgeGapTags: ['Composite index column order'],
    weaknessTags: ['Thin tradeoff analysis'],
    severity: 'Medium',
    nextActionType: 'retest',
    strengths: 'Named the B-tree.',
    weaknesses: 'No write-amplification tradeoff.',
    surviveProbing: 'Held up.',
    calibrationConfidence: 'High',
    scoreUncertainty: { range: [80, 90], reason: 'short answer' },
    proposedNewTags: [],
    ...patch,
  } as unknown as Observations;
}

/** Drop a key entirely, the way a truncated / non-compliant model response would. */
function without(source: Record<string, unknown>, key: string): Record<string, unknown> {
  const copy = { ...source };
  delete copy[key];
  return copy;
}

describe('checkObservations — presence, the tier the engine never had', () => {
  it('accepts a fully compliant response and narrows it to the schema', () => {
    const check = checkObservations(obs());
    expect(check.issues).toEqual([]);
    expect(check.dropped).toEqual([]);
    expect(check.value).not.toBeNull();
  });

  it('rejects an omitted universalSubScores block instead of coercing it to zeros', () => {
    const check = checkObservations(without(obs() as unknown as Record<string, unknown>, 'universalSubScores'));
    expect(check.value).toBeNull();
    expect(check.issues).toContain('observations.universalSubScores: required property is absent');
  });

  it('rejects a PARTIAL sub-score block — one missing dimension is still a false zero', () => {
    const partial = without(fullSubs(), 'completeness');
    const check = checkObservations(obs({ universalSubScores: partial }));
    expect(check.value).toBeNull();
    expect(check.issues).toContain('observations.universalSubScores.completeness: required property is absent');
  });

  it('names every absent required top-level field, not just the first', () => {
    const stripped = without(
      without(obs() as unknown as Record<string, unknown>, 'levelScores'),
      'taskSpecificScore',
    );
    const check = checkObservations(stripped);
    expect(check.value).toBeNull();
    expect(check.issues).toEqual(
      expect.arrayContaining([
        'observations.levelScores: required property is absent',
        'observations.taskSpecificScore: required property is absent',
      ]),
    );
  });

  it('treats an explicit null as absent rather than as a zero', () => {
    const check = checkObservations(obs({ taskSpecificScore: null }));
    expect(check.value).toBeNull();
    expect(check.issues).toContain('observations.taskSpecificScore: required property is absent');
  });

  it('rejects a wrong-typed score instead of Number()-ing it to 0', () => {
    const check = checkObservations(obs({ levelScores: { L1: 90, L2: 'eighty', L3: 70 } }));
    expect(check.value).toBeNull();
    expect(check.issues).toContain('observations.levelScores.L2: expected a finite number, got string');
  });

  it('rejects a non-object response outright', () => {
    expect(checkObservations('sorry, I cannot grade this').value).toBeNull();
    expect(checkObservations(null).value).toBeNull();
    expect(checkObservations([]).value).toBeNull();
  });

  it('drops a malformed ARRAY ITEM without voiding the whole grade', () => {
    const check = checkObservations(obs({ gates: [{ gate: RD.gates[0].gate, verdict: 'Pass' }, 'Correctness: ok'] }));
    expect(check.issues).toEqual([]);
    expect(check.value).not.toBeNull();
    expect(check.dropped.some((d) => d.startsWith('malformedItem:observations.gates[1]'))).toBe(true);
  });

  it('drops an undeclared property without voiding the whole grade', () => {
    const check = checkObservations(obs({ commentary: 'here is my reasoning' } as Record<string, unknown>));
    expect(check.issues).toEqual([]);
    expect(check.dropped).toContain('extraProperty:observations.commentary');
  });

  it('does NOT enforce enum membership — ADR-0004 §5 coerces those downstream', () => {
    const check = checkObservations(obs({ severity: 'Catastrophic', gapTypes: ['Vibes gap'] }));
    expect(check.issues).toEqual([]);
    expect(check.value).not.toBeNull();
  });

  it('validates against the very schema the provider adapters send', () => {
    // Not a second contract: every required key the check enforces is the schema's own.
    const required = OBSERVATIONS_JSON_SCHEMA.required as string[];
    for (const key of required) {
      const check = checkObservations(without(obs() as unknown as Record<string, unknown>, key));
      expect(check.issues).toContain(`observations.${key}: required property is absent`);
    }
  });
});

describe('assertObservations', () => {
  it('throws a named, diagnosable error listing the violations', () => {
    let caught: unknown;
    try {
      assertObservations(without(obs() as unknown as Record<string, unknown>, 'universalSubScores'));
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(ObservationsValidationError);
    const err = caught as ObservationsValidationError;
    expect(err.name).toBe('ObservationsValidationError');
    expect(err.issues).toContain('observations.universalSubScores: required property is absent');
    expect(err.message).toContain('universalSubScores');
  });

  it('returns the value unchanged for a compliant response', () => {
    expect(assertObservations(obs()).taskSpecificScore).toBe(85);
  });
});

describe('intakeObservations — absent is not zero', () => {
  it('scores a genuine all-zero answer as a real 0 (this must keep working)', () => {
    const res = intakeObservations(
      obs({
        universalSubScores: zeroSubs(),
        levelScores: { L1: 0, L2: 0, L3: 0 },
        taskSpecificScore: 0,
      }),
      CTX,
    );
    expect(res.entry.universalScore).toBe(0);
    expect(res.entry.finalScore).toBe(0);
    // The zero block is preserved, so `subTotal` can tell it from "no block".
    expect(res.entry.universalSubScores).not.toBeNull();
    expect(res.monotonicOk).toBe(true);
  });

  it('THROWS on the partial response that used to become an identical all-zero grade', () => {
    expect(() => intakeObservations(obs({ universalSubScores: without(fullSubs(), 'completeness') }), CTX)).toThrow(
      ObservationsValidationError,
    );
  });

  it('throws rather than returning a monotonic 0/0/0 ladder for an absent levelScores block', () => {
    expect(() =>
      intakeObservations(
        without(obs() as unknown as Record<string, unknown>, 'levelScores') as unknown as Observations,
        CTX,
      ),
    ).toThrow(ObservationsValidationError);
  });

  it('produces a scored entry for a compliant response', () => {
    const res = intakeObservations(obs(), CTX);
    expect(res.entry.universalScore).toBe(100);
    expect(res.entry.taskSpecificScore).toBe(85);
    expect(res.entry.calibration?.graderModel).toBe('test-model-1');
    expect(res.droppedTags).toEqual([]);
  });

  it('still clamps out-of-range scores rather than rejecting them (range tier unchanged)', () => {
    const res = intakeObservations(obs({ taskSpecificScore: 140, levelScores: { L1: 300, L2: 80, L3: -5 } }), CTX);
    expect(res.entry.taskSpecificScore).toBe(100);
    expect(res.entry.levelScores.L1).toBe(100);
    expect(res.entry.levelScores.L3).toBe(0);
  });

  it('still drops off-enum small-vocab values into droppedTags rather than throwing', () => {
    const res = intakeObservations(
      obs({
        gates: [{ gate: 'NotAGate', verdict: 'Pass' }],
        gapTypes: ['Mechanism gap', 'Vibes gap'],
        severity: 'Catastrophic',
        nextActionType: 'panic',
      }),
      CTX,
    );
    expect(res.droppedTags).toContain('gate:NotAGate=Pass');
    expect(res.droppedTags).toContain('gapType:Vibes gap');
    expect(res.entry.gapTypes).toEqual(['Mechanism gap']);
    expect(res.entry.priority?.severity).toBe('Medium');
    expect(res.entry.priority?.nextActionType).toBe('retest');
  });

  it('reports schema-level removals through the same droppedTags channel', () => {
    const res = intakeObservations(
      obs({ gates: ['Correctness: ok'], commentary: 'chatty' } as Record<string, unknown>),
      CTX,
    );
    expect(res.droppedTags.some((d) => d.startsWith('malformedItem:observations.gates[0]'))).toBe(true);
    expect(res.droppedTags).toContain('extraProperty:observations.commentary');
  });
});

describe('ADR-0004 §5 tag policy (amended 2026-08-08) — pinned so it cannot drift again', () => {
  it('passes free tags through inline and does NOT auto-route them to proposedNewTags', () => {
    const res = intakeObservations(
      obs({
        knowledgeGapTags: ['A tag nobody has ever used before'],
        weaknessTags: ['Another brand-new weakness'],
        proposedNewTags: [],
      }),
      CTX,
    );
    expect(res.entry.knowledgeGapTags).toContain('A tag nobody has ever used before');
    expect(res.entry.weaknessTags).toContain('Another brand-new weakness');
    expect(res.entry.proposedNewTags).toEqual([]);
  });

  it('applies the alias map to free tags — the engine-side soft constraint', () => {
    const res = intakeObservations(obs({ weaknessTags: ['Thin tradeoffs'] }), CTX);
    expect(res.entry.weaknessTags).toEqual(['Thin tradeoff analysis']);
  });

  it('keeps only model-authored proposedNewTags, filtered by tagClass', () => {
    const res = intakeObservations(
      obs({
        proposedNewTags: [
          { tagClass: 'knowledgeGapTags', proposedTag: 'Index-only scan', reason: 'no canonical label fits' },
          { tagClass: 'notATagClass', proposedTag: 'x', reason: 'y' },
        ],
      }),
      CTX,
    );
    expect(res.entry.proposedNewTags).toHaveLength(1);
    expect(res.entry.proposedNewTags[0].proposedTag).toBe('Index-only scan');
    expect(res.entry.proposedNewTags[0].reason).toBe('no canonical label fits');
  });
});

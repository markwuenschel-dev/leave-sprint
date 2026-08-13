import { describe, expect, it } from 'vitest';

import {
  deriveAnswerLevel,
  deriveDemonstratedLevel,
  deriveQualifyingLevel,
  validateMonotonic,
} from './derive';
import type { Gates, LevelScores } from './types';

const scores = (L1: number | null, L2: number | null, L3: number | null): LevelScores => ({
  L1,
  L2,
  L3,
});
const PASS_GATES: Gates = { Correctness: 'Pass' };

describe('deriveAnswerLevel', () => {
  it('returns the highest level scoring at or above the 70 pass mark', () => {
    expect(deriveAnswerLevel(scores(85, 75, 60), PASS_GATES)).toBe('L2');
    expect(deriveAnswerLevel(scores(85, 75, 72), PASS_GATES)).toBe('L3');
    expect(deriveAnswerLevel(scores(85, 60, 40), PASS_GATES)).toBe('L1');
  });

  it('treats 70 as passing and 69 as not', () => {
    expect(deriveAnswerLevel(scores(70, null, null), PASS_GATES)).toBe('L1');
    expect(deriveAnswerLevel(scores(69, null, null), PASS_GATES)).toBe('');
  });

  it('returns no level when nothing reaches the pass mark', () => {
    expect(deriveAnswerLevel(scores(65, 50, 40), PASS_GATES)).toBe('');
  });

  it('is blocked by a failed or partial Correctness gate regardless of score', () => {
    expect(deriveAnswerLevel(scores(95, 95, 95), { Correctness: 'Fail' })).toBe('');
    expect(deriveAnswerLevel(scores(95, 95, 95), { Correctness: 'Partial' })).toBe('');
  });

  it('blocks when the Correctness gate was never recorded', () => {
    expect(deriveAnswerLevel(scores(85, 60, 40), {})).toBe('');
  });

  it('is blocked when any universal dimension sits below 60% of its own max', () => {
    // correctness max is 25, so 14/25 = 56% -> critical.
    expect(deriveAnswerLevel(scores(95, 95, 95), PASS_GATES, { correctness: 14 })).toBe('');
    // completeness max is 10, so 5/10 = 50% -> critical, even though 5 > 14 is false.
    expect(deriveAnswerLevel(scores(95, 95, 95), PASS_GATES, { completeness: 5 })).toBe('');
  });

  it('is not blocked when every recorded dimension is at or above 60%', () => {
    expect(deriveAnswerLevel(scores(95, 95, 95), PASS_GATES, { correctness: 15 })).toBe('L3');
  });

  it('ignores an absent sub-score block for the critical-competency check', () => {
    expect(deriveAnswerLevel(scores(85, 60, 40), PASS_GATES, null)).toBe('L1');
    expect(deriveAnswerLevel(scores(85, 60, 40), PASS_GATES, undefined)).toBe('L1');
  });
});

describe('deriveQualifyingLevel', () => {
  it('returns nothing when there is no answer level to qualify', () => {
    expect(deriveQualifyingLevel('', 'L3', 5, 0)).toBe('');
  });

  it('caps the qualifying level at the problem level', () => {
    expect(deriveQualifyingLevel('L3', 'L2', 5, 0)).toBe('L2');
    expect(deriveQualifyingLevel('L3', 'L1', 5, 0)).toBe('L1');
  });

  it('does not cap when the problem level is unrecorded', () => {
    expect(deriveQualifyingLevel('L3', '', 5, 0)).toBe('L3');
  });

  it('never promotes above the answer level even on an easier problem level', () => {
    expect(deriveQualifyingLevel('L1', 'L3', 5, 0)).toBe('L1');
  });

  it('drops a level when assistance exceeds that level maximum', () => {
    // L3 allows assistance <= 1, L2 allows <= 2.
    expect(deriveQualifyingLevel('L3', 'L3', 5, 1)).toBe('L3');
    expect(deriveQualifyingLevel('L3', 'L3', 5, 2)).toBe('L2');
    expect(deriveQualifyingLevel('L3', 'L3', 5, 3)).toBe('L1');
  });

  it('drops a level when difficulty evidence is below that level minimum', () => {
    // minimum difficulty is L3:4, L2:3, L1:1.
    expect(deriveQualifyingLevel('L3', 'L3', 4, 0)).toBe('L3');
    expect(deriveQualifyingLevel('L3', 'L3', 3, 0)).toBe('L2');
    expect(deriveQualifyingLevel('L3', 'L3', 2, 0)).toBe('L1');
  });

  it('returns nothing when even Level I evidence is not met', () => {
    expect(deriveQualifyingLevel('L2', 'L2', 0, 0)).toBe('');
    expect(deriveQualifyingLevel('L1', 'L1', 1, 4)).toBe('');
  });
});

describe('deriveDemonstratedLevel', () => {
  it('marks a qualifying level "Strong" at 90 and above', () => {
    expect(deriveDemonstratedLevel(scores(95, 95, 90), 'L3')).toBe('Strong Level III');
    expect(deriveDemonstratedLevel(scores(95, 90, 80), 'L2')).toBe('Strong Level II');
    expect(deriveDemonstratedLevel(scores(90, 80, 70), 'L1')).toBe('Strong Level I');
  });

  it('uses the plain level below 90', () => {
    expect(deriveDemonstratedLevel(scores(95, 95, 89), 'L3')).toBe('Level III');
    expect(deriveDemonstratedLevel(scores(95, 89, 80), 'L2')).toBe('Level II');
    expect(deriveDemonstratedLevel(scores(89, 80, 70), 'L1')).toBe('Level I');
  });

  it('scores "Strong" off the qualifying level, not the best level', () => {
    // L1 is 99 but the entry only qualifies at L2 (score 72).
    expect(deriveDemonstratedLevel(scores(99, 72, 40), 'L2')).toBe('Level II');
  });

  it('falls back to Emerging Level I when the best score reaches 50', () => {
    expect(deriveDemonstratedLevel(scores(50, 40, 30), '')).toBe('Emerging Level I');
    expect(deriveDemonstratedLevel(scores(30, 68, 30), '')).toBe('Emerging Level I');
  });

  it('falls back to Below Level I under 50 or with no scores at all', () => {
    expect(deriveDemonstratedLevel(scores(49, 40, 30), '')).toBe('Below Level I');
    expect(deriveDemonstratedLevel(scores(null, null, null), '')).toBe('Below Level I');
  });

  it('treats a null score at the qualifying level as not strong', () => {
    expect(deriveDemonstratedLevel(scores(95, 95, null), 'L3')).toBe('Level III');
  });
});

describe('validateMonotonic', () => {
  it('accepts a non-increasing L1 >= L2 >= L3 series', () => {
    expect(validateMonotonic(scores(80, 70, 60))).toBe(true);
    expect(validateMonotonic(scores(70, 70, 70))).toBe(true);
  });

  it('rejects L2 above L1', () => {
    expect(validateMonotonic(scores(70, 80, 60))).toBe(false);
  });

  it('rejects L3 above L2', () => {
    expect(validateMonotonic(scores(90, 60, 70))).toBe(false);
  });

  it('rejects L3 above L1 even when L2 is missing', () => {
    expect(validateMonotonic(scores(60, null, 70))).toBe(false);
  });

  it('ignores nulls rather than treating them as zero', () => {
    expect(validateMonotonic(scores(null, null, null))).toBe(true);
    expect(validateMonotonic(scores(null, 80, 70))).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';

import { RD } from './referenceData';
import {
  avgSubPct,
  computeFinal,
  computeRaw,
  evidenceWeight,
  scoreBand,
  subPct,
  subTotal,
  taskColor,
  taskLabel,
} from './scoring';
import type { UniversalSubScores } from './types';

/** All six universal dimensions at their maximum. */
const FULL: UniversalSubScores = {
  correctness: 25,
  reasoning: 20,
  judgment: 15,
  validation: 15,
  communication: 15,
  completeness: 10,
};

describe('computeRaw', () => {
  it('weights universal 60% and task-specific 40%', () => {
    expect(computeRaw(80, 70)).toBe(76);
    expect(computeRaw(100, 0)).toBe(60);
    expect(computeRaw(0, 100)).toBe(40);
  });

  it('rounds to one decimal place and returns a number, not a string', () => {
    const r = computeRaw(83, 71); // 49.8 + 28.4 = 78.2
    expect(r).toBe(78.2);
    expect(typeof r).toBe('number');
    // 77*0.6 + 62*0.4 = 46.2 + 24.8 = 71.000000000000006 in IEEE754
    expect(computeRaw(77, 62)).toBe(71);
  });
});

describe('computeFinal', () => {
  it('subtracts penalties from raw', () => {
    expect(computeFinal(80, null, 5)).toBe(75);
  });

  it('accepts penalties as a numeric string (form input path)', () => {
    expect(computeFinal(80, null, '5')).toBe(75);
    expect(computeFinal(80, null, '5.5')).toBe(74.5);
  });

  it('treats an unparseable penalty as zero rather than NaN', () => {
    expect(computeFinal(80, null, 'not-a-number')).toBe(80);
    expect(computeFinal(80, null, '')).toBe(80);
  });

  it('clamps to the cap when the cap binds', () => {
    expect(computeFinal(88, 70, 0)).toBe(70);
  });

  it('leaves the score alone when the cap does not bind', () => {
    expect(computeFinal(88, 70, 25)).toBe(63);
  });

  it('ignores a null, undefined, or NaN cap', () => {
    expect(computeFinal(88, null, 0)).toBe(88);
    expect(computeFinal(88, undefined, 0)).toBe(88);
    expect(computeFinal(88, Number.NaN, 0)).toBe(88);
  });

  it('floors at zero when penalties exceed the raw score', () => {
    expect(computeFinal(10, null, 40)).toBe(0);
    expect(computeFinal(10, 5, 40)).toBe(0);
  });

  it('applies penalties before the cap, so the cap is an upper bound only', () => {
    // raw 95, penalty 30 -> 65, which is already below the 70 cap.
    expect(computeFinal(95, 70, 30)).toBe(65);
  });
});

describe('scoreBand', () => {
  it.each([
    [100, 'Exceptional'],
    [90, 'Exceptional'],
    [89, 'Strong pass'],
    [80, 'Strong pass'],
    [79, 'Pass'],
    [70, 'Pass'],
    [69, 'Borderline'],
    [60, 'Borderline'],
    [59, 'Fail'],
    [50, 'Fail'],
    [49, 'Clear fail'],
    [0, 'Clear fail'],
  ])('maps %i to %s', (score, verdict) => {
    expect(scoreBand(score).verdict).toBe(verdict);
  });

  it('falls back to the lowest band for an out-of-range negative score', () => {
    expect(scoreBand(-1).verdict).toBe('Clear fail');
  });
});

describe('evidenceWeight', () => {
  it.each([
    ['prospective', 1.0],
    ['classA', 0.75],
    ['classB', 0.4],
    ['classC', 0.0],
  ] as const)('weights %s at %f', (cls, weight) => {
    expect(evidenceWeight({ evidenceClass: cls })).toBe(weight);
  });

  it('defaults an empty evidence class to prospective', () => {
    expect(evidenceWeight({ evidenceClass: '' as never })).toBe(1.0);
  });

  it('falls back to 1.0 for an unrecognised class', () => {
    expect(evidenceWeight({ evidenceClass: 'classZ' as never })).toBe(1.0);
  });
});

describe('subPct', () => {
  it('normalises each dimension against its own max, not a shared one', () => {
    // maxes are 25/20/15/15/15/10 — an unweighted percentage would be wrong here.
    expect(subPct(FULL)).toEqual([100, 100, 100, 100, 100, 100]);
  });

  it('returns null for dimensions that are absent', () => {
    expect(subPct({ correctness: 20 })).toEqual([80, null, null, null, null, null]);
  });

  it('returns all nulls for a null or undefined block', () => {
    expect(subPct(null)).toEqual([null, null, null, null, null, null]);
    expect(subPct(undefined)).toEqual([null, null, null, null, null, null]);
  });

  it('keeps an explicit zero distinct from an absent dimension', () => {
    const pct = subPct({ correctness: 0 });
    expect(pct[0]).toBe(0);
    expect(pct[1]).toBeNull();
  });

  it('emits one entry per universal dimension', () => {
    expect(subPct(FULL)).toHaveLength(RD.universalDims.length);
  });
});

describe('subTotal', () => {
  it('sums a complete block to the 100-point universal scale', () => {
    expect(subTotal(FULL)).toBe(100);
  });

  it('returns null when any single dimension is missing', () => {
    const { completeness: _drop, ...partial } = FULL;
    expect(subTotal(partial)).toBeNull();
  });

  it('returns null for a null block', () => {
    expect(subTotal(null)).toBeNull();
    expect(subTotal(undefined)).toBeNull();
  });

  it('totals an all-zero block to 0, not null', () => {
    const zeroed = Object.fromEntries(
      RD.universalDims.map((d) => [d.id, 0]),
    ) as UniversalSubScores;
    expect(subTotal(zeroed)).toBe(0);
  });
});

describe('avgSubPct', () => {
  it('averages per-dimension percentages across scored entries', () => {
    const weak: UniversalSubScores = { ...FULL, correctness: 0 };
    expect(avgSubPct([{ universalSubScores: FULL }, { universalSubScores: weak }])).toEqual([
      50, 100, 100, 100, 100, 100,
    ]);
  });

  it('ignores entries with no sub-score block', () => {
    expect(
      avgSubPct([{ universalSubScores: FULL }, { universalSubScores: null }]),
    ).toEqual([100, 100, 100, 100, 100, 100]);
  });

  it('ignores entries whose block is incomplete rather than averaging a partial', () => {
    expect(
      avgSubPct([{ universalSubScores: FULL }, { universalSubScores: { correctness: 0 } }]),
    ).toEqual([100, 100, 100, 100, 100, 100]);
  });

  it('returns null when no entry carries a usable block', () => {
    expect(avgSubPct([])).toBeNull();
    expect(avgSubPct([{ universalSubScores: null }])).toBeNull();
  });
});

describe('taskColor / taskLabel', () => {
  it('resolves known task types from reference data', () => {
    expect(taskLabel('sysdesign')).toBe('System Design');
    expect(taskColor('coding')).toBe('var(--cyan)');
  });

  it('falls back to the dim colour and the raw id for an unknown task type', () => {
    expect(taskColor('nope')).toBe('var(--text-dim)');
    expect(taskLabel('nope')).toBe('nope');
  });
});

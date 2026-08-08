import { describe, expect, it } from 'vitest';

import {
  DIFFICULTY_DIMENSIONS,
  difficultyLevelFromTotal,
  difficultyTotal,
} from './difficulty';

describe('DIFFICULTY_DIMENSIONS', () => {
  it('declares eight dimensions with three options each (0–2)', () => {
    expect(DIFFICULTY_DIMENSIONS).toHaveLength(8);
    expect(DIFFICULTY_DIMENSIONS.map((d) => `${d.id}:${d.options.length}`)).toEqual(
      DIFFICULTY_DIMENSIONS.map((d) => `${d.id}:3`),
    );
  });

  it('uses unique dimension ids', () => {
    const ids = DIFFICULTY_DIMENSIONS.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('difficultyTotal', () => {
  it('sums the per-dimension scores', () => {
    expect(difficultyTotal({ scope: 2, observe: 1, repro: 0 })).toBe(3);
  });

  it('is zero for an empty score set', () => {
    expect(difficultyTotal({})).toBe(0);
  });

  it('reaches 16 when every dimension is scored at its maximum', () => {
    const maxed = Object.fromEntries(DIFFICULTY_DIMENSIONS.map((d) => [d.id, 2]));
    expect(difficultyTotal(maxed)).toBe(16);
  });
});

describe('difficultyLevelFromTotal', () => {
  it.each([
    [0, 1],
    [2, 1],
    [3, 2],
    [5, 2],
    [6, 3],
    [8, 3],
    [9, 4],
    [12, 4],
    [13, 5],
    [16, 5],
  ])('maps a total of %i to D%i', (total, level) => {
    expect(difficultyLevelFromTotal(total)).toBe(level);
  });

  it('is non-decreasing across the whole 0–16 range', () => {
    const levels = Array.from({ length: 17 }, (_, t) => difficultyLevelFromTotal(t));
    const regressions = levels
      .map((lvl, t) => (t > 0 && lvl < levels[t - 1] ? `total ${t}` : null))
      .filter(Boolean);
    expect(regressions).toEqual([]);
  });

  it('covers every total in 0–16 with a level in 1–5', () => {
    const outOfRange = Array.from({ length: 17 }, (_, t) => t)
      .map((t) => ({ t, lvl: difficultyLevelFromTotal(t) }))
      .filter(({ lvl }) => lvl < 1 || lvl > 5)
      .map(({ t, lvl }) => `total ${t} -> ${lvl}`);
    expect(outOfRange).toEqual([]);
  });

  it('saturates at D5 above the declared maximum', () => {
    expect(difficultyLevelFromTotal(17)).toBe(5);
    expect(difficultyLevelFromTotal(100)).toBe(5);
  });

  it('agrees with difficultyTotal end to end', () => {
    const allZero = Object.fromEntries(DIFFICULTY_DIMENSIONS.map((d) => [d.id, 0]));
    const allMax = Object.fromEntries(DIFFICULTY_DIMENSIONS.map((d) => [d.id, 2]));
    expect(difficultyLevelFromTotal(difficultyTotal(allZero))).toBe(1);
    expect(difficultyLevelFromTotal(difficultyTotal(allMax))).toBe(5);
  });
});

import { describe, expect, it } from 'vitest';

import {
  countPromoEvidence,
  evidenceBurndown,
  nextRecommended,
  PLANNING_HORIZON_DAYS,
  requiredSlots,
} from './promotion';
import { RD } from './referenceData';
import type { LevelId, RubricEntry, TaskType } from './types';

/**
 * Minimal entry carrying only the fields the promotion functions read:
 * taskType, qualifyingDemonstratedLevel, gates.Correctness, assistanceLevel,
 * difficulty and date. Dated in the far past so date cutoffs never bind
 * (evidenceBurndown compares ISO date strings against a local-midnight cutoff).
 */
function entry(over: Partial<RubricEntry> = {}): RubricEntry {
  return {
    id: 'e',
    assessmentId: 'e',
    date: '2000-01-01',
    task: 'task',
    taskType: 'coding',
    difficulty: 5,
    assistanceLevel: 0,
    qualifyingDemonstratedLevel: 'L3',
    gates: { Correctness: 'Pass' },
    ...over,
  } as unknown as RubricEntry;
}

const many = (n: number, over: Partial<RubricEntry> = {}): RubricEntry[] =>
  Array.from({ length: n }, (_, i) => entry({ id: `e${i}`, assessmentId: `e${i}`, ...over }));

describe('requiredSlots', () => {
  it('sums the per-requirement minimums for each level', () => {
    // L1: coding 3 + debugging 2 + knowledge 3 + walkthrough 1
    expect(requiredSlots('L1')).toBe(9);
    // L2: coding 3 + debugging 3 + sysdesign 2 + walkthrough 1
    expect(requiredSlots('L2')).toBe(9);
    // L3: prodeng 3 + sysdesign 3 + walkthrough 1 + behavioral 1
    expect(requiredSlots('L3')).toBe(8);
  });

  it('stays in step with the reference data it derives from', () => {
    for (const lvl of ['L1', 'L2', 'L3'] as LevelId[]) {
      const expected = (RD.promotionEvidence[lvl] as ReadonlyArray<{ min: number }>).reduce(
        (s, r) => s + r.min,
        0,
      );
      expect(requiredSlots(lvl)).toBe(expected);
    }
  });
});

describe('countPromoEvidence', () => {
  it('counts only entries whose qualifying level reaches the target level', () => {
    const rows = countPromoEvidence(
      [
        ...many(2, { taskType: 'coding', qualifyingDemonstratedLevel: 'L3' }),
        entry({ id: 'low', taskType: 'coding', qualifyingDemonstratedLevel: 'L1' }),
      ],
      'L2',
    );
    const coding = rows.find((r) => r.type === 'coding')!;
    expect(coding.count).toBe(2);
    expect(coding.total).toBe(3);
    expect(coding.met).toBe(false); // needs 3
    expect(coding.reasons).toContain('1 not yet L2');
  });

  it('counts a higher qualifying level as evidence for a lower one', () => {
    const rows = countPromoEvidence(many(3, { qualifyingDemonstratedLevel: 'L3' }), 'L1');
    expect(rows.find((r) => r.type === 'coding')!.count).toBe(3);
    expect(rows.find((r) => r.type === 'coding')!.met).toBe(true);
  });

  it('excludes entries whose Correctness gate failed, but not merely partial ones', () => {
    const rows = countPromoEvidence(
      [
        entry({ id: 'a', gates: { Correctness: 'Fail' } }),
        entry({ id: 'b', gates: { Correctness: 'Partial' } }),
      ],
      'L1',
    );
    const coding = rows.find((r) => r.type === 'coding')!;
    expect(coding.count).toBe(1);
    expect(coding.total).toBe(2);
  });

  it('rejects an otherwise-qualifying entry that used too much assistance', () => {
    // L2 coding carries maxAssist 2.
    const rows = countPromoEvidence(many(3, { taskType: 'coding', assistanceLevel: 3 }), 'L2');
    const coding = rows.find((r) => r.type === 'coding')!;
    expect(coding.maxAssist).toBe(2);
    expect(coding.count).toBe(0);
    expect(coding.reasons).toContain('3 A>2');
  });

  it('rejects an otherwise-qualifying entry logged below the difficulty floor', () => {
    // L3 prodeng carries minDiff 4.
    const rows = countPromoEvidence(many(2, { taskType: 'prodeng', difficulty: 2 }), 'L3');
    const prodeng = rows.find((r) => r.type === 'prodeng')!;
    expect(prodeng.minDiff).toBe(4);
    expect(prodeng.count).toBe(0);
    expect(prodeng.reasons).toContain('2 D<4');
  });

  it('reports no reasons once a requirement is satisfied outright', () => {
    const rows = countPromoEvidence(many(3, { taskType: 'coding' }), 'L1');
    const coding = rows.find((r) => r.type === 'coding')!;
    expect(coding.met).toBe(true);
    expect(coding.reasons).toEqual([]);
  });

  it('emits one row per requirement, carrying the reference-data label through', () => {
    const rows = countPromoEvidence([], 'L1');
    expect(rows).toHaveLength(RD.promotionEvidence.L1.length);
    expect(rows.every((r) => r.count === 0 && r.total === 0 && !r.met)).toBe(true);
    expect(rows[0].label).toBe('Coding / implementation tasks');
  });
});

describe('evidenceBurndown', () => {
  const today = new Date('2026-03-10T12:00:00Z');

  it('returns one value per horizon day', () => {
    expect(evidenceBurndown([], 'L1', today, 14)).toHaveLength(14);
    expect(evidenceBurndown([], 'L1', today)).toHaveLength(PLANNING_HORIZON_DAYS);
  });

  it('starts at the full requirement total when there is no evidence', () => {
    expect(evidenceBurndown([], 'L1', today, 5)).toEqual([9, 9, 9, 9, 9]);
  });

  it('subtracts met slots from the total', () => {
    const entries = [
      ...many(2, { taskType: 'coding' }),
      entry({ id: 'd1', taskType: 'debugging' }),
    ];
    // 9 required - (2 coding + 1 debugging) = 6
    expect(evidenceBurndown(entries, 'L1', today, 4)).toEqual([6, 6, 6, 6]);
  });

  it('caps each requirement contribution at its own minimum (no over-credit)', () => {
    // 10 coding entries can only ever retire the 3 coding slots.
    expect(evidenceBurndown(many(10, { taskType: 'coding' }), 'L1', today, 3)).toEqual([6, 6, 6]);
  });

  it('reaches zero once every requirement is satisfied', () => {
    const entries = [
      ...many(3, { taskType: 'coding' }),
      ...many(2, { taskType: 'debugging' }),
      ...many(3, { taskType: 'knowledge' }),
      ...many(1, { taskType: 'walkthrough' }),
    ];
    expect(evidenceBurndown(entries, 'L1', today, 3)).toEqual([0, 0, 0]);
  });

  it('never counts evidence dated after the cutoff day', () => {
    // Dated well past the horizon end -> invisible at every cutoff.
    const future = many(3, { taskType: 'coding', date: '2099-01-01' });
    expect(evidenceBurndown(future, 'L1', today, 3)).toEqual([9, 9, 9]);
  });
});

describe('nextRecommended', () => {
  it('recommends logging the first unstarted requirement when nothing exists', () => {
    const rec = nextRecommended([]);
    expect(rec.done).toBe(false);
    expect(rec.detail).not.toBeNull();
    expect(rec.detail!.lvl).toBe('L1');
    expect(rec.detail!.remaining).toBe(3);
    expect(rec.detail!.reason).toBe('No coding attempts logged yet.');
    expect(rec.text).toBe('Log 3 L1-qualifying coding attempts');
  });

  it('expresses a sub-daily pace as days-per-attempt', () => {
    // 3 remaining over the 30-day planning horizon -> 10.0 days per attempt.
    expect(nextRecommended([]).detail!.pace).toBe('10.0 days per attempt');
  });

  it('expresses a supra-daily pace as attempts per day', () => {
    expect(nextRecommended([], new Date(), 2).detail!.pace).toBe('1.50 attempts/day');
  });

  it('switches to a "reach qualifying" framing once attempts exist but fall short', () => {
    const rec = nextRecommended(many(4, { taskType: 'coding', qualifyingDemonstratedLevel: '' }));
    expect(rec.done).toBe(false);
    expect(rec.detail!.action).toContain('Reach qualifying L1');
    expect(rec.detail!.reason).toBe('4 coding attempts not yet at L1.');
  });

  it('names the level constraints when the requirement carries them', () => {
    // Satisfy every L1 and L2 requirement so an L3 requirement (minDiff 4) surfaces.
    const satisfied = [
      ...many(3, { taskType: 'coding' }),
      ...many(3, { taskType: 'debugging' }),
      ...many(3, { taskType: 'knowledge' }),
      ...many(3, { taskType: 'sysdesign' }),
      ...many(1, { taskType: 'walkthrough' }),
      ...many(1, { taskType: 'behavioral' }),
    ];
    const rec = nextRecommended(satisfied);
    expect(rec.detail!.lvl).toBe('L3');
    expect(rec.detail!.action).toContain('production engineering');
    expect(rec.detail!.action).toContain('(D≥4)');
  });

  it('reports done once every requirement at every level is met', () => {
    const taskCounts: [TaskType, number][] = [
      ['coding', 3],
      ['debugging', 3],
      ['knowledge', 3],
      ['sysdesign', 3],
      ['prodeng', 3],
      ['walkthrough', 1],
      ['behavioral', 1],
    ];
    const all = taskCounts.flatMap(([taskType, n]) =>
      many(n, { taskType }).map((e, i) => ({ ...e, id: `${taskType}-${i}` })),
    );
    const rec = nextRecommended(all);
    expect(rec.done).toBe(true);
    expect(rec.detail).toBeNull();
    expect(rec.text).toContain('All promotion evidence requirements met');
  });

  it('clamps a zero or negative horizon to one day rather than dividing by zero', () => {
    const rec = nextRecommended([], new Date(), 0);
    expect(rec.detail!.daysLeft).toBe(1);
    expect(Number.isFinite(Number.parseFloat(rec.detail!.pace))).toBe(true);
  });
});

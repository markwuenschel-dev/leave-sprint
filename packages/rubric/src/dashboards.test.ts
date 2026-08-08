import { describe, expect, it } from 'vitest';

import { gapBoard, levelTrends, retestSchedule, trust } from './dashboards';
import { RD } from './referenceData';
import type { RubricEntry } from './types';

let seq = 0;
/** Minimal entry with every field the dashboard computations dereference. */
function entry(over: Partial<RubricEntry> = {}): RubricEntry {
  seq += 1;
  return {
    id: `e${seq}`,
    assessmentId: `e${seq}`,
    date: '2026-01-01',
    task: `task ${seq}`,
    taskType: 'coding',
    domain: '',
    primaryDomain: '',
    difficulty: 3,
    assistanceLevel: 0,
    qualifyingDemonstratedLevel: '',
    levelScores: { L1: null, L2: null, L3: null },
    gates: {},
    knowledgeGapTags: [],
    gapTypes: [],
    loggingMode: 'full',
    nextTarget: '',
    ...over,
  } as unknown as RubricEntry;
}

describe('levelTrends', () => {
  it('emits one series per task type that has entries, dropping the empty ones', () => {
    const t = levelTrends([
      entry({ taskType: 'coding', levelScores: { L1: 80, L2: 70, L3: 60 } }),
      entry({ taskType: 'sysdesign', levelScores: { L1: 90, L2: 85, L3: 80 } }),
    ]);
    expect(t.byTaskType.map((s) => s.taskType)).toEqual(['coding', 'sysdesign']);
    expect(t.byTaskType.every((s) => s.count > 0)).toBe(true);
  });

  it('orders each series by date ascending regardless of input order', () => {
    const t = levelTrends([
      entry({ date: '2026-01-03', levelScores: { L1: 80, L2: null, L3: null } }),
      entry({ date: '2026-01-01', levelScores: { L1: 60, L2: null, L3: null } }),
      entry({ date: '2026-01-02', levelScores: { L1: 70, L2: null, L3: null } }),
    ]);
    expect(t.byTaskType[0].L1).toEqual([60, 70, 80]);
  });

  it('drops null level scores from the series but still counts the entry', () => {
    const t = levelTrends([
      entry({ levelScores: { L1: 80, L2: null, L3: null } }),
      entry({ levelScores: { L1: null, L2: null, L3: null } }),
    ]);
    expect(t.byTaskType[0].L1).toEqual([80]);
    expect(t.byTaskType[0].L2).toEqual([]);
    expect(t.byTaskType[0].count).toBe(2);
  });

  it('always reports the four qualifying buckets, bucketing unqualified as None', () => {
    const t = levelTrends([
      entry({ qualifyingDemonstratedLevel: 'L2' }),
      entry({ qualifyingDemonstratedLevel: 'L2' }),
      entry({ qualifyingDemonstratedLevel: '' }),
    ]);
    expect(t.qualifyingDistribution).toEqual([
      { level: 'L1', count: 0 },
      { level: 'L2', count: 2 },
      { level: 'L3', count: 0 },
      { level: 'None', count: 1 },
    ]);
  });

  it('computes gate pass rates over only the entries that recorded that gate', () => {
    const t = levelTrends([
      entry({ gates: { Correctness: 'Pass', Relevance: 'Fail' } }),
      entry({ gates: { Correctness: 'Partial' } }),
    ]);
    const correctness = t.gatePassRates.find((g) => g.gate === 'Correctness')!;
    expect(correctness).toMatchObject({ pass: 1, partial: 1, fail: 0, total: 2, rate: 50 });

    const relevance = t.gatePassRates.find((g) => g.gate === 'Relevance')!;
    expect(relevance).toMatchObject({ pass: 0, fail: 1, total: 1, rate: 0 });
  });

  it('reports a zero rate rather than NaN for a gate nobody recorded', () => {
    const t = levelTrends([entry({ gates: {} })]);
    expect(t.gatePassRates).toHaveLength(RD.gates.length);
    expect(t.gatePassRates.every((g) => g.total === 0 && g.rate === 0)).toBe(true);
  });

  it('returns empty structures for no entries at all', () => {
    const t = levelTrends([]);
    expect(t.byTaskType).toEqual([]);
    expect(t.qualifyingDistribution.every((d) => d.count === 0)).toBe(true);
  });
});

describe('gapBoard', () => {
  it('buckets entries into the four board columns by closure status', () => {
    const board = gapBoard([
      entry({ gapClosureStatus: { status: 'open' } as never }),
      entry({ gapClosureStatus: { status: 'closed' } as never }),
      entry({ gapClosureStatus: { status: 'in progress' } as never }),
    ]);
    expect(board.columns.map((c) => c.status)).toEqual(['open', 'in progress', 'reopened', 'closed']);
    expect(board.columns.map((c) => c.items.length)).toEqual([1, 1, 0, 1]);
  });

  it('omits entries with no closure status from every column', () => {
    const board = gapBoard([entry(), entry({ gapClosureStatus: null })]);
    expect(board.columns.every((c) => c.items.length === 0)).toBe(true);
  });

  it('shows at most three knowledge tags per card', () => {
    const board = gapBoard([
      entry({
        gapClosureStatus: { status: 'open' } as never,
        knowledgeGapTags: ['Backpressure', 'Temporal leakage', 'Group leakage', 'Watermarks and late-arriving data'],
      }),
    ]);
    expect(board.columns[0].items[0].tags).toEqual([
      'Backpressure',
      'Temporal leakage',
      'Group leakage',
    ]);
  });

  it('surfaces recurrence flags as booleans even when the sub-object is absent', () => {
    const board = gapBoard([
      entry({ gapClosureStatus: { status: 'open' } as never, gapRecurrence: null }),
      entry({
        gapClosureStatus: { status: 'open' } as never,
        gapRecurrence: { isRecurring: true, worsening: true } as never,
      }),
    ]);
    expect(board.columns[0].items[0]).toMatchObject({ recurring: false, worsening: false });
    expect(board.columns[0].items[1]).toMatchObject({ recurring: true, worsening: true });
  });

  it('counts gap types across all entries, most frequent first', () => {
    const board = gapBoard([
      entry({ gapTypes: ['Mechanism gap', 'Recall gap'] }),
      entry({ gapTypes: ['Mechanism gap'] }),
      entry({ gapTypes: ['Mechanism gap', 'Recall gap'] }),
    ]);
    expect(board.gapTypeCounts).toEqual([
      { type: 'Mechanism gap', count: 3 },
      { type: 'Recall gap', count: 2 },
    ]);
  });

  it('rolls knowledge tags up into clusters, most frequent first', () => {
    const board = gapBoard([
      entry({ knowledgeGapTags: ['Backpressure', 'Watermarks and late-arriving data'] }),
      entry({ knowledgeGapTags: ['Event time versus processing time', 'React state ownership'] }),
    ]);
    expect(board.clusterCounts[0]).toEqual({ cluster: 'Data engineering pipelines', count: 3 });
    expect(board.clusterCounts).toContainEqual({ cluster: 'React / TS UI state', count: 1 });
  });

  it('files an unrecognised knowledge tag under Other', () => {
    const board = gapBoard([entry({ knowledgeGapTags: ['not a real tag'] })]);
    expect(board.clusterCounts).toEqual([{ cluster: 'Other', count: 1 }]);
  });
});

describe('trust', () => {
  it('averages proof strength to two decimals and ignores entries without it', () => {
    const t = trust([
      entry({ proofStrength: { score: 0.8 } as never }),
      entry({ proofStrength: { score: 0.5 } as never }),
      entry({ proofStrength: null }),
    ]);
    expect(t.avgProof).toBe(0.65);
  });

  it('returns a null average rather than NaN when nothing carries proof strength', () => {
    expect(trust([entry()]).avgProof).toBeNull();
    expect(trust([]).avgProof).toBeNull();
  });

  it('counts only the High anti-inflation risks', () => {
    const t = trust([
      entry({ antiInflationChecks: { overclaimRisk: 'High', llmDependencyRisk: 'Low' } as never }),
      entry({ antiInflationChecks: { overclaimRisk: 'Medium', llmDependencyRisk: 'High' } as never }),
      entry({ antiInflationChecks: null }),
    ]);
    expect(t.overclaimHigh).toBe(1);
    expect(t.llmRiskHigh).toBe(1);
  });

  it('takes tracker health from the latest dated entry that reports it', () => {
    const t = trust([
      entry({ date: '2026-01-05', trackerHealth: { overallHealth: 'Warning' } as never }),
      entry({ date: '2026-01-09', trackerHealth: { overallHealth: 'Good' } as never }),
      entry({ date: '2026-01-11', trackerHealth: null }),
    ]);
    expect(t.trackerHealth).toBe('Good');
  });

  it('reports the fast/full logging split as counts and a percentage', () => {
    const t = trust([
      entry({ loggingMode: 'fast' }),
      entry({ loggingMode: 'fast' }),
      entry({ loggingMode: 'fast' }),
      entry({ loggingMode: 'full' }),
    ]);
    expect(t.logging).toEqual({ fast: 3, full: 1, fastPct: 75 });
  });

  it('reports a zero logging split for no entries rather than dividing by zero', () => {
    expect(trust([]).logging).toEqual({ fast: 0, full: 0, fastPct: 0 });
  });
});

describe('retestSchedule', () => {
  const today = new Date('2026-03-10T00:00:00Z');

  it('ignores entries that need no retest and are not blocked', () => {
    expect(retestSchedule([entry()], today)).toEqual([]);
  });

  it('buckets a retest date on or before today as due-now', () => {
    const [item] = retestSchedule(
      [entry({ retestPlan: { retestDate: '2026-03-01' } as never })],
      today,
    );
    expect(item.bucket).toBe('due-now');
    expect(item.retestDate).toBe('2026-03-01');
  });

  it('buckets a retest date inside the next seven days as due-soon', () => {
    const [item] = retestSchedule(
      [entry({ retestPlan: { retestDate: '2026-03-12' } as never })],
      today,
    );
    expect(item.bucket).toBe('due-soon');
  });

  it('treats High staleness risk as due now even with no retest date', () => {
    const [item] = retestSchedule(
      [entry({ staleness: { stalenessRisk: 'High' } as never })],
      today,
    );
    expect(item.bucket).toBe('due-now');
    expect(item.stalenessRisk).toBe('High');
  });

  it('marks an entry with blockers as blocked, ahead of any date reasoning', () => {
    const [item] = retestSchedule(
      [
        entry({
          retestPlan: { retestDate: '2026-01-01' } as never,
          retestQueue: { blockedBy: ['other-assessment'] } as never,
        }),
      ],
      today,
    );
    expect(item.bucket).toBe('blocked');
  });

  it('weights severity by the role tier, so a tertiary-role gap outranks nothing', () => {
    const items = retestSchedule(
      [
        entry({
          id: 'primary',
          retestPlan: { retestDate: '2026-03-01' } as never,
          priority: { severity: 'Critical', roleWeightTier: 'Primary' } as never,
        }),
        entry({
          id: 'tertiary',
          retestPlan: { retestDate: '2026-03-01' } as never,
          priority: { severity: 'Critical', roleWeightTier: 'Tertiary' } as never,
        }),
      ],
      today,
    );
    // Critical = 4 -> 4*10*1.0 + 5 (due-now) = 45 vs 4*10*0.4 + 5 = 21.
    expect(items.map((i) => i.id)).toEqual(['primary', 'tertiary']);
    expect(items[0].score).toBe(45);
    expect(items[1].score).toBe(21);
  });

  it('defaults an entry with no role information to the Secondary tier weight', () => {
    const [item] = retestSchedule(
      [
        entry({
          retestPlan: { retestDate: '2026-03-01' } as never,
          priority: { severity: 'High' } as never,
        }),
      ],
      today,
    );
    // High = 3 -> 3*10*0.7 + 5 = 26.
    expect(item.score).toBe(26);
  });

  it('sorts the queue by score descending', () => {
    const items = retestSchedule(
      [
        entry({ id: 'low', retestPlan: { retestDate: '2026-03-01' } as never, priority: { severity: 'Low', roleWeightTier: 'Primary' } as never }),
        entry({ id: 'crit', retestPlan: { retestDate: '2026-03-01' } as never, priority: { severity: 'Critical', roleWeightTier: 'Primary' } as never }),
        entry({ id: 'med', retestPlan: { retestDate: '2026-03-01' } as never, priority: { severity: 'Medium', roleWeightTier: 'Primary' } as never }),
      ],
      today,
    );
    expect(items.map((i) => i.id)).toEqual(['crit', 'med', 'low']);
  });

  it('falls back through recommendedAction, retestPrompt, nextTarget, then "Retest"', () => {
    const [a] = retestSchedule(
      [entry({ retestPlan: { retestDate: '2026-03-01', retestPrompt: 'prompt' } as never, priority: { recommendedAction: 'action' } as never })],
      today,
    );
    expect(a.action).toBe('action');

    const [b] = retestSchedule(
      [entry({ retestPlan: { retestDate: '2026-03-01', retestPrompt: 'prompt' } as never, nextTarget: 'target' })],
      today,
    );
    expect(b.action).toBe('prompt');

    const [c] = retestSchedule([entry({ staleness: { stalenessRisk: 'High' } as never, nextTarget: 'target' })], today);
    expect(c.action).toBe('target');

    const [d] = retestSchedule([entry({ staleness: { stalenessRisk: 'High' } as never })], today);
    expect(d.action).toBe('Retest');
  });
});

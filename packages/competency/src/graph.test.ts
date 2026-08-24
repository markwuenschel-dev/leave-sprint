/**
 * Pins the two load-bearing properties the graph module names in its own header,
 * plus the arithmetic behind them.
 *
 * Regression class:
 *   1. DOUBLE COUNTING — one attempt reaching a competency through two channels and
 *      quietly doubling its own influence. `routeEvidence` must keep at most one
 *      contribution per (attempt, competency), at the strongest channel.
 *   2. null-vs-0 COLLAPSE — a never-measured competency scoring 0 instead of null.
 *      "Tried and failed" and "never measured" are different claims and the UI
 *      renders them differently.
 * Also pinned: the weighted (not arithmetic) mean, recency actually moving the
 * number, newest-first contribution order, and the confidence/status thresholds.
 *
 * Every `asOf` is a literal — no clock is read anywhere in this file.
 */

import { describe, expect, it } from 'vitest';

import { COMPETENCIES, COMPETENCY_IDS } from './dimensions';
import type { CompetencyEvidence } from './evidence';
import {
  CONFIDENCE_MIX,
  CONFIDENCE_SATURATION_COUNT,
  CONFIDENCE_SATURATION_WEIGHT,
  STATUS_THRESHOLDS,
  buildCompetencyGraph,
  graphNodes,
  provenNodes,
} from './graph';

const ASOF = '2026-08-23';

function isoDaysBefore(days: number, asOf: string = ASOF): string {
  return new Date(Date.parse(asOf) - days * 86_400_000).toISOString().slice(0, 10);
}

/**
 * Default fixture is deliberately FULL WEIGHT: prospective class, unaided, no LLM,
 * a 1.0 source and same-day, so `weighEvidence().total === 1` and every downstream
 * number in this file is exact rather than approximately-something.
 */
function ev(over: Partial<CompetencyEvidence> & { id: string }): CompetencyEvidence {
  return {
    date: ASOF,
    score: 80,
    evidenceClass: 'prospective',
    assistanceLevel: 0,
    sources: ['live coding'],
    ...over,
  };
}

describe('empty graph', () => {
  const g = buildCompetencyGraph([], ASOF);

  it('records the asOf it was built against', () => {
    expect(g.asOf).toBe(ASOF);
  });

  it('counts no evidence and nothing unrouted', () => {
    expect(g.evidenceCount).toBe(0);
    expect(g.unroutedCount).toBe(0);
  });

  it('has one node per competency, in registry order', () => {
    expect(Object.keys(g.nodes).sort()).toEqual([...COMPETENCY_IDS].sort());
    expect(graphNodes(g).map((n) => n.id)).toEqual(COMPETENCIES.map((c) => c.id));
  });

  it('scores every node null — never 0 — with zero confidence and unproven status', () => {
    for (const n of graphNodes(g)) {
      expect(n.score, n.id).toBeNull();
      expect(n.score, n.id).not.toBe(0);
      expect(n.confidence, n.id).toBe(0);
      expect(n.status, n.id).toBe('unproven');
      expect(n.weight, n.id).toBe(0);
      expect(n.count, n.id).toBe(0);
      expect(n.contributions, n.id).toEqual([]);
      expect(n.lastEvidenceDate, n.id).toBeNull();
      expect(n.staleness, n.id).toBe('Unknown');
      expect(n.strongestChannel, n.id).toBeNull();
    }
  });

  it('has no proven nodes', () => {
    expect(provenNodes(g)).toEqual([]);
  });
});

describe('null means never measured, 0 means tried and failed', () => {
  const g = buildCompetencyGraph(
    [ev({ id: 'zero', competencies: ['debugging'], score: 0 })],
    ASOF,
  );

  it('scores an untouched competency null while a genuinely-zero one scores 0', () => {
    expect(g.nodes.debugging.score).toBe(0);
    expect(g.nodes.testing.score).toBeNull();
    expect(g.nodes['sql-reasoning'].score).toBeNull();
  });

  it('a 0-scoring attempt still counts as evidence and confers confidence', () => {
    expect(g.evidenceCount).toBe(1);
    expect(g.nodes.debugging.count).toBe(1);
    expect(g.nodes.debugging.confidence).toBeGreaterThan(0);
    expect(g.nodes.testing.confidence).toBe(0);
  });
});

describe('no double counting', () => {
  // `coding` feeds implementation + testing; `Python` feeds implementation +
  // debugging + testing. implementation and testing are reachable BOTH ways.
  const g = buildCompetencyGraph(
    [ev({ id: 'e1', taskType: 'coding', domains: ['Python'], score: 90 })],
    ASOF,
  );

  it('records exactly one contribution per competency for that one attempt', () => {
    expect(g.nodes.implementation.contributions).toHaveLength(1);
    expect(g.nodes.testing.contributions).toHaveLength(1);
    expect(g.nodes.debugging.contributions).toHaveLength(1);
    expect(g.nodes.implementation.contributions[0].evidenceId).toBe('e1');
    expect(g.nodes.implementation.count).toBe(1);
  });

  it('keeps the STRONGER channel — taskType (0.7) beats primary domain (0.5 x 0.6)', () => {
    expect(g.nodes.implementation.contributions[0].channel).toBe('taskType');
    expect(g.nodes.testing.contributions[0].channel).toBe('taskType');
    expect(g.nodes.implementation.contributions[0].weight).toBeCloseTo(0.7, 10);
    expect(g.nodes.implementation.weight).toBeCloseTo(0.7, 10);
  });

  it('routes a domain-only competency through the domain channel at its positional weight', () => {
    expect(g.nodes.debugging.contributions[0].channel).toBe('domain');
    expect(g.nodes.debugging.contributions[0].weight).toBeCloseTo(0.3, 10);
  });

  it('does not inflate the attempt count', () => {
    expect(g.evidenceCount).toBe(1);
    expect(g.unroutedCount).toBe(0);
  });

  it('an explicit competency list uses the direct channel at full strength', () => {
    const d = buildCompetencyGraph(
      [ev({ id: 'e2', competencies: ['debugging'], taskType: 'coding', domains: ['Python'] })],
      ASOF,
    );
    expect(d.nodes.debugging.contributions).toHaveLength(1);
    expect(d.nodes.debugging.contributions[0].channel).toBe('direct');
    expect(d.nodes.debugging.contributions[0].weight).toBe(1);
    expect(d.nodes.debugging.strongestChannel).toBe('direct');
    // The other two channels still land where direct did not claim anything.
    expect(d.nodes.implementation.contributions[0].channel).toBe('taskType');
  });

  it('takes the best positional weight when the same domain feeder appears twice', () => {
    const d = buildCompetencyGraph(
      [ev({ id: 'e3', domains: ['Databases', 'SQL'] })],
      ASOF,
    );
    // sql-reasoning is fed by both; primary (0.6) must win over secondary (0.25).
    expect(d.nodes['sql-reasoning'].contributions).toHaveLength(1);
    expect(d.nodes['sql-reasoning'].contributions[0].weight).toBeCloseTo(0.5 * 0.6, 10);
  });

  it('ignores domains past the third position (§9.4 positional weight 0)', () => {
    const d = buildCompetencyGraph(
      [
        ev({
          id: 'e4',
          domains: ['Algorithms/DSA', 'Algorithms/DSA', 'Algorithms/DSA', 'Machine Learning'],
        }),
      ],
      ASOF,
    );
    expect(d.nodes['ml-implementation'].contributions).toEqual([]);
    expect(d.nodes['ml-implementation'].score).toBeNull();
    expect(d.nodes.implementation.contributions).toHaveLength(1);
  });
});

describe('unrouted attempts', () => {
  it('counts an unscored attempt as unrouted and contributes nothing', () => {
    const g = buildCompetencyGraph(
      [ev({ id: 'u1', score: null, competencies: ['debugging'] })],
      ASOF,
    );
    expect(g.unroutedCount).toBe(1);
    expect(g.evidenceCount).toBe(0);
    expect(g.nodes.debugging.score).toBeNull();
    expect(g.nodes.debugging.contributions).toEqual([]);
  });

  it('counts a Class C attempt as unrouted — §10 says it is not numerically scorable', () => {
    const g = buildCompetencyGraph(
      [ev({ id: 'u2', evidenceClass: 'classC', competencies: ['debugging'] })],
      ASOF,
    );
    expect(g.unroutedCount).toBe(1);
    expect(g.evidenceCount).toBe(0);
    expect(g.nodes.debugging.score).toBeNull();
    expect(g.nodes.debugging.confidence).toBe(0);
  });

  it('counts a knowledge attempt in an unknown domain as unrouted', () => {
    const g = buildCompetencyGraph(
      [ev({ id: 'u3', taskType: 'knowledge', domains: ['Underwater Basket Weaving'] })],
      ASOF,
    );
    expect(g.unroutedCount).toBe(1);
    expect(g.evidenceCount).toBe(0);
    expect(graphNodes(g).every((n) => n.score === null)).toBe(true);
  });

  it('routes a knowledge attempt through its domain alone when the domain is known', () => {
    const g = buildCompetencyGraph([ev({ id: 'u4', taskType: 'knowledge', domains: ['SQL'] })], ASOF);
    expect(g.unroutedCount).toBe(0);
    expect(g.evidenceCount).toBe(1);
    expect(g.nodes['sql-reasoning'].contributions[0].channel).toBe('domain');
  });

  /**
   * The blast radius of the domains.ts:182 `Object.hasOwn` guard. `routeEvidence`
   * (graph.ts:120) `for...of`s whatever `competenciesForDomain` hands back, so an
   * inherited Object.prototype member there does not degrade — it takes the whole
   * graph build down with a TypeError. `primaryDomain` is an unvalidated free
   * string upstream, so a build must survive one.
   */
  it('treats an Object.prototype key as an unknown domain rather than throwing', () => {
    for (const key of ['toString', 'constructor', 'hasOwnProperty', '__proto__']) {
      const g = buildCompetencyGraph([ev({ id: 'proto', domains: [key] })], ASOF);
      expect(g.unroutedCount, key).toBe(1);
      expect(g.evidenceCount, key).toBe(0);
    }
    // Same handling as any other unrecognised string.
    expect(buildCompetencyGraph([ev({ id: 'other', domains: ['Nonsense'] })], ASOF).unroutedCount)
      .toBe(1);
  });

  it('survives a prototype-key evidence source string too', () => {
    const g = buildCompetencyGraph(
      [ev({ id: 'src', competencies: ['debugging'], sources: ['toString', 'constructor'] })],
      ASOF,
    );
    // Falls back to the neutral default rather than multiplying by a Function.
    expect(g.nodes.debugging.contributions[0].breakdown.source).toBe(0.85);
    expect(g.nodes.debugging.score).toBe(80);
  });

  it('tallies a mixed batch correctly', () => {
    const g = buildCompetencyGraph(
      [
        ev({ id: 'ok', competencies: ['debugging'] }),
        ev({ id: 'no-score', score: null, competencies: ['debugging'] }),
        ev({ id: 'class-c', evidenceClass: 'classC', competencies: ['debugging'] }),
        ev({ id: 'nowhere', taskType: 'knowledge' }),
      ],
      ASOF,
    );
    expect(g.evidenceCount).toBe(1);
    expect(g.unroutedCount).toBe(3);
    expect(g.nodes.debugging.count).toBe(1);
  });
});

describe('weighted mean, not arithmetic mean', () => {
  // Item A carries Class A (0.75) and the default 0.85 source -> 0.6375.
  // Item B is prospective (1.0) with the same 0.85 source -> 0.85.
  // Arithmetic mean of 100 and 50 would be 75; the weighted mean is 71.4.
  const g = buildCompetencyGraph(
    [
      { id: 'a', date: ASOF, score: 100, competencies: ['debugging'], evidenceClass: 'classA' },
      { id: 'b', date: ASOF, score: 50, competencies: ['debugging'], evidenceClass: 'prospective' },
    ],
    ASOF,
  );

  it('weights each contribution by its evidence weight', () => {
    expect(g.nodes.debugging.contributions.map((c) => c.weight)).toEqual([0.6375, 0.85]);
    expect(g.nodes.debugging.weight).toBeCloseTo(1.4875, 10);
  });

  it('produces 71.4, not the arithmetic 75', () => {
    expect(g.nodes.debugging.score).toBe(71.4);
    expect(g.nodes.debugging.score).not.toBe(75);
  });

  it('counts two distinct attempts', () => {
    expect(g.nodes.debugging.count).toBe(2);
    expect(g.evidenceCount).toBe(2);
  });
});

describe('recency moves the score', () => {
  const g = buildCompetencyGraph(
    [
      ev({ id: 'fresh', score: 100, competencies: ['debugging'], date: ASOF }),
      ev({ id: 'ancient', score: 0, competencies: ['debugging'], date: isoDaysBefore(365) }),
    ],
    ASOF,
  );

  it('lets the recent attempt dominate the year-old one', () => {
    // fresh weight 1.0, ancient weight = RECENCY_FLOOR 0.2 -> 100/1.2 * 1.0
    expect(g.nodes.debugging.score).toBe(83.3);
    expect(g.nodes.debugging.score as number).toBeGreaterThan(50);
  });

  it('reverses direction when the ages are swapped', () => {
    const flipped = buildCompetencyGraph(
      [
        ev({ id: 'fresh', score: 0, competencies: ['debugging'], date: ASOF }),
        ev({ id: 'ancient', score: 100, competencies: ['debugging'], date: isoDaysBefore(365) }),
      ],
      ASOF,
    );
    expect(flipped.nodes.debugging.score).toBe(16.7);
    expect(flipped.nodes.debugging.score as number).toBeLessThan(50);
  });

  it('tracks the newest contributing date and its staleness band', () => {
    expect(g.nodes.debugging.lastEvidenceDate).toBe(ASOF);
    expect(g.nodes.debugging.staleness).toBe('Low');
  });

  it('reports High staleness when everything is old', () => {
    const old = buildCompetencyGraph(
      [ev({ id: 'o', competencies: ['debugging'], date: isoDaysBefore(200) })],
      ASOF,
    );
    expect(old.nodes.debugging.staleness).toBe('High');
    expect(old.nodes.debugging.lastEvidenceDate).toBe(isoDaysBefore(200));
  });
});

describe('contributions are newest-first', () => {
  const g = buildCompetencyGraph(
    [
      ev({ id: 'mid', competencies: ['debugging'], date: '2026-05-01' }),
      ev({ id: 'oldest', competencies: ['debugging'], date: '2026-01-01' }),
      ev({ id: 'newest', competencies: ['debugging'], date: '2026-08-01' }),
    ],
    ASOF,
  );

  it('sorts descending by date', () => {
    expect(g.nodes.debugging.contributions.map((c) => c.evidenceId)).toEqual([
      'newest',
      'mid',
      'oldest',
    ]);
    expect(g.nodes.debugging.contributions.map((c) => c.date)).toEqual([
      '2026-08-01',
      '2026-05-01',
      '2026-01-01',
    ]);
  });

  it('reports the newest date as lastEvidenceDate', () => {
    expect(g.nodes.debugging.lastEvidenceDate).toBe('2026-08-01');
  });

  it('carries the label and the full breakdown through for explainability', () => {
    const labelled = buildCompetencyGraph(
      [ev({ id: 'lbl', competencies: ['debugging'], label: 'Mock #3' })],
      ASOF,
    );
    const c = labelled.nodes.debugging.contributions[0];
    expect(c.label).toBe('Mock #3');
    expect(c.breakdown.total).toBe(1);
    expect(c.score).toBe(80);
  });
});

describe('confidence and status thresholds', () => {
  it('one fresh full-weight attempt is emerging, not established', () => {
    const g = buildCompetencyGraph([ev({ id: 's1', competencies: ['debugging'] })], ASOF);
    const n = g.nodes.debugging;
    // volume = min(1, 1/4) = 0.25; breadth = min(1, 1/4) = 0.25; freshness = 1
    const expected =
      CONFIDENCE_MIX.volume * (1 / CONFIDENCE_SATURATION_WEIGHT) +
      CONFIDENCE_MIX.breadth * (1 / CONFIDENCE_SATURATION_COUNT) +
      CONFIDENCE_MIX.freshness * 1;
    expect(expected).toBeCloseTo(0.4375, 10);
    expect(n.confidence).toBe(0.438);
    expect(n.confidence).toBeGreaterThanOrEqual(STATUS_THRESHOLDS.emerging);
    expect(n.confidence).toBeLessThan(STATUS_THRESHOLDS.established);
    expect(n.status).toBe('emerging');
  });

  it('two fresh full-weight attempts reach established at exactly 0.625', () => {
    const g = buildCompetencyGraph(
      [ev({ id: 's1', competencies: ['debugging'] }), ev({ id: 's2', competencies: ['debugging'] })],
      ASOF,
    );
    // 0.5*0.5 + 0.25*0.5 + 0.25*1
    expect(g.nodes.debugging.confidence).toBe(0.625);
    expect(g.nodes.debugging.status).toBe('established');
  });

  it('four fresh full-weight attempts saturate confidence at 1', () => {
    const g = buildCompetencyGraph(
      ['s1', 's2', 's3', 's4'].map((id) => ev({ id, competencies: ['debugging'] })),
      ASOF,
    );
    expect(g.nodes.debugging.weight).toBe(4);
    expect(g.nodes.debugging.count).toBe(4);
    expect(g.nodes.debugging.confidence).toBe(1);
    expect(g.nodes.debugging.status).toBe('established');
  });

  it('confidence cannot exceed 1 no matter how much evidence piles up', () => {
    const g = buildCompetencyGraph(
      Array.from({ length: 20 }, (_, i) => ev({ id: `m${i}`, competencies: ['debugging'] })),
      ASOF,
    );
    expect(g.nodes.debugging.confidence).toBe(1);
  });

  it('leaves a thin, stale attempt unproven even though it has a score', () => {
    const g = buildCompetencyGraph(
      [
        {
          id: 'thin',
          date: isoDaysBefore(365),
          score: 85,
          competencies: ['debugging'],
          evidenceClass: 'classB',
          assistanceLevel: 4,
        },
      ],
      ASOF,
    );
    const n = g.nodes.debugging;
    expect(n.score).toBe(85);
    expect(n.confidence).toBeLessThan(STATUS_THRESHOLDS.emerging);
    expect(n.status).toBe('unproven');
  });
});

describe('provenNodes', () => {
  const g = buildCompetencyGraph(
    [
      ev({ id: 'p1', competencies: ['debugging'], score: 90 }),
      ev({ id: 'p2', competencies: ['testing'], score: 60 }),
      ev({ id: 'p3', competencies: ['reliability'], score: 75 }),
      // Thin enough to stay unproven, so it must be filtered out.
      {
        id: 'p4',
        date: isoDaysBefore(365),
        score: 99,
        competencies: ['serving'],
        evidenceClass: 'classB',
        assistanceLevel: 5,
      },
    ],
    ASOF,
  );

  it('excludes unproven nodes, including a high-scoring but unsupported one', () => {
    const ids = provenNodes(g).map((n) => n.id);
    expect(ids).not.toContain('serving');
    expect(g.nodes.serving.status).toBe('unproven');
    expect(ids).not.toContain('implementation');
  });

  it('sorts by score descending', () => {
    expect(provenNodes(g).map((n) => n.id)).toEqual(['debugging', 'reliability', 'testing']);
    const scores = provenNodes(g).map((n) => n.score ?? 0);
    for (let i = 1; i < scores.length; i += 1) {
      expect(scores[i - 1]).toBeGreaterThanOrEqual(scores[i]);
    }
  });

  it('breaks score ties by competency id', () => {
    const tied = buildCompetencyGraph(
      [
        ev({ id: 't1', competencies: ['testing'], score: 70 }),
        ev({ id: 't2', competencies: ['debugging'], score: 70 }),
        ev({ id: 't3', competencies: ['reliability'], score: 70 }),
      ],
      ASOF,
    );
    expect(provenNodes(tied).map((n) => n.id)).toEqual(['debugging', 'reliability', 'testing']);
  });
});

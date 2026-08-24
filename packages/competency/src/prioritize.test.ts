/**
 * Pins the two optimisation modes and the decision table behind them.
 *
 * Regression class: the modes collapsing into one ranking (the whole point is that
 * "what makes me better" and "what clears next Tuesday's loop" are different
 * answers — `urgency` weighted 0 vs 0.2 is the structural difference), a
 * never-measured competency being handed retention advice it cannot use ("nothing
 * to forget"), `chooseAction` sending a heavy unmeasured dimension to a one-hour
 * cold attempt, a competency no pursued role uses leaking into the list, and
 * non-deterministic ordering making the recommendation unstable between renders.
 *
 * Every `asOf` is a literal — no clock is read anywhere in this file.
 */

import { describe, expect, it } from 'vitest';

import type { CompetencyEvidence } from './evidence';
import { type CompetencyNode, buildCompetencyGraph } from './graph';
import {
  ACTION_HOURS,
  ACTION_LABEL,
  MODE_WEIGHTS,
  UNPROVEN_SEVERITY,
  UNSCHEDULED_URGENCY,
  URGENCY_FULL_WITHIN_DAYS,
  URGENCY_HORIZON_DAYS,
  chooseAction,
  prioritize,
} from './prioritize';

const ASOF = '2026-08-23';

function isoDaysBefore(days: number, asOf: string = ASOF): string {
  return new Date(Date.parse(asOf) - days * 86_400_000).toISOString().slice(0, 10);
}

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

/** Minimal synthetic node, for exercising `chooseAction` directly. */
function node(over: Partial<CompetencyNode> = {}): CompetencyNode {
  return {
    id: 'implementation',
    label: 'Implementation & code quality',
    group: 'engineering',
    score: null,
    weight: 0,
    count: 0,
    confidence: 0,
    status: 'unproven',
    lastEvidenceDate: null,
    staleness: 'Unknown',
    strongestChannel: null,
    contributions: [],
    ...over,
  };
}

/**
 * One stale, mediocre measurement on `implementation`; everything else untouched.
 * 2026-01-01 is 234 days before ASOF, so recency has bottomed out at the floor.
 */
const GRAPH = buildCompetencyGraph(
  [ev({ id: 'g1', competencies: ['implementation'], score: 85, date: '2026-01-01' })],
  ASOF,
);

const CAMPAIGN = { role: 'bia', daysUntil: 3 } as const;

describe('MODE_WEIGHTS', () => {
  it('urgency is the defining difference — non-zero for campaign, exactly 0 long-term', () => {
    expect(MODE_WEIGHTS['long-term'].urgency).toBe(0);
    expect(MODE_WEIGHTS.campaign.urgency).toBeGreaterThan(0);
    expect(MODE_WEIGHTS.campaign.urgency).toBe(0.2);
  });

  it('campaign leans harder on role relevance, long-term on durability', () => {
    expect(MODE_WEIGHTS.campaign.roleRelevance).toBeGreaterThan(
      MODE_WEIGHTS['long-term'].roleRelevance,
    );
    expect(MODE_WEIGHTS['long-term'].retentionRisk).toBeGreaterThan(
      MODE_WEIGHTS.campaign.retentionRisk,
    );
  });

  it('every mode weight is non-negative and the positive terms sum to 1', () => {
    for (const [mode, w] of Object.entries(MODE_WEIGHTS)) {
      const positive = w.roleRelevance + w.severity + w.lift + w.urgency + w.retentionRisk;
      expect(positive, mode).toBeCloseTo(1 - w.provenPenalty, 10);
      for (const [k, v] of Object.entries(w)) expect(v, `${mode}.${k}`).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('the two modes produce different rankings on the same graph', () => {
  const longTerm = prioritize(GRAPH, { mode: 'long-term', asOf: ASOF, limit: 5 });
  const campaign = prioritize(GRAPH, { mode: 'campaign', asOf: ASOF, campaign: CAMPAIGN, limit: 5 });

  it('recommends a different top action in each mode', () => {
    expect(longTerm[0].competency).toBe('implementation');
    expect(longTerm[0].action).toBe('retention-retest');
    expect(campaign[0].competency).toBe('semantic-modeling');
    expect(campaign[0].competency).not.toBe(longTerm[0].competency);
  });

  it('stamps the mode it was asked for on every result', () => {
    expect(longTerm.every((a) => a.mode === 'long-term')).toBe(true);
    expect(campaign.every((a) => a.mode === 'campaign')).toBe(true);
  });

  it('long-term reports zero urgency; campaign reports full urgency at 3 days out', () => {
    expect(longTerm.every((a) => a.terms.urgency === 0)).toBe(true);
    expect(campaign.every((a) => a.terms.urgency === 1)).toBe(true);
  });

  it('campaign attributes every action to the campaign role', () => {
    expect(campaign.every((a) => a.role === 'bia')).toBe(true);
    expect(longTerm.some((a) => a.role !== 'bia')).toBe(true);
  });

  it('scores are sorted descending in both modes', () => {
    for (const list of [longTerm, campaign]) {
      for (let i = 1; i < list.length; i += 1) {
        expect(list[i - 1].score).toBeGreaterThanOrEqual(list[i].score);
      }
    }
  });
});

describe('urgencyFromDays via the campaign term', () => {
  const urgencyAt = (daysUntil: number | null) =>
    prioritize(GRAPH, {
      mode: 'campaign',
      asOf: ASOF,
      campaign: { role: 'bia', daysUntil },
      only: ['sql-reasoning'],
    })[0].terms.urgency;

  it('is 1 inside the full-urgency window', () => {
    expect(urgencyAt(0)).toBe(1);
    expect(urgencyAt(URGENCY_FULL_WITHIN_DAYS)).toBe(1);
    expect(urgencyAt(-4)).toBe(1);
  });

  it('is 0 at and beyond the horizon', () => {
    expect(urgencyAt(URGENCY_HORIZON_DAYS)).toBe(0);
    expect(urgencyAt(90)).toBe(0);
  });

  it('is the unscheduled floor when no date is known', () => {
    expect(urgencyAt(null)).toBe(UNSCHEDULED_URGENCY);
    expect(UNSCHEDULED_URGENCY).toBe(0.4);
  });

  it('decreases monotonically between the window and the horizon', () => {
    let prev = urgencyAt(URGENCY_FULL_WITHIN_DAYS);
    for (let d = URGENCY_FULL_WITHIN_DAYS + 1; d <= URGENCY_HORIZON_DAYS; d += 1) {
      const u = urgencyAt(d);
      expect(u, `day ${d}`).toBeLessThan(prev);
      expect(u, `day ${d}`).toBeGreaterThanOrEqual(0);
      prev = u;
    }
  });
});

describe('chooseAction decision table', () => {
  it('never measured + heavy weight -> build', () => {
    expect(chooseAction(node({ score: null }), 20)).toBe('build');
    expect(chooseAction(node({ score: null }), 25)).toBe('build');
  });

  it('never measured + light weight -> cold-attempt', () => {
    expect(chooseAction(node({ score: null }), 19)).toBe('cold-attempt');
    expect(chooseAction(node({ score: null }), 5)).toBe('cold-attempt');
    expect(chooseAction(node({ score: null }), 0)).toBe('cold-attempt');
  });

  it('high staleness + score >= 70 -> retention-retest', () => {
    expect(chooseAction(node({ score: 70, staleness: 'High', status: 'established' }), 20)).toBe(
      'retention-retest',
    );
    expect(chooseAction(node({ score: 95, staleness: 'High', status: 'established' }), 5)).toBe(
      'retention-retest',
    );
  });

  it('high staleness but a weak score is a teaching problem, not a retention one', () => {
    expect(chooseAction(node({ score: 69, staleness: 'High' }), 20)).toBe('retry');
    expect(chooseAction(node({ score: 40, staleness: 'High' }), 20)).toBe('teach');
  });

  it('score < 60 -> teach', () => {
    expect(chooseAction(node({ score: 59.9, staleness: 'Low' }), 20)).toBe('teach');
    expect(chooseAction(node({ score: 0, staleness: 'Low' }), 20)).toBe('teach');
  });

  it('60 <= score < 70 -> retry', () => {
    expect(chooseAction(node({ score: 60, staleness: 'Low' }), 20)).toBe('retry');
    expect(chooseAction(node({ score: 69.9, staleness: 'Low' }), 20)).toBe('retry');
  });

  it('a passing but only-emerging score asks for transfer', () => {
    expect(chooseAction(node({ score: 70, status: 'emerging', staleness: 'Low' }), 20)).toBe(
      'transfer',
    );
  });

  it('an established score with a single attempt asks for a probe, otherwise a mock', () => {
    expect(
      chooseAction(node({ score: 85, status: 'established', staleness: 'Low', count: 1 }), 20),
    ).toBe('probe');
    expect(
      chooseAction(node({ score: 85, status: 'established', staleness: 'Low', count: 2 }), 20),
    ).toBe('mock');
  });

  it('every ActionKind has an hour cost and a label', () => {
    expect(Object.keys(ACTION_HOURS).sort()).toEqual(Object.keys(ACTION_LABEL).sort());
    for (const [k, h] of Object.entries(ACTION_HOURS)) expect(h, k).toBeGreaterThan(0);
  });
});

describe('retention risk', () => {
  const all = prioritize(GRAPH, { mode: 'long-term', asOf: ASOF, limit: 40 });
  const byId = new Map(all.map((a) => [a.competency, a]));

  it('is 0 for a never-measured competency — nothing to forget', () => {
    expect(GRAPH.nodes.debugging.score).toBeNull();
    expect(byId.get('debugging')?.terms.retentionRisk).toBe(0);
    expect(byId.get('testing')?.terms.retentionRisk).toBe(0);
  });

  it('is positive for a measured competency that has gone stale', () => {
    expect(GRAPH.nodes.implementation.score).toBe(85);
    expect(GRAPH.nodes.implementation.staleness).toBe('High');
    // 234 days puts recency on the 0.2 floor, so risk = 1 - 0.2.
    expect(byId.get('implementation')?.terms.retentionRisk).toBe(0.8);
  });

  it('is 0 for a freshly measured competency', () => {
    const fresh = buildCompetencyGraph([ev({ id: 'f1', competencies: ['implementation'] })], ASOF);
    const a = prioritize(fresh, {
      mode: 'long-term',
      asOf: ASOF,
      only: ['implementation'],
    })[0];
    expect(a.terms.retentionRisk).toBe(0);
  });

  it('assigns the unproven severity to every never-measured competency', () => {
    expect(byId.get('debugging')?.terms.severity).toBe(UNPROVEN_SEVERITY);
    expect(byId.get('implementation')?.terms.severity).toBe(0.15);
  });
});

describe('scope of the ranking', () => {
  it('excludes a competency no pursued role uses', () => {
    // BIA's profile has no `implementation`, `debugging` or `serving`.
    const camp = prioritize(GRAPH, {
      mode: 'campaign',
      asOf: ASOF,
      campaign: CAMPAIGN,
      limit: 40,
    });
    const ids = camp.map((a) => a.competency);
    expect(ids).not.toContain('implementation');
    expect(ids).not.toContain('debugging');
    expect([...ids].sort()).toEqual(
      [
        'business-context',
        'data-quality',
        'semantic-modeling',
        'sql-reasoning',
        'stakeholder-translation',
        'statistical-reasoning',
      ].sort(),
    );
  });

  it('returns nothing when `only` names competencies the campaign role ignores', () => {
    expect(
      prioritize(GRAPH, {
        mode: 'campaign',
        asOf: ASOF,
        campaign: CAMPAIGN,
        only: ['implementation', 'debugging'],
      }),
    ).toEqual([]);
  });

  it('lets an explicitly expected competency back in even at zero profile weight', () => {
    const out = prioritize(GRAPH, {
      mode: 'campaign',
      asOf: ASOF,
      campaign: { ...CAMPAIGN, expectedCompetencies: ['debugging'] },
      only: ['debugging'],
    });
    expect(out).toHaveLength(1);
    expect(out[0].terms.roleRelevance).toBe(0.35);
  });

  it('scales campaign relevance by stage likelihood', () => {
    const certain = prioritize(GRAPH, {
      mode: 'campaign',
      asOf: ASOF,
      campaign: { ...CAMPAIGN, stageLikelihood: 1 },
      only: ['sql-reasoning'],
    })[0];
    const maybe = prioritize(GRAPH, {
      mode: 'campaign',
      asOf: ASOF,
      campaign: { ...CAMPAIGN, stageLikelihood: 0.5 },
      only: ['sql-reasoning'],
    })[0];
    expect(certain.terms.roleRelevance).toBe(0.25);
    expect(maybe.terms.roleRelevance).toBe(0.125);
    expect(maybe.score).toBeLessThan(certain.score);
  });
});

describe('options', () => {
  it('honours `limit`', () => {
    expect(prioritize(GRAPH, { mode: 'long-term', asOf: ASOF, limit: 3 })).toHaveLength(3);
    expect(prioritize(GRAPH, { mode: 'long-term', asOf: ASOF, limit: 1 })).toHaveLength(1);
    expect(prioritize(GRAPH, { mode: 'long-term', asOf: ASOF, limit: 0 })).toEqual([]);
  });

  it('defaults to 5 results', () => {
    expect(prioritize(GRAPH, { mode: 'long-term', asOf: ASOF })).toHaveLength(5);
  });

  it('honours `only`', () => {
    const out = prioritize(GRAPH, {
      mode: 'long-term',
      asOf: ASOF,
      only: ['debugging', 'testing'],
      limit: 40,
    });
    expect(out.map((a) => a.competency).sort()).toEqual(['debugging', 'testing']);
  });

  it('`only` still respects `limit`', () => {
    const out = prioritize(GRAPH, {
      mode: 'long-term',
      asOf: ASOF,
      only: ['debugging', 'testing', 'reliability'],
      limit: 2,
    });
    expect(out).toHaveLength(2);
  });

  it('ignores unknown ids in `only` rather than throwing', () => {
    const out = prioritize(GRAPH, {
      mode: 'long-term',
      asOf: ASOF,
      only: ['debugging', 'not-real' as never],
    });
    expect(out.map((a) => a.competency)).toEqual(['debugging']);
  });
});

describe('the `why` explanation', () => {
  const out = prioritize(GRAPH, { mode: 'campaign', asOf: ASOF, campaign: CAMPAIGN, limit: 6 });

  it('is non-empty for every ranked action and lists at most three reasons', () => {
    for (const a of out) {
      expect(a.why.length, a.competency).toBeGreaterThan(0);
      expect(a.why.length, a.competency).toBeLessThanOrEqual(3);
      for (const r of a.why) expect(r.length, a.competency).toBeGreaterThan(0);
    }
  });

  it('is also non-empty in long-term mode', () => {
    for (const a of prioritize(GRAPH, { mode: 'long-term', asOf: ASOF, limit: 20 })) {
      expect(a.why.length, a.competency).toBeGreaterThan(0);
      expect(a.why.length, a.competency).toBeLessThanOrEqual(3);
    }
  });

  it('names the role and the urgency that actually drove a campaign pick', () => {
    const top = out[0];
    expect(top.why.join(' | ')).toContain('BIA');
    expect(top.why.join(' | ')).toContain('urgency');
  });

  it('carries a human-readable action label matching the chosen action', () => {
    for (const a of out) expect(a.actionLabel).toBe(ACTION_LABEL[a.action]);
    for (const a of out) expect(a.terms.timeCostHours).toBe(ACTION_HOURS[a.action]);
  });
});

describe('determinism', () => {
  it('produces byte-identical output across repeated calls', () => {
    const a = prioritize(GRAPH, { mode: 'long-term', asOf: ASOF, limit: 40 });
    const b = prioritize(GRAPH, { mode: 'long-term', asOf: ASOF, limit: 40 });
    expect(b).toEqual(a);
    expect(JSON.stringify(b)).toBe(JSON.stringify(a));
  });

  it('breaks score ties by competency id, ascending', () => {
    const out = prioritize(GRAPH, { mode: 'long-term', asOf: ASOF, limit: 40 });
    for (let i = 1; i < out.length; i += 1) {
      if (out[i - 1].score === out[i].score) {
        expect(out[i - 1].competency.localeCompare(out[i].competency)).toBeLessThan(0);
      }
    }
  });

  it('is independent of the input evidence order', () => {
    const items = [
      ev({ id: 'p1', competencies: ['sql-reasoning'], score: 70, date: '2026-06-01' }),
      ev({ id: 'p2', competencies: ['semantic-modeling'], score: 55, date: '2026-07-15' }),
      ev({ id: 'p3', taskType: 'analyticsCase', domains: ['Data Analysis'], score: 62 }),
    ];
    const opts = { mode: 'campaign', asOf: ASOF, campaign: CAMPAIGN, limit: 40 } as const;
    const forward = prioritize(buildCompetencyGraph(items, ASOF), opts);
    const reversed = prioritize(buildCompetencyGraph([...items].reverse(), ASOF), opts);
    expect(reversed.map((a) => [a.competency, a.score])).toEqual(
      forward.map((a) => [a.competency, a.score]),
    );
  });
});

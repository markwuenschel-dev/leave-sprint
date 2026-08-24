/**
 * Pins role projection — the claim that role readiness is a re-weighting of ONE
 * graph, not seven scoreboards, and the anti-lying guard around it.
 *
 * Regression class: score / coverage / evidenceStrength collapsing into each other
 * (the module header's "a role can score 88 on 12% coverage" case must stay
 * visible), `readinessBand` handing out "strong" off a couple of lucky attempts,
 * a role's dimension list drifting from its profile, and cross-role propagation
 * breaking so one SQL grade stops moving DE/BIE/BIA at 15/25/25.
 *
 * Every `asOf` is a literal — no clock is read anywhere in this file.
 */

import { describe, expect, it } from 'vitest';

import { ROLE_PROFILES, competenciesForRole } from './dimensions';
import type { CompetencyEvidence } from './evidence';
import { buildCompetencyGraph } from './graph';
import {
  BAND_RULES,
  liftIfProven,
  projectAllRoles,
  projectRole,
  readinessBand,
} from './projection';
import { CAREER_ROLE_IDS } from './roles';

const ASOF = '2026-08-23';

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

const EMPTY = buildCompetencyGraph([], ASOF);

describe('projectRole on an empty graph', () => {
  it('reports null score, zero coverage, zero strength and the no-evidence band', () => {
    for (const role of CAREER_ROLE_IDS) {
      const r = projectRole(EMPTY, role);
      expect(r.score, role).toBeNull();
      expect(r.coverage, role).toBe(0);
      expect(r.evidenceStrength, role).toBe(0);
      expect(r.band, role).toBe('no-evidence');
    }
  });

  it('still enumerates every dimension of the role, all unproven', () => {
    const r = projectRole(EMPTY, 'swe');
    expect(r.dimensions).toHaveLength(7);
    for (const d of r.dimensions) {
      expect(d.score, d.competency).toBeNull();
      expect(d.confidence, d.competency).toBe(0);
      expect(d.status, d.competency).toBe('unproven');
      expect(d.unmetWeight, d.competency).toBe(d.weight);
    }
  });

  it('carries the role metadata through', () => {
    const r = projectRole(EMPTY, 'bie');
    expect(r.role).toBe('bie');
    expect(r.label).toBe('BIE');
    expect(r.longLabel).toBe('Business Intelligence Engineer');
    expect(r.tier).toBe('exploratory');
  });
});

describe('score, coverage and evidenceStrength are genuinely independent', () => {
  // ONE heavy SWE dimension (implementation, weight 20) proven to saturation.
  // Everything else in the role is untouched.
  const g = buildCompetencyGraph(
    ['a', 'b', 'c', 'd'].map((id) => ev({ id, competencies: ['implementation'], score: 88 })),
    ASOF,
  );
  const swe = projectRole(g, 'swe');

  it('reports a HIGH score on LOW coverage rather than blending them', () => {
    expect(g.nodes.implementation.confidence).toBe(1);
    expect(swe.score).toBe(88);
    expect(swe.coverage).toBe(0.2);
    expect(swe.evidenceStrength).toBe(0.2);
  });

  it('refuses to call that strong — the documented anti-lying guard', () => {
    expect(swe.score as number).toBeGreaterThanOrEqual(BAND_RULES.strong.score);
    expect(swe.coverage).toBeLessThan(BAND_RULES.strong.coverage);
    expect(swe.band).not.toBe('strong');
    expect(swe.band).toBe('exploratory');
  });

  it('averages only over MEASURED dimensions — unmeasured ones are not zeros', () => {
    // If unmeasured dimensions counted as 0 the score would be 88*20/100 = 17.6.
    expect(swe.score).not.toBe(17.6);
    expect(swe.dimensions.filter((d) => d.score != null).map((d) => d.competency)).toEqual([
      'implementation',
    ]);
  });

  it('separates coverage (status-gated) from evidenceStrength (confidence-weighted)', () => {
    // A second, much thinner dimension: covered but barely evidenced.
    const g2 = buildCompetencyGraph(
      [
        ...['a', 'b', 'c', 'd'].map((id) => ev({ id, competencies: ['implementation'], score: 88 })),
        ev({ id: 'thin', competencies: ['testing'], score: 88 }),
      ],
      ASOF,
    );
    const r = projectRole(g2, 'swe');
    expect(g2.nodes.testing.confidence).toBe(0.438);
    expect(r.coverage).toBe(0.35); // (20 + 15) / 100
    expect(r.evidenceStrength).toBe(0.266); // (20*1 + 15*0.438) / 100
    expect(r.evidenceStrength).toBeLessThan(r.coverage);
  });
});

describe('readinessBand boundary table', () => {
  it('returns no-evidence whenever the score is null, at any coverage', () => {
    expect(readinessBand(null, 0)).toBe('no-evidence');
    expect(readinessBand(null, 1)).toBe('no-evidence');
  });

  it('strong requires BOTH score >= 80 and coverage >= 0.7', () => {
    expect(readinessBand(BAND_RULES.strong.score, BAND_RULES.strong.coverage)).toBe('strong');
    expect(readinessBand(100, 1)).toBe('strong');
    expect(readinessBand(79.9, 0.7)).toBe('competitive');
    expect(readinessBand(80, 0.699)).toBe('competitive');
  });

  it('competitive requires score >= 70 and coverage >= 0.5', () => {
    expect(readinessBand(BAND_RULES.competitive.score, BAND_RULES.competitive.coverage)).toBe(
      'competitive',
    );
    expect(readinessBand(69.9, 0.5)).toBe('developing');
    expect(readinessBand(70, 0.499)).toBe('developing');
  });

  it('developing requires score >= 60 and coverage >= 0.3', () => {
    expect(readinessBand(BAND_RULES.developing.score, BAND_RULES.developing.coverage)).toBe(
      'developing',
    );
    expect(readinessBand(59.9, 0.3)).toBe('exploratory');
    expect(readinessBand(60, 0.299)).toBe('exploratory');
  });

  it('falls back to exploratory for anything else, including a perfect score at no coverage', () => {
    expect(readinessBand(100, 0)).toBe('exploratory');
    expect(readinessBand(0, 1)).toBe('exploratory');
    expect(readinessBand(0, 0)).toBe('exploratory');
  });

  it('keeps the thresholds strictly ordered', () => {
    expect(BAND_RULES.strong.score).toBeGreaterThan(BAND_RULES.competitive.score);
    expect(BAND_RULES.competitive.score).toBeGreaterThan(BAND_RULES.developing.score);
    expect(BAND_RULES.strong.coverage).toBeGreaterThan(BAND_RULES.competitive.coverage);
    expect(BAND_RULES.competitive.coverage).toBeGreaterThan(BAND_RULES.developing.coverage);
  });
});

describe('cross-role projection from one shared graph', () => {
  // Two full-weight, same-day attempts -> confidence exactly 0.625, so every
  // downstream number below is exact.
  const g = buildCompetencyGraph(
    [
      ev({ id: 'q1', competencies: ['sql-reasoning'], score: 84 }),
      ev({ id: 'q2', competencies: ['sql-reasoning'], score: 84 }),
    ],
    ASOF,
  );
  const de = projectRole(g, 'de');
  const bie = projectRole(g, 'bie');
  const bia = projectRole(g, 'bia');

  it('raises DE, BIE and BIA in a single build', () => {
    expect(g.nodes['sql-reasoning'].confidence).toBe(0.625);
    for (const r of [de, bie, bia]) {
      expect(r.score, r.role).toBe(84);
      expect(r.coverage, r.role).toBeGreaterThan(0);
    }
  });

  it('leaves roles that do not use SQL untouched', () => {
    expect(projectRole(g, 'swe').score).toBeNull();
    expect(projectRole(g, 'mle').coverage).toBe(0);
    expect(projectRole(g, 'redteam').band).toBe('no-evidence');
  });

  it('moves BIE and BIA further than DE, matching the 25/25/15 weights', () => {
    expect(de.coverage).toBe(0.15);
    expect(bie.coverage).toBe(0.25);
    expect(bia.coverage).toBe(0.25);
    expect(bie.coverage).toBeGreaterThan(de.coverage);
    expect(bia.coverage).toBeGreaterThan(de.coverage);
    expect(bie.coverage).toBe(bia.coverage);
  });

  it('reflects the same ratio in evidenceStrength', () => {
    expect(de.evidenceStrength).toBe(0.094); // 15 * 0.625 / 100
    expect(bie.evidenceStrength).toBe(0.156); // 25 * 0.625 / 100
    expect(bia.evidenceStrength).toBe(0.156);
  });
});

describe('dimensions and gaps', () => {
  const g = buildCompetencyGraph(
    [
      ev({ id: 'x1', competencies: ['sql-reasoning'], score: 84 }),
      ev({ id: 'x2', competencies: ['sql-reasoning'], score: 84 }),
    ],
    ASOF,
  );

  it('covers exactly the role profile keys, once each', () => {
    for (const role of CAREER_ROLE_IDS) {
      const r = projectRole(g, role);
      const seen = r.dimensions.map((d) => d.competency);
      expect(new Set(seen).size, role).toBe(seen.length);
      expect([...seen].sort(), role).toEqual(Object.keys(ROLE_PROFILES[role]).sort());
      expect(r.dimensions.map((d) => d.weight), role).toEqual(
        competenciesForRole(role).map((c) => c.weight),
      );
    }
  });

  it('computes unmetWeight as weight x (1 - confidence)', () => {
    const bie = projectRole(g, 'bie');
    const sql = bie.dimensions.find((d) => d.competency === 'sql-reasoning');
    expect(sql?.weight).toBe(25);
    expect(sql?.confidence).toBe(0.625);
    expect(sql?.unmetWeight).toBe(9.38); // 25 * 0.375 = 9.375 -> 2dp
    const semantic = bie.dimensions.find((d) => d.competency === 'semantic-modeling');
    expect(semantic?.unmetWeight).toBe(20);
  });

  it('sorts gaps by unmetWeight descending, ties broken by competency id', () => {
    const bie = projectRole(g, 'bie');
    const unmet = bie.gaps.map((d) => d.unmetWeight);
    for (let i = 1; i < unmet.length; i += 1) {
      expect(unmet[i - 1]).toBeGreaterThanOrEqual(unmet[i]);
    }
    // sql-reasoning is the HEAVIEST dimension (25) yet ranks 6th, because 0.625
    // confidence has already met most of it. That is the point of unmetWeight.
    expect(bie.gaps.map((d) => d.competency)).toEqual([
      'semantic-modeling',
      'data-modeling',
      'stakeholder-translation',
      'data-pipelines',
      'data-quality',
      'sql-reasoning',
      'business-context',
    ]);
  });

  it('contains the same set of dimensions as `dimensions`, just reordered', () => {
    const bie = projectRole(g, 'bie');
    expect([...bie.gaps].sort((a, b) => a.competency.localeCompare(b.competency))).toEqual(
      [...bie.dimensions].sort((a, b) => a.competency.localeCompare(b.competency)),
    );
  });
});

describe('liftIfProven', () => {
  const g = buildCompetencyGraph(
    [
      ev({ id: 'l1', competencies: ['sql-reasoning'], score: 84 }),
      ev({ id: 'l2', competencies: ['sql-reasoning'], score: 84 }),
    ],
    ASOF,
  );

  it('is weight x (1 - confidence) / 100', () => {
    expect(g.nodes['sql-reasoning'].confidence).toBe(0.625);
    expect(liftIfProven('bie', 'sql-reasoning', g)).toBe(0.094); // 25 * 0.375 / 100
    expect(liftIfProven('bia', 'sql-reasoning', g)).toBe(0.094);
    expect(liftIfProven('de', 'sql-reasoning', g)).toBe(0.056); // 15 * 0.375 / 100
  });

  it('is 0 for a competency the role does not use', () => {
    expect(liftIfProven('swe', 'sql-reasoning', g)).toBe(0);
    expect(liftIfProven('bia', 'debugging', g)).toBe(0);
    expect(liftIfProven('redteam', 'statistical-reasoning', g)).toBe(0);
  });

  it('is the full weight/100 for an unmeasured dimension', () => {
    expect(liftIfProven('swe', 'debugging', g)).toBe(0.2);
    expect(liftIfProven('bie', 'semantic-modeling', g)).toBe(0.2);
  });

  it('goes to 0 once the dimension is saturated', () => {
    const full = buildCompetencyGraph(
      ['a', 'b', 'c', 'd'].map((id) => ev({ id, competencies: ['sql-reasoning'] })),
      ASOF,
    );
    expect(full.nodes['sql-reasoning'].confidence).toBe(1);
    expect(liftIfProven('bie', 'sql-reasoning', full)).toBe(0);
  });
});

describe('projectAllRoles', () => {
  it('returns one entry per registered role, in registry order', () => {
    const all = projectAllRoles(EMPTY);
    expect(all).toHaveLength(CAREER_ROLE_IDS.length);
    expect(all.map((r) => r.role)).toEqual([...CAREER_ROLE_IDS]);
  });

  it('agrees with projectRole for every role', () => {
    const g = buildCompetencyGraph(
      [ev({ id: 'z1', taskType: 'coding', domains: ['SQL'], score: 77 })],
      ASOF,
    );
    for (const r of projectAllRoles(g)) {
      expect(r, r.role).toEqual(projectRole(g, r.role));
    }
  });
});

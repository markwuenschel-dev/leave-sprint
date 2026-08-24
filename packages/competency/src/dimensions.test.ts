/**
 * Pins the §9.3 weight fold in dimensions.ts.
 *
 * Regression class: a role profile whose weights stop summing to 100 (which would
 * silently rescale that role's readiness against every other role and make
 * `coverage` mean something different per role), a profile key that is not a real
 * `CompetencyId` (a typo routes evidence nowhere and never throws), and drift
 * between `COMPETENCY_IDS` and `COMPETENCIES` (which `getCompetency` turns into a
 * throw the first time the graph is built).
 */

import { describe, expect, it } from 'vitest';

import {
  type CompetencyId,
  COMPETENCIES,
  COMPETENCY_IDS,
  ROLE_PROFILES,
  competenciesForRole,
  getCompetency,
  isCompetencyId,
  roleWeight,
  rolesUsingCompetency,
} from './dimensions';
import { CAREER_ROLE_IDS } from './roles';

const sumWeights = (profile: Record<string, number | undefined>): number =>
  Object.values(profile).reduce<number>((acc, w) => acc + (w ?? 0), 0);

describe('ROLE_PROFILES invariants', () => {
  it('every role weights sum to exactly 100 (the pinned module invariant)', () => {
    const sums: Record<string, number> = {};
    for (const role of CAREER_ROLE_IDS) sums[role] = sumWeights(ROLE_PROFILES[role]);
    expect(sums).toEqual({
      swe: 100,
      mle: 100,
      ds: 100,
      de: 100,
      bie: 100,
      bia: 100,
      redteam: 100,
    });
    for (const role of CAREER_ROLE_IDS) {
      expect(sumWeights(ROLE_PROFILES[role])).toBe(100);
    }
  });

  it('declares a profile for every registered career role and nothing else', () => {
    expect(Object.keys(ROLE_PROFILES).sort()).toEqual([...CAREER_ROLE_IDS].sort());
  });

  it('every key of every profile is a real CompetencyId', () => {
    const bad: string[] = [];
    for (const role of CAREER_ROLE_IDS) {
      for (const key of Object.keys(ROLE_PROFILES[role])) {
        if (!isCompetencyId(key)) bad.push(`${role}.${key}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('every weight is a positive finite number', () => {
    for (const role of CAREER_ROLE_IDS) {
      for (const [key, weight] of Object.entries(ROLE_PROFILES[role])) {
        expect(Number.isFinite(weight), `${role}.${key}`).toBe(true);
        expect(weight as number, `${role}.${key}`).toBeGreaterThan(0);
      }
    }
  });
});

describe('COMPETENCIES registry', () => {
  it('has no duplicate ids in COMPETENCY_IDS', () => {
    expect(new Set(COMPETENCY_IDS).size).toBe(COMPETENCY_IDS.length);
  });

  it('has exactly one COMPETENCIES entry per COMPETENCY_IDS member', () => {
    for (const id of COMPETENCY_IDS) {
      const matches = COMPETENCIES.filter((c) => c.id === id);
      expect(matches.length, id).toBe(1);
    }
  });

  it('COMPETENCIES ids and COMPETENCY_IDS are the same set, same length', () => {
    expect(COMPETENCIES.length).toBe(COMPETENCY_IDS.length);
    expect(COMPETENCIES.map((c) => c.id).sort()).toEqual([...COMPETENCY_IDS].sort());
  });

  it('gives every competency a non-empty label and demonstratedBy', () => {
    for (const c of COMPETENCIES) {
      expect(c.label.length, c.id).toBeGreaterThan(0);
      expect(c.demonstratedBy.length, c.id).toBeGreaterThan(0);
    }
  });
});

describe('getCompetency / isCompetencyId', () => {
  it('returns the registry entry for a known id', () => {
    expect(getCompetency('sql-reasoning').label).toBe('SQL & query reasoning');
    expect(getCompetency('sql-reasoning').group).toBe('data');
  });

  it('throws on an unknown id rather than returning a plausible wrong one', () => {
    expect(() => getCompetency('not-a-competency' as CompetencyId)).toThrow(
      /unknown competency: not-a-competency/,
    );
  });

  it('guards correctly', () => {
    expect(isCompetencyId('debugging')).toBe(true);
    expect(isCompetencyId('Debugging')).toBe(false);
    expect(isCompetencyId('')).toBe(false);
    expect(isCompetencyId(null)).toBe(false);
    expect(isCompetencyId(undefined)).toBe(false);
    expect(isCompetencyId(12)).toBe(false);
    expect(isCompetencyId(['debugging'])).toBe(false);
  });
});

describe('roleWeight', () => {
  it('returns 0 for a competency the role does not use', () => {
    expect(roleWeight('bia', 'debugging')).toBe(0);
    expect(roleWeight('swe', 'sql-reasoning')).toBe(0);
    expect(roleWeight('redteam', 'statistical-reasoning')).toBe(0);
  });

  it('returns the profile weight for a competency the role does use', () => {
    expect(roleWeight('swe', 'debugging')).toBe(20);
    expect(roleWeight('bia', 'sql-reasoning')).toBe(25);
    expect(roleWeight('redteam', 'implementation')).toBe(5);
  });
});

describe('competenciesForRole', () => {
  it('sorts descending by weight, ties broken by id', () => {
    expect(competenciesForRole('swe')).toEqual([
      { id: 'debugging', weight: 20 },
      { id: 'implementation', weight: 20 },
      { id: 'reliability', weight: 15 },
      { id: 'system-design', weight: 15 },
      { id: 'testing', weight: 15 },
      { id: 'communication', weight: 10 },
      { id: 'data-persistence', weight: 5 },
    ]);
  });

  it('is monotonically non-increasing in weight and has unique ids, for every role', () => {
    for (const role of CAREER_ROLE_IDS) {
      const rows = competenciesForRole(role);
      expect(new Set(rows.map((r) => r.id)).size, role).toBe(rows.length);
      for (let i = 1; i < rows.length; i += 1) {
        expect(rows[i - 1].weight, `${role}[${i}]`).toBeGreaterThanOrEqual(rows[i].weight);
      }
      expect(rows.reduce((a, r) => a + r.weight, 0), role).toBe(100);
    }
  });
});

describe('rolesUsingCompetency', () => {
  it('returns exactly de/bie/bia for sql-reasoning, at 15/25/25', () => {
    const rows = rolesUsingCompetency('sql-reasoning');
    expect(rows).toEqual([
      { role: 'bia', weight: 25 },
      { role: 'bie', weight: 25 },
      { role: 'de', weight: 15 },
    ]);
    expect(new Set(rows.map((r) => r.role))).toEqual(new Set(['de', 'bie', 'bia']));
  });

  it('includes swe, mle, ds and de for communication', () => {
    const rows = rolesUsingCompetency('communication');
    expect(rows.map((r) => r.role).sort()).toEqual(['de', 'ds', 'mle', 'swe']);
    expect(rows).toEqual([
      { role: 'ds', weight: 10 },
      { role: 'swe', weight: 10 },
      { role: 'de', weight: 5 },
      { role: 'mle', weight: 5 },
    ]);
  });

  it('omits roles with zero weight entirely', () => {
    expect(rolesUsingCompetency('exploitation')).toEqual([{ role: 'redteam', weight: 20 }]);
    expect(rolesUsingCompetency('data-persistence').map((r) => r.role)).toEqual(['swe']);
  });

  it('agrees with roleWeight for every (role, competency) pair', () => {
    for (const id of COMPETENCY_IDS) {
      const rows = rolesUsingCompetency(id);
      for (const role of CAREER_ROLE_IDS) {
        const listed = rows.find((r) => r.role === role);
        expect(listed?.weight ?? 0, `${role}/${id}`).toBe(roleWeight(role, id));
      }
    }
  });
});

describe('spec fidelity — the §9.3 fold is faithful', () => {
  it('SWE matches §9.3 exactly', () => {
    expect(ROLE_PROFILES.swe).toEqual({
      implementation: 20,
      debugging: 20,
      'system-design': 15,
      testing: 15,
      reliability: 15,
      'data-persistence': 5,
      communication: 10,
    });
  });

  it('BIA matches §9.3 exactly', () => {
    expect(ROLE_PROFILES.bia).toEqual({
      'sql-reasoning': 25,
      'business-context': 20,
      'stakeholder-translation': 20,
      'semantic-modeling': 15,
      'statistical-reasoning': 10,
      'data-quality': 10,
    });
  });

  it('MLE, DS, DE and BIE match §9.3 exactly', () => {
    expect(ROLE_PROFILES.mle).toEqual({
      implementation: 20,
      'ml-implementation': 15,
      'data-pipelines': 15,
      evaluation: 15,
      serving: 10,
      reliability: 10,
      reproducibility: 10,
      communication: 5,
    });
    expect(ROLE_PROFILES.ds).toEqual({
      'problem-formulation': 15,
      'statistical-reasoning': 20,
      'data-preparation': 15,
      modeling: 15,
      evaluation: 15,
      experimentation: 10,
      communication: 10,
    });
    expect(ROLE_PROFILES.de).toEqual({
      'data-modeling': 15,
      'data-pipelines': 20,
      'data-quality': 15,
      'sql-reasoning': 15,
      reliability: 15,
      orchestration: 10,
      'scale-performance': 5,
      communication: 5,
    });
    expect(ROLE_PROFILES.bie).toEqual({
      'sql-reasoning': 25,
      'semantic-modeling': 20,
      'data-modeling': 15,
      'data-quality': 10,
      'data-pipelines': 10,
      'stakeholder-translation': 15,
      'business-context': 5,
    });
  });

  it('every competency in the registry is claimed by at least one role', () => {
    const orphans = COMPETENCY_IDS.filter((id) => rolesUsingCompetency(id).length === 0);
    expect(orphans).toEqual([]);
  });
});

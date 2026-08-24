/**
 * Pins the canonical career-role registry.
 *
 * Regression class: a role id added to `CAREER_ROLE_IDS` without a matching
 * `CAREER_ROLES` entry (which makes `getRole` throw deep inside a projection), a
 * duplicated id, a role that silently lands in two tier buckets or none, and the
 * `weightsFromSpec` honesty flag drifting — redteam's weights are a local
 * calibration and must keep saying so.
 */

import { describe, expect, it } from 'vitest';

import {
  type CareerRoleId,
  type RoleTier,
  CAREER_ROLES,
  CAREER_ROLE_IDS,
  ROLE_TIER_WEIGHT,
  getRole,
  isCareerRoleId,
  rolesAtTier,
} from './roles';

const TIERS: RoleTier[] = ['primary', 'secondary', 'exploratory'];

describe('CAREER_ROLE_IDS / CAREER_ROLES', () => {
  it('has no duplicate ids', () => {
    expect(new Set(CAREER_ROLE_IDS).size).toBe(CAREER_ROLE_IDS.length);
  });

  it('has exactly one CAREER_ROLES entry per id, in registry order', () => {
    expect(CAREER_ROLES.map((r) => r.id)).toEqual([...CAREER_ROLE_IDS]);
    for (const id of CAREER_ROLE_IDS) {
      expect(CAREER_ROLES.filter((r) => r.id === id).length, id).toBe(1);
    }
  });

  it('gives every role a label, longLabel, blurb and a known tier', () => {
    for (const r of CAREER_ROLES) {
      expect(r.label.length, r.id).toBeGreaterThan(0);
      expect(r.longLabel.length, r.id).toBeGreaterThan(0);
      expect(r.blurb.length, r.id).toBeGreaterThan(0);
      expect(TIERS, r.id).toContain(r.tier);
    }
  });
});

describe('getRole / isCareerRoleId', () => {
  it('returns the registry entry for a known id', () => {
    expect(getRole('bie').longLabel).toBe('Business Intelligence Engineer');
    expect(getRole('swe').tier).toBe('secondary');
  });

  it('throws on an unknown id rather than defaulting to a plausible role', () => {
    expect(() => getRole('sre' as CareerRoleId)).toThrow(/unknown career role: sre/);
    expect(() => getRole('SWE' as CareerRoleId)).toThrow(/unknown career role: SWE/);
  });

  it('guards correctly', () => {
    expect(isCareerRoleId('redteam')).toBe(true);
    expect(isCareerRoleId('Redteam')).toBe(false);
    expect(isCareerRoleId('')).toBe(false);
    expect(isCareerRoleId(null)).toBe(false);
    expect(isCareerRoleId(undefined)).toBe(false);
    expect(isCareerRoleId(0)).toBe(false);
  });
});

describe('rolesAtTier', () => {
  it('partitions the registry — every role lands in exactly one tier bucket', () => {
    const seen = new Map<CareerRoleId, number>();
    for (const tier of TIERS) {
      for (const r of rolesAtTier(tier)) seen.set(r.id, (seen.get(r.id) ?? 0) + 1);
    }
    expect([...seen.keys()].sort()).toEqual([...CAREER_ROLE_IDS].sort());
    for (const id of CAREER_ROLE_IDS) expect(seen.get(id), id).toBe(1);
  });

  it('returns registry order within a tier', () => {
    expect(rolesAtTier('primary').map((r) => r.id)).toEqual(['ds']);
    expect(rolesAtTier('secondary').map((r) => r.id)).toEqual(['swe', 'mle', 'de']);
    expect(rolesAtTier('exploratory').map((r) => r.id)).toEqual(['bie', 'bia', 'redteam']);
  });
});

describe('ROLE_TIER_WEIGHT', () => {
  it('is strictly ordered primary > secondary > exploratory', () => {
    expect(ROLE_TIER_WEIGHT.primary).toBe(1.0);
    expect(ROLE_TIER_WEIGHT.secondary).toBe(0.7);
    expect(ROLE_TIER_WEIGHT.exploratory).toBe(0.4);
    expect(ROLE_TIER_WEIGHT.primary).toBeGreaterThan(ROLE_TIER_WEIGHT.secondary);
    expect(ROLE_TIER_WEIGHT.secondary).toBeGreaterThan(ROLE_TIER_WEIGHT.exploratory);
  });

  it('covers exactly the three tiers', () => {
    expect(Object.keys(ROLE_TIER_WEIGHT).sort()).toEqual([...TIERS].sort());
  });
});

describe('weightsFromSpec honesty flag', () => {
  it('is false for redteam and true for every other role', () => {
    for (const r of CAREER_ROLES) {
      expect(r.weightsFromSpec, r.id).toBe(r.id !== 'redteam');
    }
    expect(CAREER_ROLES.filter((r) => !r.weightsFromSpec).map((r) => r.id)).toEqual(['redteam']);
  });
});

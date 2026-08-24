/**
 * Pins the domain axis and the feeder edges that turn a bare `primaryDomain`
 * string into competency signal.
 *
 * Regression class: a typo'd CompetencyId in a feeder table — the tables are plain
 * `Record<string, CompetencyId[]>` literals, so a stale id compiles and then routes
 * evidence into a node that does not exist; a domain listed in DOMAIN_GROUPS with
 * no feeder row (its evidence would silently go nowhere); and the channel-strength
 * ordering direct > taskType > domain, which is what stops inference from being
 * treated as assertion.
 */

import { describe, expect, it } from 'vitest';

import { COMPETENCY_IDS, isCompetencyId } from './dimensions';
import {
  ALL_DOMAINS,
  CHANNEL_STRENGTH,
  DOMAIN_FEEDERS,
  DOMAIN_GROUPS,
  TASK_TYPES,
  TASK_TYPE_FEEDERS,
  competenciesForDomain,
  competenciesForTaskType,
  isKnownDomain,
  isTaskTypeId,
} from './domains';

describe('feeder tables reference only real competencies', () => {
  it('every CompetencyId in DOMAIN_FEEDERS is a COMPETENCY_IDS member', () => {
    const bad: string[] = [];
    for (const [domain, ids] of Object.entries(DOMAIN_FEEDERS)) {
      for (const id of ids) if (!isCompetencyId(id)) bad.push(`${domain} -> ${id}`);
    }
    expect(bad).toEqual([]);
  });

  it('every CompetencyId in TASK_TYPE_FEEDERS is a COMPETENCY_IDS member', () => {
    const bad: string[] = [];
    for (const [tt, ids] of Object.entries(TASK_TYPE_FEEDERS)) {
      for (const id of ids ?? []) if (!isCompetencyId(id)) bad.push(`${tt} -> ${id}`);
    }
    expect(bad).toEqual([]);
  });

  it('no feeder row lists the same competency twice', () => {
    for (const [domain, ids] of Object.entries(DOMAIN_FEEDERS)) {
      expect(new Set(ids).size, domain).toBe(ids.length);
    }
    for (const [tt, ids] of Object.entries(TASK_TYPE_FEEDERS)) {
      expect(new Set(ids ?? []).size, tt).toBe((ids ?? []).length);
    }
  });

  it('no feeder row is empty', () => {
    for (const [domain, ids] of Object.entries(DOMAIN_FEEDERS)) {
      expect(ids.length, domain).toBeGreaterThan(0);
    }
  });
});

describe('DOMAIN_GROUPS / ALL_DOMAINS / DOMAIN_FEEDERS agree', () => {
  it('ALL_DOMAINS is the flattened group list with no duplicates', () => {
    expect(ALL_DOMAINS).toEqual(DOMAIN_GROUPS.flatMap((g) => [...g.domains]));
    expect(new Set(ALL_DOMAINS).size).toBe(ALL_DOMAINS.length);
  });

  it('every DOMAIN_FEEDERS key is a known domain', () => {
    const strays = Object.keys(DOMAIN_FEEDERS).filter((d) => !ALL_DOMAINS.includes(d));
    expect(strays).toEqual([]);
  });

  it('every known domain has a feeder row (no silently unrouted domain)', () => {
    const unfed = ALL_DOMAINS.filter((d) => DOMAIN_FEEDERS[d] == null);
    expect(unfed).toEqual([]);
  });

  it('the two sets are the same size', () => {
    expect(Object.keys(DOMAIN_FEEDERS).length).toBe(ALL_DOMAINS.length);
  });

  it('isKnownDomain guards on exact strings', () => {
    expect(isKnownDomain('SQL')).toBe(true);
    expect(isKnownDomain('Docker/CI/CD')).toBe(true);
    expect(isKnownDomain('sql')).toBe(false);
    expect(isKnownDomain('Underwater Basket Weaving')).toBe(false);
    expect(isKnownDomain(null)).toBe(false);
    expect(isKnownDomain(7)).toBe(false);
  });
});

describe('competenciesForDomain', () => {
  it('returns the declared feeder list', () => {
    expect(competenciesForDomain('SQL')).toEqual(['sql-reasoning', 'data-modeling', 'data-quality']);
    expect(competenciesForDomain('Python')).toEqual(['implementation', 'debugging', 'testing']);
  });

  it('returns [] for null, undefined, empty and unknown strings', () => {
    expect(competenciesForDomain(null)).toEqual([]);
    expect(competenciesForDomain(undefined)).toEqual([]);
    expect(competenciesForDomain('')).toEqual([]);
    expect(competenciesForDomain('Not A Domain')).toEqual([]);
    expect(competenciesForDomain('sql')).toEqual([]);
  });

  /**
   * A bare `DOMAIN_FEEDERS[domain] ?? []` walks the prototype chain: an
   * Object.prototype key is not null, so `??` never fires and the caller gets a
   * Function where it typed `CompetencyId[]`. `primaryDomain` is an unvalidated
   * free string (rubric/src/types.ts:48, cited in this module's own header), so
   * the input is reachable from persisted data. domains.ts:182 guards it with
   * `Object.hasOwn`; this pins that guard.
   */
  it('returns [] for Object.prototype keys instead of leaking an inherited member', () => {
    for (const key of ['toString', 'constructor', 'hasOwnProperty', 'valueOf', '__proto__']) {
      expect(competenciesForDomain(key), key).toEqual([]);
      expect(Array.isArray(competenciesForDomain(key)), key).toBe(true);
    }
  });

  it('agrees with isKnownDomain on prototype keys', () => {
    expect(isKnownDomain('toString')).toBe(false);
    expect(competenciesForDomain('toString')).toEqual([]);
  });

  it('a falsy domain short-circuits before the lookup, so those stay safe', () => {
    expect(competenciesForDomain('')).toEqual([]);
    expect(competenciesForDomain(null)).toEqual([]);
  });
});

describe('competenciesForTaskType', () => {
  it('returns [] for knowledge — the documented deliberate omission', () => {
    expect(competenciesForTaskType('knowledge')).toEqual([]);
    expect(TASK_TYPE_FEEDERS.knowledge).toBeUndefined();
  });

  it('returns [] for null, undefined and unknown task types', () => {
    expect(competenciesForTaskType(null)).toEqual([]);
    expect(competenciesForTaskType(undefined)).toEqual([]);
    expect(competenciesForTaskType('')).toEqual([]);
    expect(competenciesForTaskType('Coding')).toEqual([]);
    expect(competenciesForTaskType('pairprogramming')).toEqual([]);
  });

  it('routes the mapped task types', () => {
    expect(competenciesForTaskType('coding')).toEqual(['implementation', 'testing']);
    expect(competenciesForTaskType('debugging')).toEqual(['debugging', 'hypothesis-formation']);
    expect(competenciesForTaskType('sysdesign')).toEqual(['system-design']);
    expect(competenciesForTaskType('prodeng')).toEqual(['reliability', 'orchestration']);
    expect(competenciesForTaskType('walkthrough')).toEqual(['communication']);
    expect(competenciesForTaskType('behavioral')).toEqual(['communication']);
    expect(competenciesForTaskType('analyticsCase')).toEqual([
      'problem-formulation',
      'business-context',
      'stakeholder-translation',
    ]);
  });

  it('knowledge is the only TASK_TYPES member without a feeder row', () => {
    const unfed = TASK_TYPES.filter((t) => TASK_TYPE_FEEDERS[t] == null);
    expect(unfed).toEqual(['knowledge']);
  });

  it('isTaskTypeId guards correctly', () => {
    expect(isTaskTypeId('analyticsCase')).toBe(true);
    expect(isTaskTypeId('analyticscase')).toBe(false);
    expect(isTaskTypeId(null)).toBe(false);
    expect(isTaskTypeId(3)).toBe(false);
  });
});

describe('CHANNEL_STRENGTH', () => {
  it('orders direct > taskType > domain', () => {
    expect(CHANNEL_STRENGTH.direct).toBe(1.0);
    expect(CHANNEL_STRENGTH.taskType).toBe(0.7);
    expect(CHANNEL_STRENGTH.domain).toBe(0.5);
    expect(CHANNEL_STRENGTH.direct).toBeGreaterThan(CHANNEL_STRENGTH.taskType);
    expect(CHANNEL_STRENGTH.taskType).toBeGreaterThan(CHANNEL_STRENGTH.domain);
  });

  it('every channel strength is within (0, 1]', () => {
    for (const [k, v] of Object.entries(CHANNEL_STRENGTH)) {
      expect(v, k).toBeGreaterThan(0);
      expect(v, k).toBeLessThanOrEqual(1);
    }
  });

  it('taskType beats a PRIMARY-position domain hit, which is what breaks routing ties', () => {
    // graph.routeEvidence compares CHANNEL_STRENGTH[channel] * positional.
    // Primary domain positional is 0.6 (§9.4), so 0.7 > 0.5 * 0.6 = 0.3.
    expect(CHANNEL_STRENGTH.taskType).toBeGreaterThan(CHANNEL_STRENGTH.domain * 0.6);
  });
});

describe('coverage of the competency axis by inference channels', () => {
  it('pins exactly which competencies no domain or task type can ever reach', () => {
    const reachable = new Set<string>();
    for (const ids of Object.values(DOMAIN_FEEDERS)) for (const id of ids) reachable.add(id);
    for (const ids of Object.values(TASK_TYPE_FEEDERS)) for (const id of ids ?? []) reachable.add(id);
    const unreachable = COMPETENCY_IDS.filter((id) => !reachable.has(id));
    // These can only ever be raised through the explicit `competencies` channel.
    expect(unreachable).toEqual(['adaptability', 'reporting']);
  });
});

/**
 * CAREER ROLE REGISTRY — the one machine-readable role vocabulary.
 *
 * Before this module the repo carried nine overlapping role vocabularies with no
 * single source of truth:
 *
 *   RD.roles                 packages/rubric/src/referenceData.ts:244  (SWE MLE DS DE BIE BIA)
 *   TARGET_ROLES             packages/rubric/src/diagnostics.ts:48     (unused)
 *   ROLE_WEIGHT_TABLE        packages/rubric/src/diagnostics.ts:63
 *   MatrixRole               apps/waypoint/lib/gaps.ts:18
 *   RoleFilter               apps/waypoint/lib/domain.ts:18
 *   PrimaryRole              apps/waypoint/lib/domain.ts:19            (SWE_FS_II | MLE_II only)
 *   TargetRole               apps/waypoint/lib/domain.ts:51
 *   TrackKey                 packages/qbank/src/types.ts:5
 *   QB_TRACK_MAP.role        packages/qbank/src/trackMap.ts:5
 *
 * This registry does NOT delete those — they are load-bearing for persisted data and
 * for the grade form. It sits above them as the canonical set the competency graph
 * projects onto, and `aliases.ts` maps each legacy vocabulary INTO it. New surfaces
 * should consume `CareerRoleId`; legacy surfaces keep their own strings until the
 * data they persist is migrated.
 *
 * Pure static data + pure functions. No I/O, no dependencies on other @waypoint/*
 * packages, so this stays trivially testable and importable from anywhere.
 */

/** Canonical role identifiers. Kebab-case so they are URL- and column-safe. */
export const CAREER_ROLE_IDS = [
  'swe',
  'mle',
  'ds',
  'de',
  'bie',
  'bia',
  'redteam',
] as const;

export type CareerRoleId = (typeof CAREER_ROLE_IDS)[number];

/**
 * Pursuit tier. Mirrors ROLE_WEIGHT_TABLE (diagnostics.ts:63-67) but is explicit
 * per role rather than prefix-matched, so an unknown role can never be silently
 * mis-tiered the way `roleTier` (diagnostics.ts:69-75) defaults to 'Secondary'.
 *
 * Tier is a *pursuit* statement (how much this role matters to the search), not a
 * competence statement. It never changes a score — it only weights prioritisation.
 *
 * Current assignment reflects an explicit, dated selection made 2026-08-24: `ds` is
 * the sole primary ("A") role; `swe` and `mle` were demoted from primary at the same
 * time because the registry was asserting a search stance that contradicted it. This
 * is a user decision, never inferred — do not re-tier a role without a new one.
 *
 * NOTE: `ROLE_WEIGHT_TABLE` (packages/rubric/src/diagnostics.ts:63) still encodes the
 * OLD stance (SWE/MLE Primary) and is read live by dashboards.ts:132. The two are
 * knowingly divergent until that legacy table is addressed separately.
 */
export type RoleTier = 'primary' | 'secondary' | 'exploratory';

export const ROLE_TIER_WEIGHT: Record<RoleTier, number> = {
  primary: 1.0,
  secondary: 0.7,
  exploratory: 0.4,
};

export interface CareerRole {
  id: CareerRoleId;
  /** Short label for chips and axis ticks. */
  label: string;
  /** Full label for headings. */
  longLabel: string;
  tier: RoleTier;
  /**
   * True when §9.3 of Technical_Competency_Scoring_System_v1_11.md supplies the
   * competency weights verbatim. False means the weights are a local calibration
   * that has not been validated against real interview evidence yet.
   */
  weightsFromSpec: boolean;
  blurb: string;
}

export const CAREER_ROLES: readonly CareerRole[] = [
  {
    id: 'swe',
    label: 'SWE',
    longLabel: 'Software Engineer',
    tier: 'secondary',
    weightsFromSpec: true,
    blurb: 'Implementation, debugging, design, testing and operations on product code.',
  },
  {
    id: 'mle',
    label: 'MLE',
    longLabel: 'Machine Learning Engineer',
    tier: 'secondary',
    weightsFromSpec: true,
    blurb: 'Software engineering plus model implementation, evaluation and serving.',
  },
  {
    id: 'ds',
    label: 'DS',
    longLabel: 'Data Scientist',
    tier: 'primary',
    weightsFromSpec: true,
    blurb: 'Problem formulation, statistics, modelling and business interpretation.',
  },
  {
    id: 'de',
    label: 'DE',
    longLabel: 'Data Engineer',
    tier: 'secondary',
    weightsFromSpec: true,
    blurb: 'Modelling grain, pipelines, data quality and idempotent operations.',
  },
  {
    id: 'bie',
    label: 'BIE',
    longLabel: 'Business Intelligence Engineer',
    tier: 'exploratory',
    weightsFromSpec: true,
    blurb: 'SQL depth and semantic-layer modelling with pipeline literacy.',
  },
  {
    id: 'bia',
    label: 'BIA',
    longLabel: 'Business Intelligence Analyst',
    tier: 'exploratory',
    weightsFromSpec: true,
    blurb: 'SQL depth with metric definition and stakeholder translation.',
  },
  {
    id: 'redteam',
    label: 'Red Team',
    longLabel: 'Red Team / Offensive Security',
    tier: 'exploratory',
    // v1.11 §9.3 defines no offensive-security role. These weights are a local
    // calibration derived from the eight capabilities an authorised engagement
    // actually exercises; revise once real lab or interview evidence exists.
    weightsFromSpec: false,
    blurb:
      'Authorised offensive work: recon, attack-path reasoning, execution under scope, evidence and reporting.',
  },
] as const;

const ROLE_BY_ID = new Map<CareerRoleId, CareerRole>(CAREER_ROLES.map((r) => [r.id, r]));

export function getRole(id: CareerRoleId): CareerRole {
  const r = ROLE_BY_ID.get(id);
  // Unreachable for a well-typed caller; throws rather than returning a plausible
  // wrong role, because `roleTier` silently defaulting is exactly the bug this
  // registry exists to remove (diagnostics.ts:74).
  if (!r) throw new Error(`unknown career role: ${String(id)}`);
  return r;
}

export function isCareerRoleId(v: unknown): v is CareerRoleId {
  return typeof v === 'string' && (CAREER_ROLE_IDS as readonly string[]).includes(v);
}

/** Roles at a given pursuit tier, in registry order. */
export function rolesAtTier(tier: RoleTier): CareerRole[] {
  return CAREER_ROLES.filter((r) => r.tier === tier);
}

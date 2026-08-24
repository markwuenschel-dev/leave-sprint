/**
 * ROLE PROJECTIONS — the same graph, viewed through one role's weights.
 *
 * This is the mechanism behind "role readiness should be different projections of
 * the same underlying evidence". Nothing here recomputes a score from attempts; it
 * only reweights competency nodes by ROLE_PROFILES. One SQL grade therefore moves
 * DE, BIE and BIA simultaneously, at 15/25/25, with no duplicated bookkeeping.
 *
 * Three numbers come out, and conflating them is the trap:
 *
 *   score            how well you performed on what has been measured
 *   coverage         how much of the role has been measured at all
 *   evidenceStrength how much to trust that measurement
 *
 * A role can score 88 on 12% coverage. That is not readiness, and a single blended
 * number would hide it — so they are reported separately and `readinessBand`
 * refuses to call anything strong until coverage backs it up.
 */

import { type CareerRoleId, type RoleTier, CAREER_ROLE_IDS, getRole } from './roles';
import { type CompetencyId, competenciesForRole, getCompetency } from './dimensions';
import type { StalenessRisk } from './evidence';
import type { CompetencyGraph, CompetencyStatus } from './graph';

export interface RoleDimensionReadiness {
  competency: CompetencyId;
  label: string;
  /** This competency's weight for this role, 0–100. */
  weight: number;
  score: number | null;
  confidence: number;
  status: CompetencyStatus;
  staleness: StalenessRisk;
  lastEvidenceDate: string | null;
  /**
   * Role weight not yet backed by evidence: `weight × (1 − confidence)`. This is the
   * quantity that ranks what to work on next — a heavy dimension with thin evidence
   * outranks a light dimension with none.
   */
  unmetWeight: number;
}

export type ReadinessBand = 'no-evidence' | 'exploratory' | 'developing' | 'competitive' | 'strong';

export interface RoleReadiness {
  role: CareerRoleId;
  label: string;
  longLabel: string;
  tier: RoleTier;
  /** Weighted mean over measured dimensions only, 0–100. `null` when nothing measured. */
  score: number | null;
  /** Share of the role's 100 weight that is at least `emerging`, 0–1. */
  coverage: number;
  /** Σ(weight × confidence) / 100, 0–1. Coverage discounted by how thin each proof is. */
  evidenceStrength: number;
  band: ReadinessBand;
  dimensions: RoleDimensionReadiness[];
  /**
   * Dimensions that are not yet `established` — the honest answer to "what is still
   * unproven for this role?". Ordered by unmet weight, heaviest first.
   *
   * Deliberately NOT filtered on `unmetWeight > 0`: any confidence below perfection
   * leaves some unmet weight, so that test would call every dimension a gap. An
   * established dimension with residual unmet weight is a retention or confidence
   * opportunity, not missing proof, and it appears in `priorities` instead.
   */
  gaps: RoleDimensionReadiness[];
  /**
   * Every dimension, ranked by remaining evidence lift (`unmetWeight`, heaviest
   * first, ties broken by competency id so the order is stable across runs). This is
   * the complete worklist; `gaps` is the subset that is genuinely unproven.
   */
  priorities: RoleDimensionReadiness[];
}

/**
 * Banding deliberately gates on coverage as well as score, so a role cannot read
 * "strong" off two lucky attempts. The thresholds are a calibration, not a spec
 * quantity; they are named constants precisely so they can be argued with.
 */
export const BAND_RULES = {
  strong: { score: 80, coverage: 0.7 },
  competitive: { score: 70, coverage: 0.5 },
  developing: { score: 60, coverage: 0.3 },
  exploratory: { score: 0, coverage: 0 },
} as const;

export function readinessBand(score: number | null, coverage: number): ReadinessBand {
  if (score == null) return 'no-evidence';
  if (score >= BAND_RULES.strong.score && coverage >= BAND_RULES.strong.coverage) return 'strong';
  if (score >= BAND_RULES.competitive.score && coverage >= BAND_RULES.competitive.coverage) {
    return 'competitive';
  }
  if (score >= BAND_RULES.developing.score && coverage >= BAND_RULES.developing.coverage) {
    return 'developing';
  }
  return 'exploratory';
}

export function projectRole(graph: CompetencyGraph, role: CareerRoleId): RoleReadiness {
  const meta = getRole(role);
  const dimensions: RoleDimensionReadiness[] = competenciesForRole(role).map(({ id, weight }) => {
    const node = graph.nodes[id];
    return {
      competency: id,
      label: getCompetency(id).label,
      weight,
      score: node.score,
      confidence: node.confidence,
      status: node.status,
      staleness: node.staleness,
      lastEvidenceDate: node.lastEvidenceDate,
      unmetWeight: Math.round(weight * (1 - node.confidence) * 100) / 100,
    };
  });

  let weightedScore = 0;
  let measuredWeight = 0;
  let coveredWeight = 0;
  let strengthWeight = 0;

  for (const d of dimensions) {
    if (d.score != null) {
      weightedScore += d.score * d.weight;
      measuredWeight += d.weight;
    }
    if (d.status !== 'unproven') coveredWeight += d.weight;
    strengthWeight += d.weight * d.confidence;
  }

  const score = measuredWeight > 0 ? Math.round((weightedScore / measuredWeight) * 10) / 10 : null;
  const coverage = Math.round((coveredWeight / 100) * 1000) / 1000;
  const evidenceStrength = Math.round((strengthWeight / 100) * 1000) / 1000;

  const priorities = [...dimensions].sort(
    (a, b) => b.unmetWeight - a.unmetWeight || a.competency.localeCompare(b.competency),
  );
  // Filtered from the already-sorted list so both fields share one ordering.
  const gaps = priorities.filter((d) => d.status !== 'established');

  return {
    role,
    label: meta.label,
    longLabel: meta.longLabel,
    tier: meta.tier,
    score,
    coverage,
    evidenceStrength,
    band: readinessBand(score, coverage),
    dimensions,
    gaps,
    priorities,
  };
}

/** Project every role. Order follows the registry, not the scores, so the UI is stable. */
export function projectAllRoles(graph: CompetencyGraph): RoleReadiness[] {
  return CAREER_ROLE_IDS.map((r) => projectRole(graph, r));
}

/**
 * How much a single competency moving to full confidence would raise a role's
 * evidence strength. This is the "expected lift" term the prioritiser needs, and it
 * is exact rather than heuristic: strength is linear in confidence, so the lift is
 * just the unmet weight over 100.
 */
export function liftIfProven(role: CareerRoleId, competency: CompetencyId, graph: CompetencyGraph): number {
  const node = graph.nodes[competency];
  if (!node) return 0;
  const weight = competenciesForRole(role).find((c) => c.id === competency)?.weight ?? 0;
  return Math.round((weight * (1 - node.confidence)) / 100 * 1000) / 1000;
}

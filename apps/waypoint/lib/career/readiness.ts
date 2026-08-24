/**
 * Career readiness derivations — the pure layer behind the Career surface.
 *
 * Kept out of the component for the same reason `lib/gaps.ts` is: the numbers are
 * the interesting part and they should be testable without rendering anything.
 * Everything here is pure and clock-free; the caller supplies `asOf`.
 *
 * Two decisions are encoded here rather than in the view, because they are model
 * decisions and a component should not be able to quietly change them:
 *
 *   - `ds` is the target ("A") role. Warm roles are inspectable but never drive the
 *     ranked action queue — `prioritize` is called with `role: A_ROLE` and nothing
 *     else, so no other role's weights can displace the target's work.
 *   - The graph is built from EVERY entry, deliberately ignoring the shell's
 *     `roleFilter`. A longitudinal competency graph filtered by role would answer a
 *     different question and would understate confidence on shared competencies.
 */

import {
  buildCompetencyGraph,
  prioritize,
  projectRole,
  CAREER_ROLES,
  getRole,
  type CareerRoleId,
  type CompetencyGraph,
  type CompetencyId,
  type PrioritizedAction,
  type RoleDimensionReadiness,
  type RoleReadiness,
  type UnroutedEvidence,
  type UnroutedReason,
} from "@waypoint/competency";
import type { RubricEntry } from "@waypoint/rubric";

import { entriesToEvidence } from "@/lib/competency/adapter";

/** The declared target role. An explicit, dated selection — never inferred. */
export const A_ROLE: CareerRoleId = "ds";

/** Warm roles: inspectable for comparison, never driving the queue. */
export const WARM_ROLES: CareerRoleId[] = ["de", "swe", "mle"];

/**
 * BIE and BIA are collapsed into one view FOR DISPLAY ONLY. The engine keeps them
 * as distinct roles with distinct §9.3 profiles and this never merges their weights —
 * a merged BI profile would be a number the spec does not state.
 */
export const BI_GROUP: CareerRoleId[] = ["bie", "bia"];

/** Roles shown apart because their weights are not spec-derived. */
export const EXPLORATORY_ROLES: CareerRoleId[] = ["redteam"];

export const UNROUTED_REASON_TEXT: Record<UnroutedReason, string> = {
  unscored: "no score recorded — averaging it in would mean inventing a number",
  non_finite_score: "score is not a finite number — a data problem, not a design exclusion",
  excluded_evidence_class: "Class C: §10 defines it as not numerically scorable",
  no_routing_hints: "no task type or known domain matched, so it reached no competency",
};

/** One row of the collapsed BI view: shared graph facts, per-role weights. */
export interface BiRow {
  competency: CompetencyId;
  label: string;
  /** Weight per role in the group, `null` where that role's profile omits it. */
  weights: (number | null)[];
  score: number | null;
  confidence: number;
  status: RoleDimensionReadiness["status"];
  staleness: RoleDimensionReadiness["staleness"];
  /** True when the competency is an unproven gap for at least one role in the group. */
  isGap: boolean;
}

export interface BiCollapsedView {
  roles: RoleReadiness[];
  rows: BiRow[];
}

/**
 * How evidence actually reached the graph.
 *
 * `hasDirectEvidence` is the one worth reading first: `entryToEvidence`
 * (lib/competency/adapter.ts:86) never populates `competencies`, so real entries
 * route through task type (0.7) and domain (0.5) only. Every score therefore carries
 * less weight than a directly-tagged attempt would, and the view says so rather than
 * letting thin confidence read as "you know less than you do".
 */
export interface RoutingSummary {
  total: number;
  routed: number;
  unrouted: readonly UnroutedEvidence[];
  byReason: Partial<Record<UnroutedReason, number>>;
  channelCounts: { direct: number; taskType: number; domain: number };
  hasDirectEvidence: boolean;
}

export interface CareerReadinessView {
  asOf: string;
  graph: CompetencyGraph;
  /** The A role. */
  target: RoleReadiness;
  /** Ranked next actions, scoped to the A role alone. */
  actions: PrioritizedAction[];
  warm: RoleReadiness[];
  bi: BiCollapsedView;
  exploratory: RoleReadiness[];
  routing: RoutingSummary;
}

export function summariseRouting(graph: CompetencyGraph, total: number): RoutingSummary {
  const byReason: Partial<Record<UnroutedReason, number>> = {};
  for (const u of graph.unroutedEvidence) {
    byReason[u.reason] = (byReason[u.reason] ?? 0) + 1;
  }

  const channelCounts = { direct: 0, taskType: 0, domain: 0 };
  const seen = new Set<string>();
  for (const id of Object.keys(graph.nodes) as CompetencyId[]) {
    for (const c of graph.nodes[id].contributions) {
      // Count each attempt once per channel it ever used, not once per competency
      // it reached, so a broad domain tag cannot look like breadth of evidence.
      const key = `${c.evidenceId}:${c.channel}`;
      if (seen.has(key)) continue;
      seen.add(key);
      channelCounts[c.channel] += 1;
    }
  }

  return {
    total,
    routed: graph.evidenceCount,
    unrouted: graph.unroutedEvidence,
    byReason,
    channelCounts,
    hasDirectEvidence: channelCounts.direct > 0,
  };
}

export function collapseBi(graph: CompetencyGraph, group: CareerRoleId[] = BI_GROUP): BiCollapsedView {
  const roles = group.map((id) => projectRole(graph, id));

  const meta = new Map<CompetencyId, RoleDimensionReadiness>();
  for (const r of roles) {
    for (const d of r.dimensions) if (!meta.has(d.competency)) meta.set(d.competency, d);
  }

  const weightFor = (r: RoleReadiness, id: CompetencyId) =>
    r.dimensions.find((d) => d.competency === id)?.weight ?? null;
  const unmetMax = (id: CompetencyId) =>
    Math.max(...roles.map((r) => r.dimensions.find((d) => d.competency === id)?.unmetWeight ?? 0));

  const rows: BiRow[] = [...meta.keys()]
    .sort((a, b) => unmetMax(b) - unmetMax(a) || a.localeCompare(b))
    .map((id) => {
      const d = meta.get(id) as RoleDimensionReadiness;
      return {
        competency: id,
        label: d.label,
        weights: roles.map((r) => weightFor(r, id)),
        score: d.score,
        confidence: d.confidence,
        status: d.status,
        staleness: d.staleness,
        isGap: roles.some((r) => r.gaps.some((g) => g.competency === id)),
      };
    });

  return { roles, rows };
}

/**
 * Build the whole view from raw store entries.
 *
 * `asOf` is required, not defaulted to today, so the engine stays clock-free and a
 * test can assert exact numbers. The component passes the current date.
 */
export function buildCareerReadiness(
  entries: readonly RubricEntry[],
  asOf: string,
  opts: { actionLimit?: number } = {},
): CareerReadinessView {
  const evidence = entriesToEvidence(entries);
  const graph = buildCompetencyGraph(evidence, asOf);

  return {
    asOf,
    graph,
    target: projectRole(graph, A_ROLE),
    actions: prioritize(graph, {
      mode: "long-term",
      role: A_ROLE,
      asOf,
      limit: opts.actionLimit ?? 6,
    }),
    warm: WARM_ROLES.map((id) => projectRole(graph, id)),
    bi: collapseBi(graph),
    exploratory: EXPLORATORY_ROLES.map((id) => projectRole(graph, id)),
    routing: summariseRouting(graph, entries.length),
  };
}

/** True when this role's §9.3 weights are a local calibration, not spec-derived. */
export function isLocallyCalibrated(role: CareerRoleId): boolean {
  return !getRole(role).weightsFromSpec;
}

/** Registry label lookup, for headings that should not hard-code role names. */
export function roleLabel(role: CareerRoleId): string {
  return CAREER_ROLES.find((r) => r.id === role)?.longLabel ?? role;
}

/**
 * DERIVED READINESS FOR THE CAREER LIBRARY.
 *
 * Nothing in here is stored. Requirement coverage, claim defensibility and stage
 * readiness are all computed from the competency graph plus the library's own links,
 * every time they are asked for.
 *
 * That is deliberate. §17.8's `coverageScore` is described in the spec as a stored
 * field, and a stored coverage number is wrong the moment you pass a mock — it would
 * need a background job, or a manual refresh, or it silently rots. Deriving it means
 * "am I covered for this job?" is always answered against today's evidence.
 *
 * §17.8's rule is enforced throughout: coverage measures match to a target role, not
 * answer quality, and it never raises a competency score. Data flows graph → coverage
 * and never back.
 */

import type { CompetencyGraph, CompetencyId, CompetencyNode } from "@waypoint/competency";
import { recencyFactor, stalenessRisk } from "@waypoint/competency";
import type { StalenessRisk } from "@waypoint/competency";
import type {
  Campaign,
  CampaignStage,
  ClaimDefense,
  JdSnapshot,
  JobRequirement,
  JobTarget,
  Project,
  ProjectDefense,
  RequirementCoverage,
  RequirementKind,
  ResumeClaim,
} from "./types";

/* ───────────────────── requirement coverage ───────────────────── */

/** A competency counts as demonstrated for hiring purposes at the §15 pass line. */
export const COVERAGE_PASS_SCORE = 70;

/**
 * How much each requirement kind counts toward a target's coverage score.
 *
 * A "required" bullet you cannot cover is disqualifying in a way a "preferred" one
 * is not, and a seniority signal is mostly framing — flattening them would make the
 * score cheerful and useless.
 */
export const REQUIREMENT_KIND_WEIGHT: Record<RequirementKind, number> = {
  required: 1,
  responsibility: 0.75,
  preferred: 0.5,
  "domain-knowledge": 0.5,
  "seniority-signal": 0.25,
};

const COVERAGE_VALUE: Record<RequirementCoverage, number> = {
  hit: 1,
  partial: 0.5,
  missing: 0,
  unassessed: 0,
};

/** A project is defensible when every part of a walkthrough is rehearsed. */
export function projectIsDefensible(p: Project): boolean {
  const d = p.defense;
  return (
    d.canExplainArchitecture &&
    d.canDefendDecisions &&
    d.canReproduceCold &&
    d.canDiscussFailures &&
    d.canStateLimitations
  );
}

/**
 * Derive one requirement's coverage.
 *
 * An explicit override always wins — a human who has read the posting knows things
 * the graph does not. Otherwise the rules are, in order:
 *
 *   no competencies mapped        → unassessed  (not "missing": nobody has looked)
 *   every mapped competency solid → hit
 *   any evidence at all           → partial
 *   nothing but a defensible project → partial  (an artefact is evidence, weaker than a score)
 *   otherwise                     → missing
 */
export function deriveRequirementCoverage(
  req: JobRequirement,
  graph: CompetencyGraph,
  projects: readonly Project[],
): RequirementCoverage {
  if (req.coverageOverride) return req.coverageOverride;

  const linkedDefensible = req.projectIds.some((id) => {
    const p = projects.find((x) => x.id === id);
    return p != null && projectIsDefensible(p);
  });

  if (req.competencies.length === 0) {
    return linkedDefensible ? "partial" : "unassessed";
  }

  const nodes: CompetencyNode[] = req.competencies
    .map((c) => graph.nodes[c])
    .filter((n): n is CompetencyNode => n != null);

  if (nodes.length === 0) return "unassessed";

  const solid = (n: CompetencyNode) =>
    n.status === "established" && n.score != null && n.score >= COVERAGE_PASS_SCORE;
  const anyEvidence = (n: CompetencyNode) => n.status !== "unproven";

  if (nodes.every(solid)) return "hit";
  if (nodes.some(anyEvidence) || linkedDefensible) return "partial";
  return "missing";
}

export interface RequirementAssessment {
  requirement: JobRequirement;
  coverage: RequirementCoverage;
  /** True when a human set it rather than the graph deriving it. */
  overridden: boolean;
  weight: number;
}

export interface TargetCoverage {
  /** §17.8 `coverageScore`, 0–1. Weighted by requirement kind. */
  coverageScore: number;
  hit: RequirementAssessment[];
  partial: RequirementAssessment[];
  missing: RequirementAssessment[];
  unassessed: RequirementAssessment[];
  all: RequirementAssessment[];
  /**
   * Share of weight nobody has mapped yet. A high value means the coverage score
   * is uninformative rather than bad — a distinction a single number cannot make.
   */
  unassessedShare: number;
}

/** The snapshot actually in force: the most recently captured one. */
export function currentSnapshot(target: JobTarget): JdSnapshot | null {
  if (target.snapshots.length === 0) return null;
  return target.snapshots.reduce((a, b) => (b.capturedAt >= a.capturedAt ? b : a));
}

export function assessTarget(
  target: JobTarget,
  graph: CompetencyGraph,
  projects: readonly Project[],
): TargetCoverage {
  const snap = currentSnapshot(target);
  const reqs = snap?.requirements ?? [];

  const all: RequirementAssessment[] = reqs.map((requirement) => ({
    requirement,
    coverage: deriveRequirementCoverage(requirement, graph, projects),
    overridden: requirement.coverageOverride != null,
    weight: REQUIREMENT_KIND_WEIGHT[requirement.kind],
  }));

  let weighted = 0;
  let totalWeight = 0;
  let unassessedWeight = 0;
  for (const a of all) {
    totalWeight += a.weight;
    weighted += a.weight * COVERAGE_VALUE[a.coverage];
    if (a.coverage === "unassessed") unassessedWeight += a.weight;
  }

  const round3 = (n: number) => Math.round(n * 1000) / 1000;

  return {
    coverageScore: totalWeight > 0 ? round3(weighted / totalWeight) : 0,
    hit: all.filter((a) => a.coverage === "hit"),
    partial: all.filter((a) => a.coverage === "partial"),
    missing: all.filter((a) => a.coverage === "missing"),
    unassessed: all.filter((a) => a.coverage === "unassessed"),
    all,
    unassessedShare: totalWeight > 0 ? round3(unassessedWeight / totalWeight) : 0,
  };
}

/** Every competency any requirement on this target asks for, deduped. */
export function targetCompetencies(target: JobTarget): CompetencyId[] {
  const snap = currentSnapshot(target);
  const seen = new Set<CompetencyId>();
  for (const r of snap?.requirements ?? []) for (const c of r.competencies) seen.add(c);
  return [...seen];
}

/* ───────────────────── defensibility ───────────────────── */

export interface DefenseScore {
  /** 0–1 across the checklist. */
  score: number;
  /** Which boxes are still unticked, in checklist order. */
  missing: string[];
  /** Decay applied to the last rehearsal; 1 when never rehearsed is not claimed. */
  freshness: number;
  staleness: StalenessRisk;
  /** score × freshness. What a cold interview would actually get. */
  effective: number;
}

function scoreChecklist(
  boxes: { label: string; ok: boolean }[],
  lastRehearsed: string | null,
  asOf: string,
): DefenseScore {
  const ticked = boxes.filter((b) => b.ok).length;
  const score = boxes.length === 0 ? 0 : ticked / boxes.length;
  // Never rehearsed means there is nothing to be fresh about; freshness is 0 so the
  // effective score cannot be inflated by ticking boxes you have not tested cold.
  const freshness = lastRehearsed ? recencyFactor(lastRehearsed, asOf) : 0;
  return {
    score: Math.round(score * 1000) / 1000,
    missing: boxes.filter((b) => !b.ok).map((b) => b.label),
    freshness: Math.round(freshness * 1000) / 1000,
    staleness: lastRehearsed ? stalenessRisk(lastRehearsed, asOf) : "Unknown",
    effective: Math.round(score * freshness * 1000) / 1000,
  };
}

export function scoreProjectDefense(d: ProjectDefense, asOf: string): DefenseScore {
  return scoreChecklist(
    [
      { label: "Explain the architecture", ok: d.canExplainArchitecture },
      { label: "Defend the decisions", ok: d.canDefendDecisions },
      { label: "Reproduce it cold", ok: d.canReproduceCold },
      { label: "Discuss what failed", ok: d.canDiscussFailures },
      { label: "State the limitations", ok: d.canStateLimitations },
    ],
    d.lastRehearsed,
    asOf,
  );
}

export function scoreClaimDefense(d: ClaimDefense, asOf: string): DefenseScore {
  return scoreChecklist(
    [
      { label: "Explain it", ok: d.canExplain },
      { label: "Justify it", ok: d.canJustify },
      { label: "Qualify it", ok: d.canQualify },
      { label: "Support it with evidence", ok: d.canSupport },
    ],
    d.lastRehearsed,
    asOf,
  );
}

export interface ClaimRisk {
  claim: ResumeClaim;
  defense: DefenseScore;
  /** True when the claim names no project and no competency — a bullet with nothing behind it. */
  unbacked: boolean;
}

/**
 * Claims ranked by how badly they would go if asked about, worst first.
 *
 * The ordering deliberately puts unbacked claims above merely unrehearsed ones: a
 * bullet you cannot support is an integrity problem (§13 caps fabricated ownership
 * at 0–40), while one you simply have not rehearsed is a scheduling problem.
 */
export function claimRisks(claims: readonly ResumeClaim[], asOf: string): ClaimRisk[] {
  return claims
    .map((claim) => ({
      claim,
      defense: scoreClaimDefense(claim.defense, asOf),
      unbacked: claim.projectIds.length === 0 && claim.competencies.length === 0,
    }))
    .sort(
      (a, b) =>
        Number(b.unbacked) - Number(a.unbacked) ||
        a.defense.effective - b.defense.effective ||
        a.claim.id.localeCompare(b.claim.id),
    );
}

/* ───────────────────── campaign stages ───────────────────── */

/** The stage in play: the explicit current one, else the soonest scheduled pending one. */
export function activeStage(campaign: Campaign): CampaignStage | null {
  if (campaign.currentStageId) {
    const explicit = campaign.stages.find((s) => s.id === campaign.currentStageId);
    if (explicit) return explicit;
  }
  const pending = campaign.stages.filter((s) => s.outcome === "pending");
  if (pending.length === 0) return null;
  const scheduled = pending
    .filter((s) => s.scheduledFor != null)
    .sort((a, b) => (a.scheduledFor ?? "").localeCompare(b.scheduledFor ?? ""));
  return scheduled[0] ?? pending[0];
}

/** Calendar days until a stage; null when unscheduled. Never reads the clock itself. */
export function daysUntilStage(stage: CampaignStage, asOf: string): number | null {
  if (!stage.scheduledFor) return null;
  const a = Date.parse(asOf);
  const b = Date.parse(stage.scheduledFor);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.round((b - a) / 86_400_000);
}

export interface StageReadiness {
  stage: CampaignStage;
  daysUntil: number | null;
  /** Competencies this stage is expected to probe, after falling back to the target's. */
  competencies: CompetencyId[];
  /** Weighted mean over probed competencies that have a score. Null when none do. */
  score: number | null;
  /** Share of probed competencies with at least emerging evidence, 0–1. */
  coverage: number;
  /** The probed competencies with the least evidence, worst first. */
  weakest: { competency: CompetencyId; label: string; score: number | null; confidence: number }[];
}

/**
 * Stage-specific readiness.
 *
 * Unlike a role projection this is unweighted across the probed competencies — a
 * system-design round asks about system design, and the role's 15% weighting for it
 * is irrelevant once you are sitting in that specific interview.
 */
export function stageReadiness(
  stage: CampaignStage,
  graph: CompetencyGraph,
  asOf: string,
  fallbackCompetencies: readonly CompetencyId[] = [],
): StageReadiness {
  const competencies =
    stage.expectedCompetencies.length > 0
      ? [...stage.expectedCompetencies]
      : [...fallbackCompetencies];

  const nodes = competencies
    .map((c) => graph.nodes[c])
    .filter((n): n is CompetencyNode => n != null);

  const scored = nodes.filter((n) => n.score != null);
  const score =
    scored.length > 0
      ? Math.round((scored.reduce((s, n) => s + (n.score ?? 0), 0) / scored.length) * 10) / 10
      : null;
  const covered = nodes.filter((n) => n.status !== "unproven").length;

  const weakest = nodes
    .map((n) => ({ competency: n.id, label: n.label, score: n.score, confidence: n.confidence }))
    .sort(
      (a, b) =>
        a.confidence - b.confidence ||
        (a.score ?? -1) - (b.score ?? -1) ||
        a.competency.localeCompare(b.competency),
    );

  return {
    stage,
    daysUntil: daysUntilStage(stage, asOf),
    competencies,
    score,
    coverage: nodes.length > 0 ? Math.round((covered / nodes.length) * 1000) / 1000 : 0,
    weakest,
  };
}

/**
 * CAREER LIBRARY — Projects, Resume Versions, Job Targets, JD Snapshots, Campaigns.
 *
 * These are structured evidence objects, not passive links. The spine they exist to
 * make traversable is:
 *
 *   project → resume claim → job requirement → interview question → evidence → competency
 *
 * Every hop in that chain is a real field below, and every competency reference is a
 * `CompetencyId` from @waypoint/competency, so a job requirement and a graded answer
 * land on the same node rather than on two similar-looking strings.
 *
 * ONE DELIBERATE OMISSION — pipeline status.
 *
 * `JobTarget` has no status field. Application status already lives on
 * `wp_applications.status` (apps/waypoint/lib/domain.ts:60-66) and is edited on the
 * Applications surface. Giving a Job Target its own status would create two places
 * to say the same thing and guarantee drift the first time one is updated without
 * the other. A Job Target therefore carries `applicationId` and reads status from
 * there; an unlinked Job Target is simply a pursuit not yet on the pipeline, which
 * is exactly what "initial consideration" means.
 */

import type { CompetencyId } from "@waypoint/competency";
import type { CareerRoleId } from "@waypoint/competency";

/* ───────────────────────── shared ───────────────────────── */

/**
 * A pointer from a Career Library object back to something that actually happened.
 *
 * `rubric-entry` is the strong case — it resolves to a graded attempt with a score,
 * an assistance level and a date, i.e. real evidence. The others are weaker and are
 * labelled as such so a claim backed only by an `external` link cannot masquerade as
 * demonstrated performance.
 */
export type EvidenceRefKind = "rubric-entry" | "defense-card" | "artifact" | "external";

export interface EvidenceRef {
  kind: EvidenceRefKind;
  /** Rubric entry id, defense card id, repo path, or URL depending on `kind`. */
  ref: string;
  note?: string;
}

/* ───────────────────────── projects ───────────────────────── */

/** §17.9 `readinessStage`, verbatim. `production-shaped` is not `production-deployed`. */
export type ProjectStage =
  | "idea"
  | "in-progress"
  | "works-locally"
  | "tested"
  | "documented"
  | "demo-ready"
  | "portfolio-ready"
  | "interview-defensible"
  | "production-shaped"
  | "production-deployed";

export const PROJECT_STAGES: ProjectStage[] = [
  "idea",
  "in-progress",
  "works-locally",
  "tested",
  "documented",
  "demo-ready",
  "portfolio-ready",
  "interview-defensible",
  "production-shaped",
  "production-deployed",
];

/**
 * Ownership is an interview-integrity field. §13 caps "Fabricated results, tests,
 * ownership, or experience" at 0–40, so how much of a project is actually yours is
 * not decoration — it bounds what you may claim about it.
 */
export type OwnershipLevel =
  | "sole-author"
  | "primary-author"
  | "contributor"
  | "maintainer"
  | "forked-and-extended"
  | "tutorial-followed";

export const OWNERSHIP_LEVELS: OwnershipLevel[] = [
  "sole-author",
  "primary-author",
  "contributor",
  "maintainer",
  "forked-and-extended",
  "tutorial-followed",
];

/** A decision you should be able to defend, including the road not taken. */
export interface ProjectDecision {
  id: string;
  title: string;
  /** What forced a choice. */
  problem: string;
  chosen: string;
  alternatives: string[];
  /** What the choice cost. A decision with no stated cost was not a decision. */
  tradeoff: string;
  /** Hindsight. Interviewers ask this and "nothing" is a bad answer. */
  wouldChangeNow?: string;
}

/** Something that went wrong. The most-asked and least-prepared walkthrough topic. */
export interface ProjectFailure {
  id: string;
  what: string;
  rootCause: string;
  fix: string;
  lesson: string;
}

export interface ProjectLimitation {
  id: string;
  limitation: string;
  /** Why shipping with it was reasonable — distinguishes a tradeoff from an oversight. */
  whyAccepted: string;
}

export interface ProjectTesting {
  strategy: string;
  automated: boolean;
  coverageNote?: string;
}

/**
 * Defense readiness, as five separable abilities rather than one "ready" flag.
 *
 * §17.9 is explicit that "a project is not `interview-defensible` unless the
 * candidate can explain relevant code and decisions without assistance", and the
 * existing defense model is a single binary — practiced at least once, ever
 * (apps/waypoint/lib/readiness.ts:115-124). Splitting it is what lets the system say
 * *which* part of a walkthrough is weak.
 */
export interface ProjectDefense {
  canExplainArchitecture: boolean;
  canDefendDecisions: boolean;
  canReproduceCold: boolean;
  canDiscussFailures: boolean;
  canStateLimitations: boolean;
  /** ISO date of the last cold rehearsal, or null. Feeds decay, not a checkbox. */
  lastRehearsed: string | null;
  note?: string;
}

export const EMPTY_PROJECT_DEFENSE: ProjectDefense = {
  canExplainArchitecture: false,
  canDefendDecisions: false,
  canReproduceCold: false,
  canDiscussFailures: false,
  canStateLimitations: false,
  lastRehearsed: null,
};

export interface Project {
  id: string;
  /** Stable slug; matches `FileDefenseItem.project` so defense cards can join. */
  slug: string;
  name: string;
  summary: string;
  stage: ProjectStage;
  ownership: OwnershipLevel;
  ownershipNote?: string;
  /** Prose. What the pieces are and how a request flows through them. */
  architecture: string;
  technologies: string[];
  repoUrl?: string;
  demoUrl?: string;
  decisions: ProjectDecision[];
  testing: ProjectTesting;
  failures: ProjectFailure[];
  limitations: ProjectLimitation[];
  /** Competencies this project actually demonstrates. Feeds the graph as direct evidence. */
  competencies: CompetencyId[];
  evidenceRefs: EvidenceRef[];
  defense: ProjectDefense;
  createdAt: string;
  updatedAt: string;
}

/* ───────────────────────── resumes ───────────────────────── */

export type ResumeSection =
  | "summary"
  | "experience"
  | "projects"
  | "skills"
  | "education"
  | "other";

export const RESUME_SECTIONS: ResumeSection[] = [
  "summary",
  "experience",
  "projects",
  "skills",
  "education",
  "other",
];

/**
 * The four things a claim has to survive, kept separate because they fail
 * separately. You can explain a bullet you cannot justify, and justify one you
 * cannot support with evidence.
 */
export interface ClaimDefense {
  /** Can say what it means, in your own words. */
  canExplain: boolean;
  /** Can say why it was the right thing to do. */
  canJustify: boolean;
  /** Can state its limits honestly, without deflating it. */
  canQualify: boolean;
  /** Can point at an artefact or a graded attempt that proves it. */
  canSupport: boolean;
  lastRehearsed: string | null;
  note?: string;
}

export const EMPTY_CLAIM_DEFENSE: ClaimDefense = {
  canExplain: false,
  canJustify: false,
  canQualify: false,
  canSupport: false,
  lastRehearsed: null,
};

export interface ResumeClaim {
  id: string;
  /** The bullet, exactly as written on the resume. */
  text: string;
  section: ResumeSection;
  projectIds: string[];
  competencies: CompetencyId[];
  defense: ClaimDefense;
  /** What an interviewer would poke at. Written by you, before they do. */
  risk?: string;
}

export interface ResumeVersion {
  id: string;
  /** Human label, e.g. "v3 — MLE-weighted". */
  label: string;
  /** The file name actually attached, so a submission can be identified later. */
  submittedAs?: string;
  /**
   * Exactly what was submitted, preserved verbatim.
   *
   * A resume is only useful as evidence if it is the one they read. Storing a path
   * or a link would let the artefact change underneath the record — the same failure
   * mode the JD snapshot exists to prevent.
   */
  body: string;
  claims: ResumeClaim[];
  targetRole: CareerRoleId | null;
  /** ISO date this version was frozen. Never mutate a submitted version — fork it. */
  frozenAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/* ───────────────────────── job targets ───────────────────────── */

export type RequirementKind =
  | "required"
  | "preferred"
  | "responsibility"
  | "domain-knowledge"
  | "seniority-signal";

export const REQUIREMENT_KINDS: RequirementKind[] = [
  "required",
  "preferred",
  "responsibility",
  "domain-knowledge",
  "seniority-signal",
];

/**
 * §17.8 coverage vocabulary. `unassessed` is added and matters: the spec's three
 * values force every requirement into hit/partial/missing, which silently converts
 * "I have not looked at this yet" into "I do not have it".
 *
 * §17.8's rule holds here: coverage measures match to a target role, not answer
 * quality, and it must never raise a competency score.
 */
export type RequirementCoverage = "hit" | "partial" | "missing" | "unassessed";

export const REQUIREMENT_COVERAGES: RequirementCoverage[] = [
  "hit",
  "partial",
  "missing",
  "unassessed",
];

export interface JobRequirement {
  id: string;
  /** The requirement in the employer's words, not paraphrased. */
  text: string;
  kind: RequirementKind;
  competencies: CompetencyId[];
  projectIds: string[];
  claimIds: string[];
  /**
   * Manual override. When absent, coverage is DERIVED from the competency graph
   * (see lib/career/coverage.ts) so it cannot go stale as evidence accumulates.
   */
  coverageOverride?: RequirementCoverage;
  note?: string;
}

/**
 * The posting, preserved.
 *
 * A list of snapshots rather than one body, because postings get edited and
 * reposted, and the version you applied against is the one you will be interviewed
 * against. Newest last.
 */
export interface JdSnapshot {
  id: string;
  capturedAt: string;
  sourceUrl?: string;
  /** The actual posting text. The whole point of a snapshot. */
  body: string;
  requirements: JobRequirement[];
}

export interface JobTarget {
  id: string;
  company: string;
  roleTitle: string;
  careerRole: CareerRoleId | null;
  seniority?: string;
  location?: string;
  /**
   * The pipeline row that owns this pursuit's STATUS. `null` means initial
   * consideration — a target being weighed before it is worth a pipeline row.
   * See the module header for why status is not duplicated here.
   */
  applicationId: string | null;
  /** Which resume version was actually sent. */
  submittedResumeId: string | null;
  snapshots: JdSnapshot[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/* ───────────────────────── campaigns ───────────────────────── */

export type CampaignStageKind =
  | "recruiter-screen"
  | "technical-screen"
  | "take-home"
  | "onsite-coding"
  | "onsite-system-design"
  | "onsite-behavioral"
  | "hiring-manager"
  | "final"
  | "offer";

export const CAMPAIGN_STAGE_KINDS: CampaignStageKind[] = [
  "recruiter-screen",
  "technical-screen",
  "take-home",
  "onsite-coding",
  "onsite-system-design",
  "onsite-behavioral",
  "hiring-manager",
  "final",
  "offer",
];

export const CAMPAIGN_STAGE_LABELS: Record<CampaignStageKind, string> = {
  "recruiter-screen": "Recruiter screen",
  "technical-screen": "Technical screen",
  "take-home": "Take-home",
  "onsite-coding": "Onsite · coding",
  "onsite-system-design": "Onsite · system design",
  "onsite-behavioral": "Onsite · behavioural",
  "hiring-manager": "Hiring manager",
  final: "Final",
  offer: "Offer",
};

export type StageOutcome = "pending" | "passed" | "failed" | "withdrawn";

export interface CampaignStage {
  id: string;
  kind: CampaignStageKind;
  /** ISO date, or null when the stage is anticipated but unscheduled. */
  scheduledFor: string | null;
  completedAt: string | null;
  /**
   * 0–1. How likely this stage is to actually happen. Feeds campaign-mode
   * prioritisation directly (`CampaignContext.stageLikelihood`) so a speculative
   * onsite does not outrank a booked screen.
   */
  likelihood: number;
  expectedCompetencies: CompetencyId[];
  /** Free-text areas the stage is expected to probe, e.g. "sharding", "A/B design". */
  expectedQuestionAreas: string[];
  outcome: StageOutcome;
  /** Real interview feedback — the strongest evidence source in §17.5. */
  feedback?: string;
}

export interface Campaign {
  id: string;
  jobTargetId: string;
  careerRole: CareerRoleId;
  /** Id of the stage currently in play; null before the process starts. */
  currentStageId: string | null;
  stages: CampaignStage[];
  /** Domain knowledge the employer expects, beyond the competency axis. */
  domainRequirements: string[];
  createdAt: string;
  updatedAt: string;
}

/* ───────────────────────── collection ───────────────────────── */

/** Everything the Career Library holds, as it appears on WaypointState. */
export interface CareerLibrary {
  projects: Project[];
  resumes: ResumeVersion[];
  jobTargets: JobTarget[];
  campaigns: Campaign[];
}

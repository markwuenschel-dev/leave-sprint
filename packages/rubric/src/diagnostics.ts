/**
 * §17 Diagnostic Progress Model — typed sub-objects + their controlled value
 * lists, transcribed from progress_tracker_record_schema_v1_10.json and the
 * v1.10 spec §17. These make the rich record fields first-class (typed for the
 * form + dashboards) instead of opaque `unknown`.
 */

/* ── Controlled value lists (also used to populate form dropdowns) ── */
export const GATE_VERDICTS = ['Pass', 'Partial', 'Fail'] as const;
export const LEVEL_VERDICTS = ['Pass', 'Borderline', 'Fail'] as const;
export const CONFIDENCE = ['High', 'Medium', 'Low'] as const;
export const ASSESSMENT_OUTCOMES = ['Demonstrated', 'Partial discovery', 'Concept discovery'] as const;
export const ATTEMPT_TYPES = ['initial', 'retry', 'assisted_retry', 'post_coaching_retry', 'final_retry', 'retention_retest', 'session_parent', 'rollup'] as const;
export const COVERAGE_STATUSES = ['included', 'excluded', 'suspected_missing', 'duplicate_linked', 'rollup_only'] as const;
export const COMPILE_STATUSES = ['compiles', 'does not compile', 'not applicable', 'not checked', 'unknown'] as const;
export const TEST_STATUSES = ['passed', 'failed', 'not run', 'not applicable', 'unknown'] as const;
export const PROBE_VALUES = ['Pass', 'Uncertain', 'Fail'] as const;
export const ELEMENT_SOURCES = ['Predefined', 'Rubric-derived', 'Retrospective evaluator-derived', 'Role-requirement-derived'] as const;
export const EVIDENCE_SOURCES = ['verbal answer', 'written answer', 'live coding', 'take-home coding', 'repo code', 'test results', 'debugging transcript', 'project walkthrough', 'mock interview', 'real interview feedback', 'commit history', 'README or design doc', 'production artifact', 'metric or dashboard', 'human evaluator feedback'] as const;
export const ARTIFACT_TYPES = ['portfolio project', 'repo feature', 'README', 'design doc', 'demo script', 'runbook', 'dashboard', 'ETL pipeline', 'RAG workflow', 'Spring Boot service', 'React UI', 'modeling notebook', 'data pipeline', 'behavioral story'] as const;
export const READINESS_STAGES = ['idea', 'in-progress', 'works locally', 'tested', 'documented', 'demo-ready', 'portfolio-ready', 'interview-defensible', 'production-shaped', 'production-deployed'] as const;
export const STALENESS_RISK = ['Low', 'Medium', 'High', 'Unknown'] as const;
export const GAP_CLOSURE_STATUS = ['open', 'in progress', 'closed', 'reopened', 'not applicable'] as const;
export const SEVERITY = ['Low', 'Medium', 'High', 'Critical'] as const;
export const LMH = ['Low', 'Medium', 'High'] as const;
export const NEXT_ACTION_TYPES = ['study', 'rebuild', 'retest', 'mock interview', 'project work', 'documentation', 'ignore for now'] as const;
export const BLOCKS_LEVEL = ['L1', 'L2', 'L3', 'None'] as const;
export const ASSESS_MODES = ['written', 'verbal', 'live coding', 'debugging session', 'project walkthrough', 'mock interview', 'real interview'] as const;
export const EVALUATOR_TYPES = ['self', 'AI grader', 'peer', 'senior engineer', 'recruiter', 'hiring manager', 'real interviewer'] as const;
export const ROLE_READINESS = ['Not ready', 'Emerging', 'Interviewable with risk', 'Interviewable', 'Strong fit'] as const;
export const RISK_LEVELS = ['Low', 'Medium', 'High', 'Unknown'] as const;
export const MATCH_QUALITY = ['Weak', 'Partial', 'Strong'] as const;
export const QUALITY_NWPS = ['None', 'Weak', 'Partial', 'Strong'] as const;
export const TRACKER_HEALTH = ['Good', 'Warning', 'Critical', 'Unknown'] as const;
export const GAP_TYPES = ['Conceptual gap', 'Mechanism gap', 'Application gap', 'Tradeoff gap', 'Verification gap', 'Autonomy gap', 'Communication gap', 'Recall gap', 'Scope gap', 'Evidence quality gap', 'Requirements translation gap'] as const;
export const TAG_CLASSES = ['weaknessTags', 'knowledgeGapTags', 'gapTypes'] as const;

/** v1.11 logging mode (§17.35) — supersedes the deprecated quickLog boolean. */
export const LOGGING_MODES = ['fast', 'full'] as const;
export type LoggingMode = (typeof LOGGING_MODES)[number];

/** v1.11 role weight tier (§17.34) for weighting roleImpact / next-action ranking. */
export const ROLE_WEIGHT_TIERS = ['Primary', 'Secondary', 'Tertiary'] as const;
export type RoleWeightTier = (typeof ROLE_WEIGHT_TIERS)[number];
export const ROLE_TIER_WEIGHT: Record<RoleWeightTier, number> = { Primary: 1.0, Secondary: 0.7, Tertiary: 0.4 };

/** Recommended target roles / archetypes (Waypoint career stack). */
export const TARGET_ROLES = [
  'SWE Full Stack II',
  'MLE II',
  'DS',
  'DE',
  'BIE',
  'BIA',
  'SWE II — Backend',
  'Platform / DevOps',
] as const;

/**
 * Primary/Secondary/Tertiary weighting for active target roles (§17.34).
 * Waypoint: SWE FS II ‖ MLE II equal primary; DS/DE secondary; BIE/BIA escape.
 */
export const ROLE_WEIGHT_TABLE: { tier: RoleWeightTier; roles: string[] }[] = [
  { tier: 'Primary', roles: ['SWE Full Stack II', 'MLE II'] },
  { tier: 'Secondary', roles: ['DS', 'DE'] },
  { tier: 'Tertiary', roles: ['BIE', 'BIA'] },
];

export function roleTier(targetRole: string | undefined | null): RoleWeightTier {
  if (!targetRole) return 'Secondary';
  for (const { tier, roles } of ROLE_WEIGHT_TABLE) {
    if (roles.some((r) => r === targetRole || targetRole.startsWith(r))) return tier;
  }
  return 'Secondary';
}

export type GateVerdict = (typeof GATE_VERDICTS)[number];
export type LevelVerdict = (typeof LEVEL_VERDICTS)[number];
export type Confidence = (typeof CONFIDENCE)[number];
export type AssessmentOutcome = (typeof ASSESSMENT_OUTCOMES)[number];
export type AttemptType = (typeof ATTEMPT_TYPES)[number];
export type CoverageStatus = (typeof COVERAGE_STATUSES)[number];
export type CompileStatus = (typeof COMPILE_STATUSES)[number];
export type TestStatus = (typeof TEST_STATUSES)[number];
export type GapType = (typeof GAP_TYPES)[number];

type ProbeValue = (typeof PROBE_VALUES)[number];
type Nullable<T> = T | null;

/* ── Sub-object shapes ── */
export interface ConceptDiscovery {
  conceptKnownBeforeAnswer: Nullable<boolean>;
  vocabularyKnown: Nullable<boolean>;
  reasoningAttempted: Nullable<boolean>;
  firstPrinciplesSignal: Nullable<'None' | 'Weak' | 'Moderate' | 'Strong' | 'Unknown'>;
  underlyingModelSignal: Nullable<'Absent' | 'Partial' | 'Present' | 'Unknown'>;
  teachingNeed: Nullable<'None' | 'Vocabulary mapping' | 'Mechanism refinement' | 'Full concept teach' | 'Retest under probing' | 'Unknown'>;
  candidateFraming: Nullable<string>;
  notes: Nullable<string>;
}

export interface ProbeReadiness {
  firstAnswer?: ProbeValue;
  oneFollowUp?: ProbeValue;
  deepFollowUp?: ProbeValue;
  likelyFailurePoint?: string;
}

export interface Retention {
  firstAttemptDate?: string;
  lastAttemptDate?: string;
  retestDate?: string;
  daysSinceLastAttempt?: number;
  attemptNumber?: number;
  priorScore?: number;
  currentScore?: number;
  retestScoreDelta?: number;
  reproducedWithoutNotes?: boolean;
  reproducedUnderTimeLimit?: boolean;
}

export interface LlmIndependence {
  llmUsed?: boolean;
  llmUseType?: string[];
  implementationGeneratedByLLM?: boolean;
  testsGeneratedByLLM?: boolean;
  answerDraftedByLLM?: boolean;
  reproducedWithoutLLM?: boolean;
  explainedWithoutLLM?: boolean;
  fivePassStatus?: { buildPass?: boolean; rewritePass?: boolean; testPass?: boolean; explainPass?: boolean; documentPass?: boolean };
}

export interface RoleRequirementCoverage {
  targetRole?: string;
  requirementsHit?: string[];
  requirementsMissing?: string[];
  requirementsPartial?: string[];
  coverageScore?: number;
}

export interface ArtifactReadiness {
  artifact?: string;
  artifactType?: (typeof ARTIFACT_TYPES)[number];
  readinessStage?: (typeof READINESS_STAGES)[number];
  proofItems?: string[];
  missingProofItems?: string[];
  portfolioReady?: boolean;
}

export interface Staleness {
  lastPracticed?: string;
  daysSincePractice?: number;
  stalenessRisk?: (typeof STALENESS_RISK)[number];
  refreshNeeded?: boolean;
}

export interface GapClosureStatus {
  status?: (typeof GAP_CLOSURE_STATUS)[number];
  openedDate?: Nullable<string>;
  closedDate?: Nullable<string>;
  closureEvidence?: string;
  retestRequired?: boolean;
}

export interface Priority {
  severity?: (typeof SEVERITY)[number];
  urgency?: (typeof LMH)[number];
  roleImpact?: (typeof LMH)[number];
  roleWeightTier?: RoleWeightTier;
  nextActionType?: (typeof NEXT_ACTION_TYPES)[number];
  recommendedAction?: string;
}

export interface GapImpact {
  isBlocking?: Nullable<boolean>;
  blocksRoles?: string[];
  blocksLevel?: (typeof BLOCKS_LEVEL)[number];
  reason?: string;
}

export interface AssessmentMode {
  mode?: (typeof ASSESS_MODES)[number];
  timeLimitMinutes?: Nullable<number>;
  notesAllowed?: Nullable<boolean>;
  followUpsAsked?: number;
  pressureLevel?: (typeof LMH)[number];
}

export interface Calibration {
  evaluatorType?: (typeof EVALUATOR_TYPES)[number];
  humanReviewed?: boolean;
  realInterviewSignal?: boolean;
  calibrationConfidence?: (typeof CONFIDENCE)[number];
}

export interface RetestPlan {
  retestDate?: string;
  retestPrompt?: string;
  successCriteria?: string[];
}

export interface RoleReadinessRollup {
  targetRole?: string;
  readiness?: (typeof ROLE_READINESS)[number];
  blockingGaps?: number;
  strongEvidenceAreas?: string[];
  weakEvidenceAreas?: string[];
  recommendedNextMilestone?: string;
}

export interface ProofStrength {
  score?: number; // 0.00–1.00
  basis?: string[];
  missingProof?: string[];
}

export interface AntiInflationChecks {
  overclaimRisk?: (typeof RISK_LEVELS)[number];
  productionClaimSafe?: boolean;
  ownershipClaimSafe?: boolean;
  llmDependencyRisk?: (typeof RISK_LEVELS)[number];
  notes?: string;
}

export interface CalibrationAnchor {
  calibrationAnchorId?: string;
  taskType?: string;
  problemLevel?: string;
  difficulty?: number;
  expectedLevelScores?: { L1?: number; L2?: number; L3?: number };
  anchorReason?: string;
  matchQuality?: (typeof MATCH_QUALITY)[number];
}

export interface ScoreUncertainty {
  range?: [number, number];
  reason?: string;
  confidenceLimiters?: string[];
}

export interface GapRecurrence {
  isRecurring?: Nullable<boolean>;
  priorOccurrences?: Nullable<number>;
  lastOccurrenceDate?: Nullable<string>;
  worsening?: Nullable<boolean>;
  pattern?: string;
}

export interface TransferSignal {
  sourceConcept?: string;
  transferredTo?: string[];
  transferQuality?: (typeof QUALITY_NWPS)[number];
  notes?: string;
}

export interface RetestQueueObj {
  dueNow?: string[];
  dueSoon?: string[];
  blockedBy?: string[];
}

export interface AssessmentQuality {
  promptClarity?: (typeof CONFIDENCE)[number];
  expectedElementsDefinedBeforeAnswer?: Nullable<boolean>;
  gradingConfidenceLimitedByPrompt?: Nullable<boolean>;
  notes?: string;
}

export interface RoleReadinessEvidenceFloor {
  targetRole?: string;
  minimumEvidenceRequired?: Record<string, number>;
  currentEvidence?: Record<string, number>;
  evidenceFloorMet?: Nullable<boolean>;
}

export interface RecoveryBehavior {
  acknowledgedUncertainty?: Nullable<boolean>;
  reasonedFromFirstPrinciples?: Nullable<boolean>;
  askedClarifyingQuestion?: Nullable<boolean>;
  avoidedFabrication?: Nullable<boolean>;
  recoveryQuality?: (typeof QUALITY_NWPS)[number];
}

export interface ScoreLiftActions {
  toPassNextLevel?: string[];
  estimatedLift?: Record<string, string>;
}

export interface TrackerHealth {
  recordsWithMissingLevelScores?: Nullable<number>;
  recordsWithNoncanonicalTags?: Nullable<number>;
  recordsMissingAssessmentOutcome?: Nullable<number>;
  recordsMissingProblemLevel?: Nullable<number>;
  coverageDefects?: Nullable<number>;
  overallHealth?: (typeof TRACKER_HEALTH)[number];
}

export interface ProposedNewTag {
  tagClass: (typeof TAG_CLASSES)[number];
  proposedTag: string;
  reason: string;
  nearestExistingTag?: Nullable<string>;
}

/**
 * Types for the Technical Competency Scoring System v1.10.
 *
 * The controlling output is the THREE level scores (levelScores L1/L2/L3) +
 * levelVerdicts → answerLevel → qualifyingDemonstratedLevel, plus Pass/Partial/Fail
 * gates. universal/task/finalScore are kept as *supporting* evidence only.
 * The rich §17 diagnostic sub-objects are typed in ./diagnostics.
 */

import { RD } from './referenceData';
import type * as D from './diagnostics';

export type TaskType = (typeof RD.taskTypes)[number]['id'];
export type UniversalDimId = (typeof RD.universalDims)[number]['id'];
export type GateId = (typeof RD.gates)[number]['gate'];
export type EvidenceClass = (typeof RD.evidenceClasses)[number]['id'];
export type LevelId = (typeof RD.levels)[number]['id'];
export type Role = (typeof RD.roles)[number]['id'];
export type Difficulty = 0 | 1 | 2 | 3 | 4 | 5;
export type AssistanceLevel = 0 | 1 | 2 | 3 | 4 | 5;
export type DemonstratedLevel = (typeof RD.demonstratedLevels)[number] | '';

export type GateVerdict = D.GateVerdict;
export type LevelVerdict = D.LevelVerdict;
export type Gates = Partial<Record<GateId, GateVerdict>>;

export type UniversalSubScores = Partial<Record<UniversalDimId, number>>;

export interface LevelScores {
  L1: number | null;
  L2: number | null;
  L3: number | null;
}
export interface LevelVerdicts {
  L1: LevelVerdict | null;
  L2: LevelVerdict | null;
  L3: LevelVerdict | null;
}

export interface RubricEntry {
  /* Core / identity */
  id: string; // mirror of assessmentId (store/DB key)
  assessmentId: string;
  rubricVersion: string;
  date: string;
  task: string;
  taskType: TaskType | '';
  domain: string;

  /* Classification */
  problemLevel: LevelId | '';
  targetLevel: LevelId | '';
  answerLevel: LevelId | '';
  qualifyingDemonstratedLevel: LevelId | '';
  difficulty: Difficulty;
  difficultyAssignment: string;
  difficultyAttributeScore: number | null;

  /* Evidence class */
  evidenceClass: EvidenceClass;
  autonomyConfidence: string;
  assistanceLevel: AssistanceLevel;

  /* Domains and roles */
  primaryDomain: string;
  secondaryDomains: string[];
  primaryRole: Role | '';
  secondaryRoles: Role[];

  /* Controlling scores */
  levelScores: LevelScores;
  levelVerdicts: LevelVerdicts;

  /* Supporting scores */
  universalScore: number;
  taskSpecificScore: number;
  rawScore: number;
  cap: number | null;
  penalties: number;
  finalScore: number;
  universalSubScores: UniversalSubScores | null;

  /* Verdict */
  demonstratedLevel: DemonstratedLevel;
  confidence: D.Confidence | '';
  qualifyingEvidenceNote: string;
  mainReasonNextLevelNotReached: string;
  surviveProbing: string;

  /* Gates and tags */
  gates: Gates;
  weaknessTags: string[];
  knowledgeGapTags: string[];
  gapTypes: string[];
  strengths: string;
  weaknesses: string;
  nextTarget: string;
  quickLog: boolean;

  /* Expected-element accounting */
  expectedElements: string[];
  presentElements: string[];
  missingElements: string[];
  elementSource: string;

  /* Coding metadata */
  problemName: string | null;
  platform: string | null;
  codingPattern: string | null;
  primaryDataStructure: string | null;
  compileStatus: D.CompileStatus | null;
  testStatus: D.TestStatus | null;
  edgeCasesCovered: string[];
  edgeCasesMissed: string[];

  /* §16 Attempt tracking */
  sessionId: string | null;
  parentAssessmentId: string | null;
  attemptGroupId: string | null;
  attemptNumber: number | null;
  attemptType: D.AttemptType;
  priorAssessmentId: string | null;
  sourceFile: string | null;
  sourceItemId: string | null;
  coverageStatus: D.CoverageStatus;
  coverageNotes: string;
  secondaryTaskSignals: string[];
  labelSetVersion: string | null;

  /* §17 Diagnostic Progress Model (typed) */
  assessmentOutcome: D.AssessmentOutcome | null;
  conceptDiscovery: D.ConceptDiscovery | null;
  probeReadiness: D.ProbeReadiness | null;
  evidenceSource: string[];
  retention: D.Retention | null;
  llmIndependence: D.LlmIndependence | null;
  roleRequirementCoverage: D.RoleRequirementCoverage | null;
  artifactReadiness: D.ArtifactReadiness | null;
  staleness: D.Staleness | null;
  gapClosureStatus: D.GapClosureStatus | null;
  priority: D.Priority | null;
  gapImpact: D.GapImpact | null;
  assessmentMode: D.AssessmentMode | null;
  calibration: D.Calibration | null;
  retestPlan: D.RetestPlan | null;
  roleReadinessRollup: D.RoleReadinessRollup | null;
  proofStrength: D.ProofStrength | null;
  antiInflationChecks: D.AntiInflationChecks | null;
  calibrationAnchors: D.CalibrationAnchor[];
  scoreUncertainty: D.ScoreUncertainty | null;
  gapRecurrence: D.GapRecurrence | null;
  transferSignal: D.TransferSignal | null;
  retestQueue: D.RetestQueueObj | null;
  assessmentQuality: D.AssessmentQuality | null;
  roleReadinessEvidenceFloor: D.RoleReadinessEvidenceFloor | null;
  recoveryBehavior: D.RecoveryBehavior | null;
  scoreLiftActions: D.ScoreLiftActions | null;
  trackerHealth: D.TrackerHealth | null;
  proposedNewTags: D.ProposedNewTag[];

  /** Lossless passthrough for any additional imported keys. */
  extra?: Record<string, unknown>;
}

/** A partial an author supplies to logRubricEntry; everything else is defaulted. */
export type RubricEntryInput = Partial<RubricEntry> & { task: string };

/** Promotion requirement shape (from RD.promotionEvidence). */
export interface PromotionRequirement {
  type: TaskType;
  min: number;
  label?: string;
  maxAssist?: number;
  minDiff?: number;
}

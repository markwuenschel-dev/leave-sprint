/**
 * Types for the Technical Competency Scoring System.
 *
 * Union types are derived from the RD reference data so they never drift.
 * `RubricEntry` is the full-fidelity record (every field the old rNormaliseEntry
 * emitted), so old rubric-log-v1 JSON round-trips losslessly.
 */

import { RD } from './referenceData';

export type TaskType = (typeof RD.taskTypes)[number]['id'];
export type UniversalDimId = (typeof RD.universalDims)[number]['id'];
export type GateId = (typeof RD.gates)[number]['gate'];
export type EvidenceClass = (typeof RD.evidenceClasses)[number]['id'];
export type LevelId = (typeof RD.levels)[number]['id'];
export type Role = (typeof RD.roles)[number]['id'];
export type Difficulty = 0 | 1 | 2 | 3 | 4 | 5;
export type AssistanceLevel = 0 | 1 | 2 | 3 | 4 | 5;

export type UniversalSubScores = Partial<Record<UniversalDimId, number>>;

export interface LevelScores {
  L1: number | null;
  L2: number | null;
  L3: number | null;
}

/**
 * Full assessment record. Core fields are always present after normalisation;
 * the large §17 "Diagnostic Progress Model" fields (v1.9–1.10) are optional and
 * preserved verbatim so imported records survive a round-trip.
 */
export interface RubricEntry {
  /* Core */
  id: string;
  rubricVersion: string;
  date: string; // YYYY-MM-DD
  task: string;
  taskType: TaskType | '';
  domain: string;

  /* Classification */
  problemLevel: LevelId | '';
  targetLevel: LevelId | '';
  answerLevel: LevelId | '';
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

  /* Scores */
  universalScore: number;
  taskSpecificScore: number;
  rawScore: number;
  cap: number | null;
  penalties: number;
  finalScore: number;
  universalSubScores: UniversalSubScores | null;
  levelScores: LevelScores;

  /* Verdict */
  demonstratedLevel: string;
  qualifyingEvidenceNote: string;
  mainReasonNextLevelNotReached: string;
  surviveProbing: string;
  confidence: string;

  /* Gates and tags */
  gates: Partial<Record<string, boolean>>;
  weaknessTags: string[];
  strengths: string;
  weaknesses: string;
  nextTarget: string;
  quickLog: boolean;

  /* §17 Diagnostic Progress Model — v1.9 */
  knowledgeGapTags: string[];
  gapTypes: string[];
  expectedElements: string[];
  presentElements: string[];
  missingElements: string[];
  elementSource: string;
  probeReadiness: unknown;
  evidenceSource: string[];
  retention: unknown;
  llmIndependence: unknown;
  roleRequirementCoverage: unknown;
  artifactReadiness: unknown;
  staleness: unknown;
  gapClosureStatus: unknown;
  priority: unknown;
  gapImpact: unknown;
  assessmentMode: unknown;
  calibration: unknown;
  retestPlan: unknown;
  roleReadinessRollup: unknown;
  proofStrength: unknown;
  antiInflationChecks: unknown;

  /* §17 Diagnostic Progress Model — v1.9.x */
  assessmentOutcome: unknown;
  conceptDiscovery: unknown;

  /* §16 Attempt tracking — v1.9.3+ */
  sessionId: string | null;
  parentAssessmentId: string | null;
  attemptGroupId: string | null;
  attemptNumber: number | null;
  attemptType: string;
  priorAssessmentId: string | null;
  sourceFile: string | null;
  sourceItemId: string | null;
  coverageStatus: string | null;
  secondaryTaskSignals: string[];
  problemName: string | null;
  platform: string | null;
  codingPattern: string | null;
  primaryDataStructure: string | null;
  compileStatus: string | null;
  testStatus: string | null;
  labelSetVersion: string | null;
  proposedNewTags: string[];

  /* §17 Decision quality — v1.10 */
  calibrationAnchors: string[];
  scoreUncertainty: unknown;
  gapRecurrence: unknown;
  transferSignal: unknown;
  retestQueue: unknown;
  assessmentQuality: unknown;
  roleReadinessEvidenceFloor: unknown;
  recoveryBehavior: unknown;
  scoreLiftActions: unknown;
  trackerHealth: unknown;

  /**
   * Lossless passthrough for any additional fields present in imported records
   * that this schema does not model explicitly. Re-flattened on export.
   */
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

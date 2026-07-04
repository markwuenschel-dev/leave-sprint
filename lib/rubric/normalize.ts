/**
 * normaliseEntry — the single ingest path for every rubric record (Quick Log,
 * the Q-Bank "mastered" bridge, and JSON import). Ported from rNormaliseEntry.
 *
 * Fixes the original's NaN bugs: `parseInt(x) ?? 0` never catches NaN and
 * `parseInt(x) || 0` collapses a legitimate 0. We use explicit guards here.
 *
 * Unknown keys on the raw record are preserved under `extra` so imported
 * old-format records round-trip losslessly.
 */

import { RUBRIC_VERSION } from './referenceData';
import { computeRaw, computeFinal, subTotal } from './scoring';
import type { RubricEntry } from './types';

function intOr(value: unknown, fallback: number): number {
  const n = parseInt(String(value), 10);
  return Number.isNaN(n) ? fallback : n;
}

function floatOrNull(value: unknown): number | null {
  if (value === '' || value === null || value === undefined) return null;
  const n = parseFloat(String(value));
  return Number.isNaN(n) ? null : n;
}

function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

/** Every field name we model explicitly — anything else lands in `extra`. */
const KNOWN_KEYS = new Set<string>([
  'id', 'rubricVersion', 'date', 'task', 'taskType', 'domain',
  'problemLevel', 'targetLevel', 'answerLevel', 'difficulty', 'difficultyAssignment', 'difficultyAttributeScore',
  'evidenceClass', 'autonomyConfidence', 'assistanceLevel',
  'primaryDomain', 'secondaryDomains', 'primaryRole', 'secondaryRoles',
  'universalScore', 'taskSpecificScore', 'rawScore', 'cap', 'penalties', 'finalScore',
  'universalSubScores', 'levelScores',
  'demonstratedLevel', 'qualifyingEvidenceNote', 'mainReasonNextLevelNotReached', 'surviveProbing', 'confidence',
  'gates', 'weaknessTags', 'strengths', 'weaknesses', 'nextTarget', 'quickLog',
  'knowledgeGapTags', 'gapTypes', 'expectedElements', 'presentElements', 'missingElements', 'elementSource',
  'probeReadiness', 'evidenceSource', 'retention', 'llmIndependence', 'roleRequirementCoverage',
  'artifactReadiness', 'staleness', 'gapClosureStatus', 'priority', 'gapImpact', 'assessmentMode',
  'calibration', 'retestPlan', 'roleReadinessRollup', 'proofStrength', 'antiInflationChecks',
  'assessmentOutcome', 'conceptDiscovery',
  'sessionId', 'parentAssessmentId', 'attemptGroupId', 'attemptNumber', 'attemptType', 'priorAssessmentId',
  'sourceFile', 'sourceItemId', 'coverageStatus', 'secondaryTaskSignals', 'problemName', 'platform',
  'codingPattern', 'primaryDataStructure', 'compileStatus', 'testStatus', 'labelSetVersion', 'proposedNewTags',
  'calibrationAnchors', 'scoreUncertainty', 'gapRecurrence', 'transferSignal', 'retestQueue',
  'assessmentQuality', 'roleReadinessEvidenceFloor', 'recoveryBehavior', 'scoreLiftActions', 'trackerHealth',
  'extra',
]);

type RawEntry = Record<string, unknown>;

export function normaliseEntry(input: Partial<RubricEntry> | RawEntry): RubricEntry {
  const raw = input as RawEntry;

  const subs = (raw.universalSubScores as RubricEntry['universalSubScores']) || null;
  const subsTotal = subs ? subTotal(subs) : null;
  const uParsed = parseFloat(String(raw.universalScore));
  const u = !Number.isNaN(uParsed) ? uParsed : subsTotal !== null ? subsTotal : 0;
  const tParsed = parseFloat(String(raw.taskSpecificScore));
  const t = !Number.isNaN(tParsed) ? tParsed : 0;

  const cap = raw.cap !== undefined && raw.cap !== null ? Number(raw.cap) : null;
  const penalties = Number(raw.penalties) || 0;
  const rawScore = raw.rawScore !== undefined ? Number(raw.rawScore) : computeRaw(u, t);
  const finalScore = raw.finalScore !== undefined ? Number(raw.finalScore) : computeFinal(rawScore, cap, penalties);

  const str = (v: unknown, fallback = ''): string => (v === undefined || v === null ? fallback : String(v));
  const arr = (v: unknown): string[] => (Array.isArray(v) ? (v as string[]) : []);

  // Collect any unrecognized keys for lossless round-trip.
  const priorExtra = (raw.extra as Record<string, unknown>) || {};
  const extra: Record<string, unknown> = { ...priorExtra };
  for (const key of Object.keys(raw)) {
    if (!KNOWN_KEYS.has(key)) extra[key] = raw[key];
  }

  const entry: RubricEntry = {
    /* Core */
    id: str(raw.id) || genId(),
    rubricVersion: str(raw.rubricVersion) || RUBRIC_VERSION,
    date: str(raw.date) || new Date().toISOString().slice(0, 10),
    task: str(raw.task),
    taskType: str(raw.taskType) as RubricEntry['taskType'],
    domain: str(raw.domain),

    /* Classification */
    problemLevel: (str(raw.problemLevel) || str(raw.targetLevel)) as RubricEntry['problemLevel'],
    targetLevel: (str(raw.targetLevel) || str(raw.problemLevel)) as RubricEntry['targetLevel'],
    answerLevel: str(raw.answerLevel) as RubricEntry['answerLevel'],
    difficulty: intOr(raw.difficulty, 0) as RubricEntry['difficulty'],
    difficultyAssignment: str(raw.difficultyAssignment),
    difficultyAttributeScore: floatOrNull(raw.difficultyAttributeScore),

    /* Evidence class */
    evidenceClass: (str(raw.evidenceClass) || 'prospective') as RubricEntry['evidenceClass'],
    autonomyConfidence: str(raw.autonomyConfidence),
    assistanceLevel: intOr(raw.assistanceLevel, 0) as RubricEntry['assistanceLevel'],

    /* Domains and roles */
    primaryDomain: str(raw.primaryDomain) || str(raw.domain),
    secondaryDomains: arr(raw.secondaryDomains),
    primaryRole: str(raw.primaryRole) as RubricEntry['primaryRole'],
    secondaryRoles: arr(raw.secondaryRoles) as RubricEntry['secondaryRoles'],

    /* Scores */
    universalScore: u,
    taskSpecificScore: t,
    rawScore,
    cap,
    penalties,
    finalScore,
    universalSubScores: subs,
    levelScores: (raw.levelScores as RubricEntry['levelScores']) || { L1: null, L2: null, L3: null },

    /* Verdict */
    demonstratedLevel: str(raw.demonstratedLevel),
    qualifyingEvidenceNote: str(raw.qualifyingEvidenceNote),
    mainReasonNextLevelNotReached: str(raw.mainReasonNextLevelNotReached),
    surviveProbing: str(raw.surviveProbing),
    confidence: str(raw.confidence),

    /* Gates and tags */
    gates: (raw.gates as RubricEntry['gates']) || {},
    weaknessTags: arr(raw.weaknessTags),
    strengths: str(raw.strengths),
    weaknesses: str(raw.weaknesses),
    nextTarget: str(raw.nextTarget),
    quickLog: Boolean(raw.quickLog),

    /* §17 Diagnostic Progress Model — v1.9 */
    knowledgeGapTags: arr(raw.knowledgeGapTags),
    gapTypes: arr(raw.gapTypes),
    expectedElements: arr(raw.expectedElements),
    presentElements: arr(raw.presentElements),
    missingElements: arr(raw.missingElements),
    elementSource: str(raw.elementSource),
    probeReadiness: raw.probeReadiness ?? null,
    evidenceSource: Array.isArray(raw.evidenceSource)
      ? (raw.evidenceSource as string[])
      : raw.evidenceSource
        ? [String(raw.evidenceSource)]
        : [],
    retention: raw.retention ?? null,
    llmIndependence: raw.llmIndependence ?? null,
    roleRequirementCoverage: raw.roleRequirementCoverage ?? null,
    artifactReadiness: raw.artifactReadiness ?? null,
    staleness: raw.staleness ?? null,
    gapClosureStatus: raw.gapClosureStatus ?? null,
    priority: raw.priority ?? null,
    gapImpact: raw.gapImpact ?? null,
    assessmentMode: raw.assessmentMode ?? null,
    calibration: raw.calibration ?? null,
    retestPlan: raw.retestPlan ?? null,
    roleReadinessRollup: raw.roleReadinessRollup ?? null,
    proofStrength: raw.proofStrength ?? null,
    antiInflationChecks: raw.antiInflationChecks ?? null,

    /* §17 Diagnostic Progress Model — v1.9.x */
    assessmentOutcome: raw.assessmentOutcome ?? null,
    conceptDiscovery: raw.conceptDiscovery ?? null,

    /* §16 Attempt tracking — v1.9.3+ */
    sessionId: (raw.sessionId as string) ?? null,
    parentAssessmentId: (raw.parentAssessmentId as string) ?? null,
    attemptGroupId: (raw.attemptGroupId as string) ?? null,
    attemptNumber: raw.attemptNumber != null ? Number(raw.attemptNumber) : null,
    attemptType: str(raw.attemptType) || 'initial',
    priorAssessmentId: (raw.priorAssessmentId as string) ?? null,
    sourceFile: (raw.sourceFile as string) ?? null,
    sourceItemId: (raw.sourceItemId as string) ?? null,
    coverageStatus: (raw.coverageStatus as string) ?? null,
    secondaryTaskSignals: arr(raw.secondaryTaskSignals),
    problemName: (raw.problemName as string) ?? null,
    platform: (raw.platform as string) ?? null,
    codingPattern: (raw.codingPattern as string) ?? null,
    primaryDataStructure: (raw.primaryDataStructure as string) ?? null,
    compileStatus: (raw.compileStatus as string) ?? null,
    testStatus: (raw.testStatus as string) ?? null,
    labelSetVersion: (raw.labelSetVersion as string) ?? null,
    proposedNewTags: arr(raw.proposedNewTags),

    /* §17 Decision quality — v1.10 */
    calibrationAnchors: arr(raw.calibrationAnchors),
    scoreUncertainty: raw.scoreUncertainty ?? null,
    gapRecurrence: raw.gapRecurrence ?? null,
    transferSignal: raw.transferSignal ?? null,
    retestQueue: raw.retestQueue ?? null,
    assessmentQuality: raw.assessmentQuality ?? null,
    roleReadinessEvidenceFloor: raw.roleReadinessEvidenceFloor ?? null,
    recoveryBehavior: raw.recoveryBehavior ?? null,
    scoreLiftActions: raw.scoreLiftActions ?? null,
    trackerHealth: raw.trackerHealth ?? null,
  };

  if (Object.keys(extra).length) entry.extra = extra;
  return entry;
}

/** Flatten `extra` back to top level so an exported record matches the old schema. */
export function flattenForExport(entry: RubricEntry): Record<string, unknown> {
  const { extra, ...rest } = entry;
  return { ...rest, ...(extra || {}) };
}

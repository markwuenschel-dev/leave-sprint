/**
 * normaliseEntry — the single ingest path for every rubric record (manual form,
 * Quick Log, the Q-Bank bridge, and JSON import). Produces the full v1.10 shape.
 *
 * - Accepts `assessmentId` OR legacy `id` (mirrors both).
 * - Migrates legacy boolean gates → Pass/Fail; passes through Pass/Partial/Fail.
 * - Fills answerLevel / qualifyingDemonstratedLevel / demonstratedLevel from
 *   derive.ts ONLY when the grader didn't supply them.
 * - Preserves any unrecognised keys under `extra` for lossless round-trip.
 */

import { RUBRIC_VERSION } from './referenceData';
import { computeRaw, computeFinal, subTotal } from './scoring';
import { deriveAnswerLevel, deriveQualifyingLevel, deriveDemonstratedLevel } from './derive';
import { normalizeTags } from './aliases';
import type { RubricEntry, Gates, LevelScores, LevelVerdicts } from './types';
import type { LoggingMode } from './diagnostics';

function intOr(value: unknown, fallback: number): number {
  const n = parseInt(String(value), 10);
  return Number.isNaN(n) ? fallback : n;
}
function num(value: unknown): number | null {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}
function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

const KNOWN_KEYS = new Set<string>([
  'id', 'assessmentId', 'rubricVersion', 'date', 'task', 'taskType', 'domain',
  'problemLevel', 'targetLevel', 'answerLevel', 'qualifyingDemonstratedLevel', 'difficulty', 'difficultyAssignment', 'difficultyAttributeScore',
  'evidenceClass', 'autonomyConfidence', 'assistanceLevel',
  'primaryDomain', 'secondaryDomains', 'primaryRole', 'secondaryRoles',
  'levelScores', 'levelVerdicts',
  'universalScore', 'taskSpecificScore', 'rawScore', 'cap', 'penalties', 'finalScore', 'universalSubScores',
  'demonstratedLevel', 'confidence', 'qualifyingEvidenceNote', 'mainReasonNextLevelNotReached', 'surviveProbing',
  'gates', 'weaknessTags', 'knowledgeGapTags', 'gapTypes', 'focusAreas', 'strengths', 'weaknesses', 'nextTarget', 'quickLog', 'loggingMode',
  'expectedElements', 'presentElements', 'missingElements', 'elementSource',
  'problemName', 'platform', 'codingPattern', 'primaryDataStructure', 'compileStatus', 'testStatus', 'edgeCasesCovered', 'edgeCasesMissed',
  'sessionId', 'parentAssessmentId', 'attemptGroupId', 'attemptNumber', 'attemptType', 'priorAssessmentId',
  'sourceFile', 'sourceItemId', 'coverageStatus', 'coverageNotes', 'secondaryTaskSignals', 'labelSetVersion',
  'assessmentOutcome', 'conceptDiscovery', 'probeReadiness', 'evidenceSource', 'retention', 'llmIndependence',
  'roleRequirementCoverage', 'artifactReadiness', 'staleness', 'gapClosureStatus', 'priority', 'gapImpact',
  'assessmentMode', 'calibration', 'retestPlan', 'roleReadinessRollup', 'proofStrength', 'antiInflationChecks',
  'calibrationAnchors', 'scoreUncertainty', 'gapRecurrence', 'transferSignal', 'retestQueue', 'assessmentQuality',
  'roleReadinessEvidenceFloor', 'recoveryBehavior', 'scoreLiftActions', 'trackerHealth', 'proposedNewTags',
  'extra',
]);

type RawEntry = Record<string, unknown>;

function migrateGates(raw: unknown): Gates {
  const out: Gates = {};
  if (raw && typeof raw === 'object') {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (v === true) out[k as keyof Gates] = 'Pass';
      else if (v === false) out[k as keyof Gates] = 'Fail';
      else if (v === 'Pass' || v === 'Partial' || v === 'Fail') out[k as keyof Gates] = v;
    }
  }
  return out;
}

function readLevelScores(raw: unknown): LevelScores {
  const r = (raw as Record<string, unknown>) || {};
  return { L1: num(r.L1), L2: num(r.L2), L3: num(r.L3) };
}
function readLevelVerdicts(raw: unknown): LevelVerdicts {
  const r = (raw as Record<string, unknown>) || {};
  const v = (x: unknown) => (x === 'Pass' || x === 'Borderline' || x === 'Fail' ? x : null);
  return { L1: v(r.L1), L2: v(r.L2), L3: v(r.L3) };
}

export function normaliseEntry(input: Partial<RubricEntry> | RawEntry): RubricEntry {
  const raw = input as RawEntry;
  const str = (v: unknown, f = ''): string => (v === undefined || v === null ? f : String(v));
  const arr = (v: unknown): string[] => (Array.isArray(v) ? (v as string[]) : []);
  const obj = <T>(v: unknown): T | null => (v && typeof v === 'object' ? (v as T) : null);

  const aid = str(raw.assessmentId) || str(raw.id) || genId();

  const subs = (raw.universalSubScores as RubricEntry['universalSubScores']) || null;
  const subsTotal = subs ? subTotal(subs) : null;
  const uParsed = Number(raw.universalScore);
  const universalScore = !Number.isNaN(uParsed) && raw.universalScore !== undefined && raw.universalScore !== null
    ? uParsed
    : subsTotal ?? 0;
  const taskSpecificScore = num(raw.taskSpecificScore) ?? 0;
  const cap = raw.cap !== undefined && raw.cap !== null ? Number(raw.cap) : null;
  const penalties = Number(raw.penalties) || 0;
  const rawScore = raw.rawScore !== undefined ? Number(raw.rawScore) : computeRaw(universalScore, taskSpecificScore);
  const finalScore = raw.finalScore !== undefined ? Number(raw.finalScore) : computeFinal(rawScore, cap, penalties);

  const levelScores = readLevelScores(raw.levelScores);
  const gates = migrateGates(raw.gates);
  const difficulty = intOr(raw.difficulty, 0) as RubricEntry['difficulty'];
  const assistanceLevel = intOr(raw.assistanceLevel, 0) as RubricEntry['assistanceLevel'];
  const problemLevel = (str(raw.problemLevel) || str(raw.targetLevel)) as RubricEntry['problemLevel'];

  // Prefer grader-supplied; else derive (§3.3/§14).
  let answerLevel = str(raw.answerLevel) as RubricEntry['answerLevel'];
  if (!answerLevel) answerLevel = deriveAnswerLevel(levelScores, gates, subs);
  let qualifyingDemonstratedLevel = str(raw.qualifyingDemonstratedLevel) as RubricEntry['qualifyingDemonstratedLevel'];
  if (!qualifyingDemonstratedLevel) {
    qualifyingDemonstratedLevel = deriveQualifyingLevel(answerLevel, problemLevel, difficulty, assistanceLevel);
  }
  let demonstratedLevel = str(raw.demonstratedLevel) as RubricEntry['demonstratedLevel'];
  if (!demonstratedLevel) demonstratedLevel = deriveDemonstratedLevel(levelScores, qualifyingDemonstratedLevel);

  // v1.11: loggingMode supersedes quickLog. Prefer explicit loggingMode; else map
  // quickLog:true→'fast', quickLog:false/absent→'full' (backward compatible).
  const loggingMode: LoggingMode = raw.loggingMode === 'fast' || raw.loggingMode === 'full' ? raw.loggingMode : raw.quickLog === true ? 'fast' : 'full';

  const priorExtra = (raw.extra as Record<string, unknown>) || {};
  const extra: Record<string, unknown> = { ...priorExtra };
  for (const key of Object.keys(raw)) {
    if (!KNOWN_KEYS.has(key)) extra[key] = raw[key];
  }

  const entry: RubricEntry = {
    id: aid,
    assessmentId: aid,
    rubricVersion: str(raw.rubricVersion) || RUBRIC_VERSION,
    date: str(raw.date) || new Date().toISOString().slice(0, 10),
    task: str(raw.task),
    taskType: str(raw.taskType) as RubricEntry['taskType'],
    domain: str(raw.domain),

    problemLevel,
    targetLevel: (str(raw.targetLevel) || problemLevel) as RubricEntry['targetLevel'],
    answerLevel,
    qualifyingDemonstratedLevel,
    difficulty,
    difficultyAssignment: str(raw.difficultyAssignment),
    difficultyAttributeScore: num(raw.difficultyAttributeScore),

    evidenceClass: (str(raw.evidenceClass) || 'prospective') as RubricEntry['evidenceClass'],
    autonomyConfidence: str(raw.autonomyConfidence),
    assistanceLevel,

    primaryDomain: str(raw.primaryDomain) || str(raw.domain),
    secondaryDomains: arr(raw.secondaryDomains),
    primaryRole: str(raw.primaryRole) as RubricEntry['primaryRole'],
    secondaryRoles: arr(raw.secondaryRoles) as RubricEntry['secondaryRoles'],

    levelScores,
    levelVerdicts: readLevelVerdicts(raw.levelVerdicts),

    universalScore,
    taskSpecificScore,
    rawScore,
    cap,
    penalties,
    finalScore,
    universalSubScores: subs,

    demonstratedLevel,
    confidence: str(raw.confidence) as RubricEntry['confidence'],
    qualifyingEvidenceNote: str(raw.qualifyingEvidenceNote),
    mainReasonNextLevelNotReached: str(raw.mainReasonNextLevelNotReached),
    surviveProbing: str(raw.surviveProbing),

    gates,
    weaknessTags: normalizeTags(raw.weaknessTags, 'weaknessTags'),
    knowledgeGapTags: normalizeTags(raw.knowledgeGapTags, 'knowledgeGapTags'),
    gapTypes: normalizeTags(raw.gapTypes, 'gapTypes'),
    focusAreas: arr(raw.focusAreas),
    strengths: str(raw.strengths),
    weaknesses: str(raw.weaknesses),
    nextTarget: str(raw.nextTarget),
    loggingMode,
    quickLog: Boolean(raw.quickLog),

    expectedElements: arr(raw.expectedElements),
    presentElements: arr(raw.presentElements),
    missingElements: arr(raw.missingElements),
    elementSource: str(raw.elementSource),

    problemName: (raw.problemName as string) ?? null,
    platform: (raw.platform as string) ?? null,
    codingPattern: (raw.codingPattern as string) ?? null,
    primaryDataStructure: (raw.primaryDataStructure as string) ?? null,
    compileStatus: (raw.compileStatus as RubricEntry['compileStatus']) ?? null,
    testStatus: (raw.testStatus as RubricEntry['testStatus']) ?? null,
    edgeCasesCovered: arr(raw.edgeCasesCovered),
    edgeCasesMissed: arr(raw.edgeCasesMissed),

    sessionId: (raw.sessionId as string) ?? null,
    parentAssessmentId: (raw.parentAssessmentId as string) ?? null,
    attemptGroupId: (raw.attemptGroupId as string) ?? null,
    attemptNumber: raw.attemptNumber != null ? Number(raw.attemptNumber) : null,
    attemptType: (str(raw.attemptType) || 'initial') as RubricEntry['attemptType'],
    priorAssessmentId: (raw.priorAssessmentId as string) ?? null,
    sourceFile: (raw.sourceFile as string) ?? null,
    sourceItemId: (raw.sourceItemId as string) ?? null,
    coverageStatus: (str(raw.coverageStatus) || 'included') as RubricEntry['coverageStatus'],
    coverageNotes: str(raw.coverageNotes),
    secondaryTaskSignals: arr(raw.secondaryTaskSignals),
    labelSetVersion: (raw.labelSetVersion as string) ?? null,

    assessmentOutcome: (raw.assessmentOutcome as RubricEntry['assessmentOutcome']) ?? null,
    conceptDiscovery: obj(raw.conceptDiscovery),
    probeReadiness: obj(raw.probeReadiness),
    evidenceSource: arr(raw.evidenceSource),
    retention: obj(raw.retention),
    llmIndependence: obj(raw.llmIndependence),
    roleRequirementCoverage: obj(raw.roleRequirementCoverage),
    artifactReadiness: obj(raw.artifactReadiness),
    staleness: obj(raw.staleness),
    gapClosureStatus: obj(raw.gapClosureStatus),
    priority: obj(raw.priority),
    gapImpact: obj(raw.gapImpact),
    assessmentMode: obj(raw.assessmentMode),
    calibration: obj(raw.calibration),
    retestPlan: obj(raw.retestPlan),
    roleReadinessRollup: obj(raw.roleReadinessRollup),
    proofStrength: obj(raw.proofStrength),
    antiInflationChecks: obj(raw.antiInflationChecks),
    calibrationAnchors: Array.isArray(raw.calibrationAnchors) ? (raw.calibrationAnchors as RubricEntry['calibrationAnchors']) : [],
    scoreUncertainty: obj(raw.scoreUncertainty),
    gapRecurrence: obj(raw.gapRecurrence),
    transferSignal: obj(raw.transferSignal),
    retestQueue: obj(raw.retestQueue),
    assessmentQuality: obj(raw.assessmentQuality),
    roleReadinessEvidenceFloor: obj(raw.roleReadinessEvidenceFloor),
    recoveryBehavior: obj(raw.recoveryBehavior),
    scoreLiftActions: obj(raw.scoreLiftActions),
    trackerHealth: obj(raw.trackerHealth),
    proposedNewTags: Array.isArray(raw.proposedNewTags) ? (raw.proposedNewTags as RubricEntry['proposedNewTags']) : [],
  };

  if (Object.keys(extra).length) entry.extra = extra;
  return entry;
}

/** Flatten `extra` back to top level so an exported record matches the schema. */
export function flattenForExport(entry: RubricEntry): Record<string, unknown> {
  const { extra, ...rest } = entry;
  return { ...rest, ...(extra || {}) };
}

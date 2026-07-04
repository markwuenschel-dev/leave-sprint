/**
 * Pure computations for the four progress dashboards. Kept out of components so
 * they're memoizable and testable. All inputs are RubricEntry[].
 */

import { RD } from './referenceData';
import { clusterForTag } from './clusters';
import type { RubricEntry, TaskType, LevelId } from './types';

const byDateAsc = (a: RubricEntry, b: RubricEntry) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
const RANK: Record<string, number> = { L1: 1, L2: 2, L3: 3 };

/* ── Dashboard 1: level trends + demonstrated distribution + gate pass rates ── */
export interface LevelTrends {
  byTaskType: { taskType: TaskType; label: string; color: string; L1: number[]; L2: number[]; L3: number[]; count: number }[];
  qualifyingDistribution: { level: string; count: number }[];
  gatePassRates: { gate: string; pass: number; partial: number; fail: number; total: number; rate: number }[];
}

export function levelTrends(entries: RubricEntry[]): LevelTrends {
  const asc = [...entries].sort(byDateAsc);
  const byTaskType = RD.taskTypes
    .map((t) => {
      const es = asc.filter((e) => e.taskType === t.id);
      const pick = (k: LevelId) => es.map((e) => e.levelScores[k]).filter((n): n is number => n !== null);
      return { taskType: t.id, label: t.label, color: t.color, L1: pick('L1'), L2: pick('L2'), L3: pick('L3'), count: es.length };
    })
    .filter((t) => t.count > 0);

  const distMap = new Map<string, number>([['L1', 0], ['L2', 0], ['L3', 0], ['None', 0]]);
  entries.forEach((e) => {
    const q = e.qualifyingDemonstratedLevel || 'None';
    distMap.set(q, (distMap.get(q) ?? 0) + 1);
  });
  const qualifyingDistribution = ['L1', 'L2', 'L3', 'None'].map((level) => ({ level, count: distMap.get(level) ?? 0 }));

  const gatePassRates = RD.gates.map((g) => {
    const withGate = entries.filter((e) => e.gates[g.gate as keyof typeof e.gates]);
    const pass = withGate.filter((e) => e.gates[g.gate as keyof typeof e.gates] === 'Pass').length;
    const partial = withGate.filter((e) => e.gates[g.gate as keyof typeof e.gates] === 'Partial').length;
    const fail = withGate.filter((e) => e.gates[g.gate as keyof typeof e.gates] === 'Fail').length;
    const total = withGate.length;
    return { gate: g.gate, pass, partial, fail, total, rate: total ? Math.round((pass / total) * 100) : 0 };
  });

  return { byTaskType, qualifyingDistribution, gatePassRates };
}

/* ── Dashboard 2: role readiness ── */
export interface RoleReadinessView {
  targetRole: string;
  readiness: string;
  blockingGaps: number;
  strong: string[];
  weak: string[];
  nextMilestone: string;
  hit: string[];
  partial: string[];
  missing: string[];
  coverageScore: number | null;
  evidenceFloorMet: boolean | null;
}

export function roleReadiness(entries: RubricEntry[]): RoleReadinessView[] {
  const asc = [...entries].sort(byDateAsc);
  const roles = new Set<string>();
  asc.forEach((e) => {
    const r = e.roleReadinessRollup?.targetRole || e.roleRequirementCoverage?.targetRole || e.roleReadinessEvidenceFloor?.targetRole;
    if (r) roles.add(r);
  });

  return Array.from(roles).map((role) => {
    const rollups = asc.filter((e) => e.roleReadinessRollup?.targetRole === role).map((e) => e.roleReadinessRollup!);
    const covs = asc.filter((e) => e.roleRequirementCoverage?.targetRole === role).map((e) => e.roleRequirementCoverage!);
    const floors = asc.filter((e) => e.roleReadinessEvidenceFloor?.targetRole === role).map((e) => e.roleReadinessEvidenceFloor!);
    const lastRollup = rollups[rollups.length - 1];
    const lastCov = covs[covs.length - 1];
    const lastFloor = floors[floors.length - 1];
    const uniq = (arr: (string[] | undefined)[]) => Array.from(new Set(arr.flatMap((a) => a ?? [])));
    return {
      targetRole: role,
      readiness: lastRollup?.readiness ?? 'Unknown',
      blockingGaps: lastRollup?.blockingGaps ?? 0,
      strong: lastRollup?.strongEvidenceAreas ?? [],
      weak: lastRollup?.weakEvidenceAreas ?? [],
      nextMilestone: lastRollup?.recommendedNextMilestone ?? '',
      hit: uniq(covs.map((c) => c.requirementsHit)),
      partial: uniq(covs.map((c) => c.requirementsPartial)),
      missing: uniq(covs.map((c) => c.requirementsMissing)),
      coverageScore: lastCov?.coverageScore ?? null,
      evidenceFloorMet: lastFloor?.evidenceFloorMet ?? null,
    };
  });
}

/* ── Dashboard 3: retest queue / scheduler ── */
const SEV_RANK: Record<string, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };
export interface RetestItem {
  id: string;
  task: string;
  bucket: 'due-now' | 'due-soon' | 'blocked';
  retestDate: string | null;
  stalenessRisk: string | null;
  severity: string | null;
  action: string;
  score: number;
}

export function retestSchedule(entries: RubricEntry[], today = new Date()): RetestItem[] {
  const todayStr = today.toISOString().slice(0, 10);
  const soon = new Date(today.getTime() + 7 * 86_400_000).toISOString().slice(0, 10);
  const items: RetestItem[] = [];

  entries.forEach((e) => {
    const retestDate = e.retestPlan?.retestDate ?? null;
    const staleRisk = e.staleness?.stalenessRisk ?? null;
    const blocked = (e.retestQueue?.blockedBy?.length ?? 0) > 0;
    const needsRetest = !!retestDate || e.gapClosureStatus?.retestRequired || staleRisk === 'High' || e.staleness?.refreshNeeded;
    if (!needsRetest && !blocked) return;

    let bucket: RetestItem['bucket'] = 'due-soon';
    if (blocked) bucket = 'blocked';
    else if ((retestDate && retestDate <= todayStr) || staleRisk === 'High') bucket = 'due-now';
    else if (retestDate && retestDate <= soon) bucket = 'due-soon';
    else if (e.gapClosureStatus?.retestRequired || e.staleness?.refreshNeeded) bucket = 'due-soon';

    const severity = e.priority?.severity ?? null;
    items.push({
      id: e.id,
      task: e.task,
      bucket,
      retestDate,
      stalenessRisk: staleRisk,
      severity,
      action: e.priority?.recommendedAction || e.retestPlan?.retestPrompt || e.nextTarget || 'Retest',
      score: (SEV_RANK[severity ?? ''] ?? 0) * 10 + (bucket === 'due-now' ? 5 : bucket === 'due-soon' ? 3 : 1),
    });
  });

  return items.sort((a, b) => b.score - a.score);
}

/* ── Dashboard 4: gap board + readiness trust ── */
export interface GapBoardView {
  columns: { status: string; items: { id: string; task: string; recurring: boolean; worsening: boolean; tags: string[] }[] }[];
  gapTypeCounts: { type: string; count: number }[];
  clusterCounts: { cluster: string; count: number }[];
}

export function gapBoard(entries: RubricEntry[]): GapBoardView {
  const statuses = ['open', 'in progress', 'reopened', 'closed'];
  const columns = statuses.map((status) => ({
    status,
    items: entries
      .filter((e) => e.gapClosureStatus?.status === status)
      .map((e) => ({
        id: e.id,
        task: e.task,
        recurring: !!e.gapRecurrence?.isRecurring,
        worsening: !!e.gapRecurrence?.worsening,
        tags: e.knowledgeGapTags.slice(0, 3),
      })),
  }));

  const gapTypeMap = new Map<string, number>();
  entries.forEach((e) => e.gapTypes.forEach((t) => gapTypeMap.set(t, (gapTypeMap.get(t) ?? 0) + 1)));
  const gapTypeCounts = [...gapTypeMap.entries()].map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count);

  const clusterMap = new Map<string, number>();
  entries.forEach((e) => e.knowledgeGapTags.forEach((t) => { const c = clusterForTag(t); clusterMap.set(c, (clusterMap.get(c) ?? 0) + 1); }));
  const clusterCounts = [...clusterMap.entries()].map(([cluster, count]) => ({ cluster, count })).sort((a, b) => b.count - a.count);

  return { columns, gapTypeCounts, clusterCounts };
}

export interface TrustView {
  avgProof: number | null;
  overclaimHigh: number;
  llmRiskHigh: number;
  calibrationMix: { type: string; count: number }[];
  trackerHealth: string | null;
}

export function trust(entries: RubricEntry[]): TrustView {
  const proofs = entries.map((e) => e.proofStrength?.score).filter((n): n is number => typeof n === 'number');
  const avgProof = proofs.length ? +(proofs.reduce((a, b) => a + b, 0) / proofs.length).toFixed(2) : null;
  const overclaimHigh = entries.filter((e) => e.antiInflationChecks?.overclaimRisk === 'High').length;
  const llmRiskHigh = entries.filter((e) => e.antiInflationChecks?.llmDependencyRisk === 'High').length;
  const calMap = new Map<string, number>();
  entries.forEach((e) => { const t = e.calibration?.evaluatorType; if (t) calMap.set(t, (calMap.get(t) ?? 0) + 1); });
  const calibrationMix = [...calMap.entries()].map(([type, count]) => ({ type, count }));
  const lastHealth = [...entries].sort(byDateAsc).map((e) => e.trackerHealth?.overallHealth).filter(Boolean).pop() ?? null;
  return { avgProof, overclaimHigh, llmRiskHigh, calibrationMix, trackerHealth: lastHealth ?? null };
}

export { RANK as LEVEL_RANK };

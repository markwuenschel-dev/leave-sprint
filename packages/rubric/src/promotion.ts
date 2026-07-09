/**
 * Promotion-evidence counting and the next-recommended action.
 * Open-ended career pacing (no leave-sprint 29-day calendar).
 * RD.promotionEvidence is the single source of truth for slot requirements.
 */

import { RD } from './referenceData';
import type { LevelId, RubricEntry, TaskType } from './types';

/** Planning horizon for pace hints (days). Not a product countdown. */
export const PLANNING_HORIZON_DAYS = 30;

function isoDateOffset(from: Date, dayOffset: number): string {
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + dayOffset);
  return d.toISOString().slice(0, 10);
}

const RANK: Record<LevelId, number> = { L1: 1, L2: 2, L3: 3 };

/**
 * An entry provides qualifying evidence at `lvl` when its qualifying demonstrated
 * level reaches `lvl` (§3.3) and its Correctness gate is not a Fail. This replaces
 * the old finalScore≥70 heuristic with the real three-score model.
 */
function qualifiesAt(e: RubricEntry, lvl: LevelId): boolean {
  const q = e.qualifyingDemonstratedLevel;
  if (!q || !(q in RANK)) return false;
  if (RANK[q as LevelId] < RANK[lvl]) return false;
  return e.gates?.Correctness !== 'Fail';
}

/** Total required qualifying evidence slots for a level. */
export function requiredSlots(lvl: LevelId): number {
  return (RD.promotionEvidence[lvl] as ReadonlyArray<{ min: number }>).reduce((s, r) => s + r.min, 0);
}

/**
 * Remaining evidence slots over a rolling planning horizon (for charts).
 * Index 0 = horizon start; last index = today. Future days are null.
 */
export function evidenceBurndown(
  entries: RubricEntry[],
  lvl: LevelId,
  today: Date = new Date(),
  horizonDays: number = PLANNING_HORIZON_DAYS,
): (number | null)[] {
  const reqs = RD.promotionEvidence[lvl] as ReadonlyArray<{ type: TaskType; min: number; maxAssist?: number; minDiff?: number }>;
  const total = requiredSlots(lvl);
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (horizonDays - 1));

  return Array.from({ length: horizonDays }, (_, i) => {
    const cutoff = isoDateOffset(start, i);
    const todayIso = isoDateOffset(today, 0);
    if (cutoff > todayIso) return null;
    const met = reqs.reduce((sum, req) => {
      const qualifying = entries.filter(
        (e) =>
          e.date <= cutoff &&
          e.taskType === req.type &&
          qualifiesAt(e, lvl) &&
          (req.maxAssist === undefined || e.assistanceLevel <= req.maxAssist) &&
          (req.minDiff === undefined || e.difficulty >= req.minDiff),
      ).length;
      return sum + Math.min(qualifying, req.min);
    }, 0);
    return total - met;
  });
}

const TASK_LABELS: Record<string, string> = {
  coding: 'coding',
  debugging: 'debugging',
  knowledge: 'technical knowledge',
  sysdesign: 'system design',
  prodeng: 'production engineering',
  walkthrough: 'project walkthrough',
  behavioral: 'behavioral technical',
};

export interface PromoRequirementStatus {
  type: TaskType;
  min: number;
  label?: string;
  maxAssist?: number;
  minDiff?: number;
  count: number;
  total: number;
  met: boolean;
  reasons: string[];
}

/** Per-requirement qualifying-evidence counts for a level. */
export function countPromoEvidence(entries: RubricEntry[], lvl: LevelId): PromoRequirementStatus[] {
  const reqs = (RD.promotionEvidence[lvl] ?? []) as ReadonlyArray<{
    type: TaskType; min: number; label?: string; maxAssist?: number; minDiff?: number;
  }>;
  return reqs.map((req) => {
    const all = entries.filter((e) => e.taskType === req.type);
    const q = all.filter(
      (e) =>
        qualifiesAt(e, lvl) &&
        (req.maxAssist === undefined || e.assistanceLevel <= req.maxAssist) &&
        (req.minDiff === undefined || e.difficulty >= req.minDiff),
    );
    const reasons: string[] = [];
    const notQualifying = all.filter((e) => !qualifiesAt(e, lvl)).length;
    const highAssist = req.maxAssist !== undefined
      ? all.filter((e) => qualifiesAt(e, lvl) && e.assistanceLevel > req.maxAssist!).length
      : 0;
    const lowDiff = req.minDiff !== undefined
      ? all.filter((e) => qualifiesAt(e, lvl) && e.difficulty < req.minDiff!).length
      : 0;
    if (notQualifying) reasons.push(`${notQualifying} not yet ${lvl}`);
    if (highAssist) reasons.push(`${highAssist} A>${req.maxAssist}`);
    if (lowDiff) reasons.push(`${lowDiff} D<${req.minDiff}`);
    return { ...req, count: q.length, total: all.length, met: q.length >= req.min, reasons };
  });
}

export interface NextRecommendation {
  done: boolean;
  text: string;
  detail: {
    lvl: LevelId;
    action: string;
    reason: string;
    pace: string;
    remaining: number;
    daysLeft: number;
  } | null;
}

/** The single highest-leverage next action, ranked by pace over the planning horizon. */
export function nextRecommended(
  entries: RubricEntry[],
  _today: Date = new Date(),
  daysLeft: number = PLANNING_HORIZON_DAYS,
): NextRecommendation {
  const horizon = Math.max(1, daysLeft);

  const candidates: {
    lvl: LevelId; req: { type: TaskType; min: number; maxAssist?: number; minDiff?: number };
    remaining: number; paceNeeded: number; totalForType: number; failedForType: number;
  }[] = [];

  (['L1', 'L2', 'L3'] as LevelId[]).forEach((lvl) => {
    (RD.promotionEvidence[lvl] as ReadonlyArray<{ type: TaskType; min: number; maxAssist?: number; minDiff?: number }>).forEach((req) => {
      const q = entries.filter(
        (e) =>
          e.taskType === req.type &&
          qualifiesAt(e, lvl) &&
          (req.maxAssist === undefined || (e.assistanceLevel ?? 0) <= req.maxAssist) &&
          (req.minDiff === undefined || (e.difficulty ?? 0) >= req.minDiff),
      ).length;
      const remaining = Math.max(0, req.min - q);
      if (remaining === 0) return;
      candidates.push({
        lvl,
        req,
        remaining,
        paceNeeded: remaining / horizon,
        totalForType: entries.filter((e) => e.taskType === req.type).length,
        failedForType: entries.filter((e) => e.taskType === req.type && !qualifiesAt(e, lvl)).length,
      });
    });
  });

  if (!candidates.length) {
    return { done: true, text: 'All promotion evidence requirements met. 🎉', detail: null };
  }

  const lvlPrio: Record<LevelId, number> = { L1: 0, L2: 1, L3: 2 };
  candidates.sort((a, b) => b.paceNeeded - a.paceNeeded || lvlPrio[a.lvl] - lvlPrio[b.lvl]);

  const top = candidates[0];
  const { req } = top;
  const label = TASK_LABELS[req.type] ?? req.type;
  const constraints: string[] = [];
  if (req.maxAssist !== undefined) constraints.push(`A≤${req.maxAssist}`);
  if (req.minDiff !== undefined) constraints.push(`D≥${req.minDiff}`);
  const constraintStr = constraints.length ? ` (${constraints.join(', ')})` : '';
  const plural = top.remaining > 1 ? 's' : '';

  let action: string;
  let reason: string;
  if (top.failedForType > 0 && top.totalForType > 0) {
    action = `Reach qualifying ${top.lvl} on ${top.remaining} more ${label} attempt${plural}${constraintStr}`;
    reason = `${top.failedForType} ${label} attempt${top.failedForType > 1 ? 's' : ''} not yet at ${top.lvl}.`;
  } else if (top.totalForType === 0) {
    action = `Log ${top.remaining} ${top.lvl}-qualifying ${label} attempt${plural}${constraintStr}`;
    reason = `No ${label} attempts logged yet.`;
  } else {
    action = `Log ${top.remaining} more ${top.lvl}-qualifying ${label} attempt${plural}${constraintStr}`;
    reason = `${top.totalForType - top.failedForType} qualifying so far, need ${req.min}.`;
  }

  const pace = top.paceNeeded < 1
    ? `${(1 / top.paceNeeded).toFixed(1)} days per attempt`
    : `${top.paceNeeded.toFixed(2)} attempts/day`;

  return {
    done: false,
    text: action,
    detail: { lvl: top.lvl, action, reason, pace, remaining: top.remaining, daysLeft: horizon },
  };
}

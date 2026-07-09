/**
 * Pure scoring functions, ported from unified_schedule.js (rCompute*, rScoreBand,
 * rEvidenceWeight, rSub*). No DOM, no side effects.
 */

import { RD } from './referenceData';
import type { RubricEntry, UniversalSubScores } from './types';

/** Raw = 60% universal + 40% task-specific. */
export function computeRaw(universal: number, task: number): number {
  return +(universal * 0.6 + task * 0.4).toFixed(1);
}

/** Apply penalties then clamp to the cap (if any), floored at 0. */
export function computeFinal(raw: number, cap: number | null | undefined, penalties: number | string): number {
  let f = raw - (parseFloat(String(penalties)) || 0);
  if (cap !== null && cap !== undefined && !Number.isNaN(Number(cap))) {
    f = Math.min(f, Number(cap));
  }
  return +Math.max(0, f).toFixed(1);
}

export type ScoreBand = (typeof RD.scoreBands)[number];

/** First band whose `min` the score meets (bands are ordered high→low). */
export function scoreBand(score: number): ScoreBand {
  return RD.scoreBands.find((b) => score >= b.min) ?? RD.scoreBands[RD.scoreBands.length - 1];
}

export function taskColor(id: string): string {
  return RD.taskTypes.find((t) => t.id === id)?.color ?? 'var(--text-dim)';
}

export function taskLabel(id: string): string {
  return RD.taskTypes.find((t) => t.id === id)?.label ?? id;
}

/** Evidence-class weight (prospective 1.0 / A 0.75 / B 0.40 / C 0.0). */
export function evidenceWeight(entry: Pick<RubricEntry, 'evidenceClass'>): number {
  const cls = entry.evidenceClass || 'prospective';
  return RD.evidenceClasses.find((e) => e.id === cls)?.weight ?? 1.0;
}

/** Normalize the 6 universal sub-scores to 0–100% (null where unset). */
export function subPct(subScores: UniversalSubScores | null | undefined): (number | null)[] {
  return RD.universalDims.map((d) => {
    const v = subScores?.[d.id];
    return v !== null && v !== undefined && (v as unknown) !== ''
      ? Math.round((Number(v) / d.max) * 100)
      : null;
  });
}

/** Sum the 6 universal sub-scores; null if any is missing/NaN. */
export function subTotal(subScores: UniversalSubScores | null | undefined): number | null {
  if (!subScores) return null;
  const vals = RD.universalDims.map((d) => parseFloat(String(subScores[d.id])));
  return vals.some(Number.isNaN) ? null : +vals.reduce((s, v) => s + v, 0).toFixed(1);
}

/** Average per-dimension % across the entries that carry sub-scores. */
export function avgSubPct(entries: Pick<RubricEntry, 'universalSubScores'>[]): (number | null)[] | null {
  const withScores = entries.filter((e) => e.universalSubScores && subTotal(e.universalSubScores) !== null);
  if (!withScores.length) return null;
  const totals = new Array(RD.universalDims.length).fill(0);
  withScores.forEach((e) => {
    subPct(e.universalSubScores).forEach((p, i) => {
      totals[i] += p ?? 0;
    });
  });
  return totals.map((t) => Math.round(t / withScores.length));
}

/**
 * Pure velocity/progress computations for the Velocity dashboard. Sprint-day
 * views (stages, rhythm) use the fixed 29-day window; competency uses rolling
 * calendar weeks. All functions are side-effect free and memoizable.
 */

import { SPRINT_START, SPRINT_DAYS, getDateForDay } from './types';
import type { DayState, StageState, Problem, ProblemStatus, RubricEntry, LevelId } from './types';

const DAY_MS = 86_400_000;

/** Elapsed sprint day (1-based), UNCLAMPED — may exceed SPRINT_DAYS after the sprint. */
export function currentSprintDay(today: Date = new Date()): number {
  return Math.max(1, Math.floor((today.getTime() - SPRINT_START.getTime()) / DAY_MS) + 1);
}

/** Clamped 1..SPRINT_DAYS (for fixed-window charts). */
export function clampedSprintDay(today: Date = new Date()): number {
  return Math.min(SPRINT_DAYS, currentSprintDay(today));
}

/** Percent (0–100) of the 4 rhythm disciplines done for a day. */
function dayPct(d?: DayState): number {
  if (!d) return 0;
  const r = d.rhythm;
  return ((Number(r.coding) + Number(r.file) + Number(r.qa) + Number(r.build)) / 4) * 100;
}

/* ── Stage pace ───────────────────────────────────────── */

/** Cumulative completed stages per sprint day (1..29); null after today. */
export function stageCumulativeByDay(stages: Record<string, StageState>, today: Date = new Date()): (number | null)[] {
  const perDay = new Array(SPRINT_DAYS + 1).fill(0);
  Object.values(stages).forEach((s) => {
    if (!s.done || !s.doneAt) return;
    const day = Math.floor((new Date(s.doneAt).getTime() - SPRINT_START.getTime()) / DAY_MS) + 1;
    if (day >= 1 && day <= SPRINT_DAYS) perDay[day] += 1;
  });
  const cutoff = clampedSprintDay(today);
  let run = 0;
  const out: (number | null)[] = [];
  for (let day = 1; day <= SPRINT_DAYS; day++) {
    run += perDay[day];
    out.push(day <= cutoff ? run : null);
  }
  return out;
}

/** Linear ideal-pace line from 0 to total across the 29 days. */
export function idealStageLine(total: number): number[] {
  return Array.from({ length: SPRINT_DAYS }, (_, i) => Math.round((total * (i + 1)) / SPRINT_DAYS));
}

export interface StagePaceStats {
  completed: number;
  velocity: number; // stages/day
  projectedFinishDay: number | null; // null when complete or no data
  onTrackDelta: number; // actual − ideal at today
}

export function stagePaceStats(stages: Record<string, StageState>, total: number, today: Date = new Date()): StagePaceStats {
  const day = clampedSprintDay(today);
  const cum = stageCumulativeByDay(stages, today);
  const completed = (cum[day - 1] as number) ?? 0;
  const velocity = day > 0 ? +(completed / day).toFixed(2) : 0;
  const idealNow = Math.round((total * day) / SPRINT_DAYS);
  const projectedFinishDay = completed >= total ? null : completed > 0 ? Math.ceil((total / completed) * day) : null;
  return { completed, velocity, projectedFinishDay, onTrackDelta: completed - idealNow };
}

/* ── Daily rhythm ─────────────────────────────────────── */

/** Cumulative fully-done days (all 4 disciplines) per sprint day; null after today. */
export function fullDaysCumulativeByDay(days: Record<number, DayState>, today: Date = new Date()): (number | null)[] {
  const cutoff = clampedSprintDay(today);
  let run = 0;
  const out: (number | null)[] = [];
  for (let day = 1; day <= SPRINT_DAYS; day++) {
    if (dayPct(days[day]) === 100) run += 1;
    out.push(day <= cutoff ? run : null);
  }
  return out;
}

/** Per-discipline completion rate (%) across the days recorded so far. */
export function disciplineRates(days: Record<number, DayState>, today: Date = new Date()): { key: string; label: string; pct: number }[] {
  const cutoff = clampedSprintDay(today);
  const keys = [
    { key: 'coding', label: 'Coding' },
    { key: 'file', label: 'File' },
    { key: 'qa', label: 'Q&A' },
    { key: 'build', label: 'Build' },
  ] as const;
  return keys.map(({ key, label }) => {
    let done = 0;
    for (let day = 1; day <= cutoff; day++) if (days[day]?.rhythm[key]) done += 1;
    return { key, label, pct: cutoff > 0 ? Math.round((done / cutoff) * 100) : 0 };
  });
}

/** 0..1 completion intensity per sprint day, for the heatmap (length = max(SPRINT_DAYS, today)). */
export function rhythmIntensity(days: Record<number, DayState>, today: Date = new Date()): { day: number; value: number }[] {
  const span = Math.max(SPRINT_DAYS, currentSprintDay(today));
  return Array.from({ length: span }, (_, i) => ({ day: i + 1, value: dayPct(days[i + 1]) / 100 }));
}

/* ── Problem bank (snapshot — no timestamps) ──────────── */

export function problemStatusCounts(problems: Problem[]): { byStatus: Record<ProblemStatus, number>; total: number; pctSolid: number } {
  const byStatus: Record<ProblemStatus, number> = { 'not-started': 0, practicing: 0, solid: 0 };
  problems.forEach((p) => {
    byStatus[p.status] = (byStatus[p.status] ?? 0) + 1;
  });
  const total = problems.length;
  return { byStatus, total, pctSolid: total ? Math.round((byStatus.solid / total) * 100) : 0 };
}

/* ── Competency (rolling calendar weeks) ──────────────── */

/** Monday-based ISO week start (YYYY-MM-DD) for a date string. */
function weekStartOf(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return dateStr;
  const dow = (d.getDay() + 6) % 7; // 0 = Monday
  d.setDate(d.getDate() - dow);
  return d.toISOString().slice(0, 10);
}

export interface WeekBucket {
  weekStart: string;
  count: number;
  qualifying: Record<LevelId, number>;
}

/** Assessments bucketed by calendar week (ascending), with per-level qualifying counts. */
export function weeklyBuckets(entries: RubricEntry[]): WeekBucket[] {
  const map = new Map<string, WeekBucket>();
  entries.forEach((e) => {
    if (!e.date) return;
    const wk = weekStartOf(e.date);
    let b = map.get(wk);
    if (!b) {
      b = { weekStart: wk, count: 0, qualifying: { L1: 0, L2: 0, L3: 0 } };
      map.set(wk, b);
    }
    b.count += 1;
    const q = e.qualifyingDemonstratedLevel;
    if (q === 'L1' || q === 'L2' || q === 'L3') b.qualifying[q] += 1;
  });
  return Array.from(map.values()).sort((a, b) => (a.weekStart < b.weekStart ? -1 : 1));
}

/** Cumulative total qualifying-evidence count per week (for an accrual line). */
export function cumulativeQualifying(buckets: WeekBucket[]): number[] {
  let run = 0;
  return buckets.map((b) => {
    run += b.qualifying.L1 + b.qualifying.L2 + b.qualifying.L3;
    return run;
  });
}

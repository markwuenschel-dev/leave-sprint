/**
 * Gap queue, board helpers, and role × level performance (decision pack A/B/C).
 * Pure functions over RubricEntry[] — no React.
 */

import {
  RD,
  gapBoard,
  retestSchedule,
  type GapBoardView,
  type RetestItem,
  type RubricEntry,
  type LevelId,
} from "@waypoint/rubric";
import type { RoleFilter } from "./domain";

export type MatrixRole = "SWE" | "MLE" | "DS" | "DE";

export const MATRIX_ROLES: MatrixRole[] = ["SWE", "MLE", "DS", "DE"];
export const MATRIX_LEVELS: LevelId[] = ["L1", "L2", "L3"];

const OPEN_STATUSES = new Set(["open", "in progress", "reopened"]);

/** Map a graded entry to matrix role, or null if unscoped / escape. */
export function entryMatrixRole(e: RubricEntry): MatrixRole | null {
  const pr = e.primaryRole;
  if (pr === "SWE" || pr === "MLE" || pr === "DS" || pr === "DE") return pr;

  const blob = `${e.domain || ""} ${e.primaryDomain || ""} ${e.primaryRole || ""}`.toUpperCase();
  if (/\bSWE\b|FULL.?STACK|BACKEND|FRONTEND|REACT/.test(blob)) return "SWE";
  if (/\bMLE\b|MACHINE.?LEARN|ML\b/.test(blob)) return "MLE";
  if (/\bDS\b|DATA.?SCIEN|STATIST/.test(blob)) return "DS";
  if (/\bDE\b|DATA.?ENG|ETL|PIPELINE/.test(blob)) return "DE";
  return null;
}

export function filterEntriesByRole(
  entries: RubricEntry[],
  roleFilter: RoleFilter,
): RubricEntry[] {
  if (roleFilter === "ALL") return entries;
  // Narrow filters ("SWE" | "MLE" | "DS" | "DE") are exactly MatrixRole values.
  return entries.filter((e) => entryMatrixRole(e) === roleFilter);
}

export function rolesForFilter(roleFilter: RoleFilter): MatrixRole[] {
  if (roleFilter === "ALL") return MATRIX_ROLES;
  return [roleFilter];
}

function isClosed(e: RubricEntry): boolean {
  const st = e.gapClosureStatus?.status;
  return st === "closed" || st === "not applicable";
}

function isIgnore(e: RubricEntry): boolean {
  return e.priority?.nextActionType === "ignore for now";
}

/** Active retest queue: hide closed; deprioritize "ignore for now". */
export function activeRetestQueue(
  entries: RubricEntry[],
  roleFilter: RoleFilter = "ALL",
  today = new Date(),
): RetestItem[] {
  const scoped = filterEntriesByRole(entries, roleFilter).filter((e) => !isClosed(e));
  const byId = new Map(scoped.map((e) => [e.id, e]));
  const items = retestSchedule(scoped, today).filter((i) => byId.has(i.id));

  return items.sort((a, b) => {
    const aIgn = isIgnore(byId.get(a.id)!);
    const bIgn = isIgnore(byId.get(b.id)!);
    if (aIgn !== bIgn) return aIgn ? 1 : -1;
    return b.score - a.score;
  });
}

export function buildGapBoard(
  entries: RubricEntry[],
  roleFilter: RoleFilter = "ALL",
): GapBoardView {
  return gapBoard(filterEntriesByRole(entries, roleFilter));
}

/** High / Critical severity gaps that are still open-ish. Soft signal only. */
export function openHighGapCount(
  entries: RubricEntry[],
  roleFilter: RoleFilter = "ALL",
): number {
  return filterEntriesByRole(entries, roleFilter).filter((e) => {
    if (isClosed(e)) return false;
    const st = e.gapClosureStatus?.status;
    const open =
      !st || OPEN_STATUSES.has(st) || (e.gapTypes?.length ?? 0) > 0 || (e.knowledgeGapTags?.length ?? 0) > 0;
    if (!open) return false;
    const sev = e.priority?.severity;
    return sev === "High" || sev === "Critical";
  }).length;
}

export function openGapCount(
  entries: RubricEntry[],
  roleFilter: RoleFilter = "ALL",
): number {
  return filterEntriesByRole(entries, roleFilter).filter((e) => {
    if (isClosed(e)) return false;
    const st = e.gapClosureStatus?.status;
    return (
      OPEN_STATUSES.has(st || "") ||
      ((e.gapTypes?.length ?? 0) > 0 && st !== "closed")
    );
  }).length;
}

export interface RoleLevelCell {
  count: number;
  /** This L is the best qualifying level seen for the role. */
  isBest: boolean;
}

export interface RoleLevelRow {
  role: MatrixRole;
  cells: Record<LevelId, RoleLevelCell>;
  best: LevelId | null;
  total: number;
}

export interface RoleLevelMatrix {
  rows: RoleLevelRow[];
}

const L_RANK: Record<string, number> = { L1: 1, L2: 2, L3: 3 };

export function buildRoleLevelMatrix(
  entries: RubricEntry[],
  roleFilter: RoleFilter = "ALL",
): RoleLevelMatrix {
  const scoped = filterEntriesByRole(entries, roleFilter);
  const roles = rolesForFilter(roleFilter);

  const rows: RoleLevelRow[] = roles.map((role) => {
    const hits: Record<LevelId, number> = { L1: 0, L2: 0, L3: 0 };
    for (const e of scoped) {
      if (entryMatrixRole(e) !== role) continue;
      const q = e.qualifyingDemonstratedLevel;
      if (q === "L1" || q === "L2" || q === "L3") hits[q] += 1;
    }
    let best: LevelId | null = null;
    for (const L of MATRIX_LEVELS) {
      if (hits[L] > 0 && (best == null || L_RANK[L] > L_RANK[best])) best = L;
    }
    const total = hits.L1 + hits.L2 + hits.L3;
    return {
      role,
      best,
      total,
      cells: {
        L1: { count: hits.L1, isBest: best === "L1" },
        L2: { count: hits.L2, isBest: best === "L2" },
        L3: { count: hits.L3, isBest: best === "L3" },
      },
    };
  });

  return { rows };
}

export interface WeekBucket {
  weekStart: string;
  count: number;
  qualifying: Record<LevelId, number>;
}

function weekStartOf(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  if (Number.isNaN(d.getTime())) return dateStr;
  const dow = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dow);
  return d.toISOString().slice(0, 10);
}

export function weeklyAssessmentBuckets(
  entries: RubricEntry[],
  roleFilter: RoleFilter = "ALL",
): WeekBucket[] {
  const map = new Map<string, WeekBucket>();
  for (const e of filterEntriesByRole(entries, roleFilter)) {
    if (!e.date) continue;
    const wk = weekStartOf(e.date);
    let b = map.get(wk);
    if (!b) {
      b = { weekStart: wk, count: 0, qualifying: { L1: 0, L2: 0, L3: 0 } };
      map.set(wk, b);
    }
    b.count += 1;
    const q = e.qualifyingDemonstratedLevel;
    if (q === "L1" || q === "L2" || q === "L3") b.qualifying[q] += 1;
  }
  return Array.from(map.values()).sort((a, b) =>
    a.weekStart < b.weekStart ? -1 : 1,
  );
}

export function cumulativeQualifying(buckets: WeekBucket[]): number[] {
  let run = 0;
  return buckets.map((b) => {
    run += b.qualifying.L1 + b.qualifying.L2 + b.qualifying.L3;
    return run;
  });
}

/* ── Score-over-time timeline (per assessment, chronological) ──────────────
   Dates are lumpy (bursts of same-day imports), so downstream charts plot by
   attempt index, not a true time axis — that keeps the trajectory readable. */
export interface TimelinePoint {
  id: string;
  date: string;
  taskType: RubricEntry["taskType"];
  task: string;
  levelScores: RubricEntry["levelScores"];
  final: number | null;
  qualifying: RubricEntry["qualifyingDemonstratedLevel"];
}

export function scoreTimeline(
  entries: RubricEntry[],
  roleFilter: RoleFilter = "ALL",
): TimelinePoint[] {
  return filterEntriesByRole(entries, roleFilter)
    .filter((e) => !!e.date)
    .map((e) => ({
      id: e.id,
      date: e.date,
      taskType: e.taskType,
      task: e.task,
      levelScores: e.levelScores,
      final: typeof e.finalScore === "number" ? e.finalScore : null,
      qualifying: e.qualifyingDemonstratedLevel,
    }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/** Trailing rolling average (window w) over a numeric-or-null series; nulls skipped. */
export function rollingAverage(values: (number | null)[], w = 5): (number | null)[] {
  return values.map((_, i) => {
    const win = values
      .slice(Math.max(0, i - w + 1), i + 1)
      .filter((v): v is number => v !== null);
    return win.length ? Math.round(win.reduce((s, v) => s + v, 0) / win.length) : null;
  });
}

/* ── Per-task-type trajectory (small multiples) ─────────────────────────── */
export interface TaskTypeTrend {
  taskType: string;
  label: string;
  color: string;
  labels: string[]; // dates for this task type's own chronological sequence
  final: (number | null)[]; // rolling average of final score over that sequence
  count: number;
}

export function trendsByTaskType(
  entries: RubricEntry[],
  roleFilter: RoleFilter = "ALL",
  w = 5,
): TaskTypeTrend[] {
  const tl = scoreTimeline(entries, roleFilter);
  return RD.taskTypes
    .map((tt) => {
      const pts = tl.filter((p) => p.taskType === tt.id);
      return {
        taskType: tt.id,
        label: tt.label,
        color: tt.color,
        labels: pts.map((p) => p.date),
        final: rollingAverage(pts.map((p) => p.final), w),
        count: pts.length,
      };
    })
    .filter((t) => t.count > 0);
}

/* ── Rolling qualifying rate (share of trailing window that earned L1/L2/L3) ── */
export interface RateTrend {
  labels: string[];
  rate: (number | null)[]; // percent 0–100
}

export function qualifyingRateTrend(
  entries: RubricEntry[],
  roleFilter: RoleFilter = "ALL",
  window = 10,
): RateTrend {
  const tl = scoreTimeline(entries, roleFilter);
  const hit: number[] = tl.map((p) =>
    p.qualifying === "L1" || p.qualifying === "L2" || p.qualifying === "L3" ? 1 : 0,
  );
  const rate = hit.map((_, i) => {
    const win = hit.slice(Math.max(0, i - window + 1), i + 1);
    return win.length ? Math.round((win.reduce((s, v) => s + v, 0) / win.length) * 100) : null;
  });
  return { labels: tl.map((p) => p.date), rate };
}

export type GapClosureStatusValue =
  | "open"
  | "in progress"
  | "reopened"
  | "closed"
  | "not applicable";

export const GAP_STATUS_CHIPS: GapClosureStatusValue[] = [
  "open",
  "in progress",
  "reopened",
  "closed",
];

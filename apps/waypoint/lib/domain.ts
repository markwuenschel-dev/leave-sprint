import type { Problem, FileDefenseItem, Energy } from "@waypoint/practice-types";
import type { RubricEntry } from "@waypoint/rubric";
import type { QBankStatus, TrackKey } from "@waypoint/qbank";

export type Phase = "B" | "A";
export type RoleFilter = "ALL" | "SWE" | "MLE";
export type PrimaryRole = "SWE_FS_II" | "MLE_II";

export type TargetRole =
  | "SWE_FS_II"
  | "MLE_II"
  | "DS"
  | "DE"
  | "BIE"
  | "BIA"
  | "other";

export type AppStatus =
  | "wishlist"
  | "applied"
  | "interviewing"
  | "offer"
  | "rejected"
  | "withdrawn";

export type RhythmKey = "practice" | "defense" | "interview" | "admin";

export interface RhythmSlots {
  practice: boolean;
  defense: boolean;
  interview: boolean;
  admin: boolean;
}

export interface RhythmDay {
  date: string; // YYYY-MM-DD
  slots: RhythmSlots;
  journal?: string;
  focusNote?: string;
  energy?: Energy;
  lastUpdated?: string;
}

export interface WeeklyReview {
  weekStart: string; // YYYY-MM-DD (Monday)
  whatMoved?: string;
  focusNext?: string;
  pipelineNotes?: string;
  done: boolean;
  lastUpdated?: string;
}

export interface MaterialRef {
  label: string;
  url: string;
}

export interface Application {
  id: string;
  company: string;
  roleTitle: string;
  targetRole: TargetRole;
  url?: string;
  status: AppStatus;
  statusChangedAt: string;
  appliedAt?: string;
  notes?: string;
  materials: MaterialRef[];
  createdAt: string;
  updatedAt: string;
}

export interface WaypointState {
  phase: Phase;
  roleFilter: RoleFilter;
  rhythmDays: Record<string, RhythmDay>;
  weeklyReviews: Record<string, WeeklyReview>;
  problems: Problem[];
  fileDefense: FileDefenseItem[];
  rubricEntries: RubricEntry[];
  qbankStatus: Record<string, QBankStatus>;
  qbankPos: { track: TrackKey; idx: number };
  applications: Application[];
  /** Manually marked solid mocks/scored sessions per primary (count can also derive from rubric). */
  solidInterviewLogs: Record<PrimaryRole, string[]>; // ISO dates or entry ids
  lastUpdated?: string;
}

export const TARGET_ROLE_LABELS: Record<TargetRole, string> = {
  SWE_FS_II: "SWE Full Stack II",
  MLE_II: "MLE II",
  DS: "DS",
  DE: "DE",
  BIE: "BIE",
  BIA: "BIA",
  other: "Other",
};

export const APP_STATUSES: AppStatus[] = [
  "wishlist",
  "applied",
  "interviewing",
  "offer",
  "rejected",
  "withdrawn",
];

export function todayIso(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/** Monday of the week containing `d` (local). */
export function weekStartIso(d = new Date()): string {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x.toISOString().slice(0, 10);
}

export function emptyRhythm(date: string): RhythmDay {
  return {
    date,
    slots: { practice: false, defense: false, interview: false, admin: false },
  };
}

import type { Problem, FileDefenseItem, Energy } from "@waypoint/practice-types";
import type { RubricEntry } from "@waypoint/rubric";
import type { QBankStatus, TrackKey } from "@waypoint/qbank";
import type { StudyGuide } from "./study";

export type Phase = "B" | "A";
/**
 * Role scope for the analytics boards (matrix, gaps, retest, performance).
 * Mirrors the roles the role×level matrix tracks (SWE/MLE primary + DS/DE/BIE/BIA
 * escape) plus "ALL". This is a display filter only — it never feeds the
 * evidence-green floor, which is fixed to the two primary roles.
 *
 * These ids match `RD.roles` in @waypoint/rubric, which is what carries each
 * role's scoring weights — BIE and BIA are weighted very differently (BIE leans
 * dashboard modeling + ETL, BIA leans business context + stakeholder comms), so
 * they stay distinct rather than collapsing into DS.
 */
export type RoleFilter = "ALL" | "SWE" | "MLE" | "DS" | "DE" | "BIE" | "BIA";
export type PrimaryRole = "SWE_FS_II" | "MLE_II";

/** Single source of truth for the header role-scope control. */
export const ROLE_FILTER_OPTIONS: { value: RoleFilter; label: string }[] = [
  { value: "ALL", label: "All roles" },
  { value: "SWE", label: "SWE only" },
  { value: "MLE", label: "MLE only" },
  { value: "DS", label: "DS only" },
  { value: "DE", label: "DE only" },
  { value: "BIE", label: "BIE only" },
  { value: "BIA", label: "BIA only" },
];

const ROLE_FILTER_VALUES: ReadonlySet<string> = new Set(
  ROLE_FILTER_OPTIONS.map((o) => o.value),
);

/** True when `v` is a known RoleFilter value. */
export function isRoleFilter(v: unknown): v is RoleFilter {
  return typeof v === "string" && ROLE_FILTER_VALUES.has(v);
}

/** Narrow an untrusted (persisted / imported) value to a RoleFilter, else "ALL". */
export function coerceRoleFilter(v: unknown): RoleFilter {
  return isRoleFilter(v) ? v : "ALL";
}

/** Short label for a role scope, e.g. "All roles" / "SWE only". */
export function roleFilterLabel(f: RoleFilter): string {
  return ROLE_FILTER_OPTIONS.find((o) => o.value === f)?.label ?? "All roles";
}

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
  /**
   * Per-track custom deck order (question ids). Absent track → natural data
   * order. Set by Shuffle; "mark mastered" moves that id to the end without
   * reshuffling the rest. Ids no longer in the bank are dropped on resolve;
   * new bank questions append in natural order.
   */
  qbankOrder: Partial<Record<TrackKey, string[]>>;
  applications: Application[];
  /** Manually marked solid mocks/scored sessions per primary (count can also derive from rubric). */
  solidInterviewLogs: Record<PrimaryRole, string[]>; // ISO dates or entry ids
  /**
   * AI Mock cross-session memory so a fresh page load doesn't regenerate the same
   * opening question. `seq` rotates which Q Bank item seeds the next session;
   * `asked` is the running list of already-generated questions fed to the prompt's
   * avoid-list (capped in the setter). Both persist through /api/state.
   */
  mockSeq: number;
  mockAsked: string[];
  /**
   * Cached Study Guides, one per role scope, each carrying its build watermark
   * (gradeCount) so the surface can flag staleness. Rebuilt only on demand.
   */
  studyGuides: Partial<Record<RoleFilter, StudyGuide>>;
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

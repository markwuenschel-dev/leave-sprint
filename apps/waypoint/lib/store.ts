"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ProblemStatus } from "@waypoint/practice-types";
import type { RubricEntry } from "@waypoint/rubric";
import { mergeEntries, normaliseEntry } from "@waypoint/rubric";
import type { QBankStatus, TrackKey } from "@waypoint/qbank";
import { serverStorage } from "./persist/serverStorage";
import { SEED } from "../data/seed";
import { mergeCatalogLists } from "../data/catalog";
import { applyTwinImport } from "./twinImport";
import type {
  Application,
  AppStatus,
  Phase,
  PrimaryRole,
  RhythmKey,
  RoleFilter,
  TargetRole,
  WaypointState,
} from "./domain";
import type { TwinImportSummary } from "./twinImport";
import type {
  Campaign,
  CampaignStage,
  JdSnapshot,
  JobRequirement,
  JobTarget,
  Project,
  ResumeClaim,
  ResumeVersion,
} from "./career/types";
import { EMPTY_CLAIM_DEFENSE, EMPTY_PROJECT_DEFENSE } from "./career/types";
import type { StudyGuide } from "./study";
import { emptyRhythm, todayIso, weekStartIso } from "./domain";

const now = () => new Date().toISOString();

export interface WaypointStore extends WaypointState {
  _rehydrated: boolean;
  setPhase: (phase: Phase) => void;
  setRoleFilter: (f: RoleFilter) => void;
  toggleRhythm: (date: string, key: RhythmKey) => void;
  setRhythmNote: (date: string, field: "journal" | "focusNote", text: string) => void;
  setProblemStatus: (id: string, status: ProblemStatus) => void;
  markDefensePracticed: (id: string) => void;
  /** Undo last practice mark (or today if present). */
  unmarkDefensePracticed: (id: string) => void;
  setDefenseNotes: (id: string, notes: string) => void;
  setQBankStatus: (questionId: string, status: QBankStatus | null) => void;
  setQBankPos: (track: TrackKey, idx: number) => void;
  /** Replace a track's deck order (null clears back to natural data order). */
  setQBankOrder: (track: TrackKey, order: string[] | null) => void;
  /** Cache a freshly built Study Guide for a role scope (null clears it). */
  setStudyGuide: (role: RoleFilter, guide: StudyGuide | null) => void;
  /** Toggle a week-plan checkbox on the cached guide for a role. */
  toggleStudyWeekItem: (role: RoleFilter, itemId: string) => void;
  addRubricEntry: (entry: Partial<RubricEntry>) => void;
  /** Patch fields on an existing entry (gap status chips, close-on-retest, etc.). */
  patchRubricEntry: (id: string, patch: Partial<RubricEntry>) => void;
  /** Merge or replace rubric assessments (multi-JSON import). */
  importRubricEntries: (list: RubricEntry[], mode?: "merge" | "replace") => void;
  deleteRubricEntry: (id: string) => void;
  upsertApplication: (app: Application) => void;
  deleteApplication: (id: string) => void;
  /**
   * Career Library. Upsert-or-prepend + delete-by-id, matching the Application
   * pair above. Children (resume claims, JD requirements, campaign stages) are
   * edited by replacing their parent, so there is deliberately no per-child action
   * to keep out of sync with the parent's `updatedAt`.
   */
  upsertProject: (project: Project) => void;
  deleteProject: (id: string) => void;
  upsertResume: (resume: ResumeVersion) => void;
  deleteResume: (id: string) => void;
  upsertJobTarget: (target: JobTarget) => void;
  deleteJobTarget: (id: string) => void;
  upsertCampaign: (campaign: Campaign) => void;
  deleteCampaign: (id: string) => void;
  setWeeklyField: (
    weekStart: string,
    patch: Partial<{ whatMoved: string; focusNext: string; pipelineNotes: string; done: boolean }>,
  ) => void;
  logSolidInterview: (role: PrimaryRole, label?: string) => void;
  /** Remember a generated AI-Mock question so later sessions don't repeat it. */
  noteMockQuestion: (question: string) => void;
  /** Advance the AI-Mock Q Bank rotation so the next session seeds off a different item. */
  advanceMockSession: () => void;
  /** Pull new catalog rows; preserve status / practiced / notes. */
  mergeCatalog: () => void;
  /** One-shot twin import (practice progress + rubric only). Returns summary. */
  importTwin: (raw: unknown) => TwinImportSummary;
  importState: (slice: WaypointState) => void;
  exportState: () => WaypointState;
}

const seed = (): WaypointState => JSON.parse(JSON.stringify(SEED)) as WaypointState;

/** Persist + exportState data keys — listed once, kept exact to WaypointState. */
export const SNAPSHOT_KEYS = [
  "phase",
  "roleFilter",
  "rhythmDays",
  "weeklyReviews",
  "problems",
  "fileDefense",
  "rubricEntries",
  "qbankStatus",
  "qbankPos",
  "qbankOrder",
  "studyGuides",
  "applications",
  "projects",
  "resumes",
  "jobTargets",
  "campaigns",
  "solidInterviewLogs",
  "mockSeq",
  "mockAsked",
  "lastUpdated",
] as const satisfies readonly (keyof WaypointState)[];

type SnapshotKey = (typeof SNAPSHOT_KEYS)[number];
type MissingSnapshotKey = Exclude<keyof WaypointState, SnapshotKey>;
type ExtraSnapshotKey = Exclude<SnapshotKey, keyof WaypointState>;
const _snapshotKeysExact: [MissingSnapshotKey, ExtraSnapshotKey] extends [never, never]
  ? true
  : never = true;
void _snapshotKeysExact;

function pickSnapshot(s: Pick<WaypointState, SnapshotKey>): WaypointState {
  const out = {} as WaypointState;
  for (const k of SNAPSHOT_KEYS) {
    Object.assign(out, { [k]: s[k] });
  }
  return out;
}

const unionById = <T extends { id: string }>(server: T[], local: T[]): T[] => {
  const byId = new Map(server.map((x) => [x.id, x]));
  for (const x of local) byId.set(x.id, x); // local (live edit) wins on conflict
  return Array.from(byId.values());
};

const unionStr = (a: string[] = [], b: string[] = []): string[] =>
  Array.from(new Set([...a, ...b]));

/** Replace in place by id, or prepend when new. Newest-first, like applications. */
const upsertRow = <T extends { id: string }>(list: T[], row: T): T[] => {
  const idx = list.findIndex((x) => x.id === row.id);
  return idx >= 0 ? list.map((x, i) => (i === idx ? row : x)) : [row, ...list];
};

/**
 * Rehydration merge that preserves un-synced local edits.
 *
 * The server snapshot is fetched asynchronously; the store is interactive (and
 * saving) the whole time. zustand's default merge *replaces* each key with the
 * server value, so anything logged during that window — a grade, a Q-bank mark,
 * an application — is dropped from the store, and the follow-up authoritative
 * save then deletes it server-side. Every user-data collection seeds EMPTY, so
 * during hydration `current` holds only live edits: we union those over the
 * server value (local wins on id/key conflict). `problems`/`fileDefense` seed
 * from the catalog (mergeCatalog re-expands after), and scalars stay
 * server-authoritative, so both come straight from the persisted snapshot.
 */
const mergeHydration = (persisted: unknown, current: WaypointStore): WaypointStore => {
  const p = persisted as Partial<WaypointState> | undefined;
  if (!p) return current;
  return {
    ...current,
    ...p,
    rhythmDays: { ...p.rhythmDays, ...current.rhythmDays },
    weeklyReviews: { ...p.weeklyReviews, ...current.weeklyReviews },
    qbankStatus: { ...p.qbankStatus, ...current.qbankStatus },
    qbankOrder: { ...p.qbankOrder, ...current.qbankOrder },
    studyGuides: { ...p.studyGuides, ...current.studyGuides },
    rubricEntries: mergeEntries(p.rubricEntries ?? [], current.rubricEntries),
    applications: unionById(p.applications ?? [], current.applications),
    projects: unionById(p.projects ?? [], current.projects),
    resumes: unionById(p.resumes ?? [], current.resumes),
    jobTargets: unionById(p.jobTargets ?? [], current.jobTargets),
    campaigns: unionById(p.campaigns ?? [], current.campaigns),
    solidInterviewLogs: {
      SWE_FS_II: unionStr(p.solidInterviewLogs?.SWE_FS_II, current.solidInterviewLogs.SWE_FS_II),
      MLE_II: unionStr(p.solidInterviewLogs?.MLE_II, current.solidInterviewLogs.MLE_II),
    },
    // Union so a mock session recorded during the async hydration window survives.
    mockSeq: Math.max(p.mockSeq ?? 0, current.mockSeq),
    mockAsked: unionStr(p.mockAsked, current.mockAsked).slice(-40),
  };
};

export const useWaypointStore = create<WaypointStore>()(
  persist(
    (set, get) => ({
      ...seed(),
      _rehydrated: false,

      setPhase: (phase) => set({ phase, lastUpdated: now() }),
      setRoleFilter: (roleFilter) => set({ roleFilter, lastUpdated: now() }),

      toggleRhythm: (date, key) =>
        set((s) => {
          const day = s.rhythmDays[date] || emptyRhythm(date);
          return {
            rhythmDays: {
              ...s.rhythmDays,
              [date]: {
                ...day,
                slots: { ...day.slots, [key]: !day.slots[key] },
                lastUpdated: now(),
              },
            },
            lastUpdated: now(),
          };
        }),

      setRhythmNote: (date, field, text) =>
        set((s) => {
          const day = s.rhythmDays[date] || emptyRhythm(date);
          return {
            rhythmDays: {
              ...s.rhythmDays,
              [date]: { ...day, [field]: text, lastUpdated: now() },
            },
            lastUpdated: now(),
          };
        }),

      setProblemStatus: (id, status) =>
        set((s) => ({
          problems: s.problems.map((p) => (p.id === id ? { ...p, status } : p)),
          lastUpdated: now(),
        })),

      markDefensePracticed: (id) =>
        set((s) => ({
          fileDefense: s.fileDefense.map((f) =>
            f.id === id
              ? {
                  ...f,
                  practicedDates: [...new Set([...(f.practicedDates || []), todayIso()])],
                }
              : f,
          ),
          lastUpdated: now(),
        })),

      unmarkDefensePracticed: (id) =>
        set((s) => ({
          fileDefense: s.fileDefense.map((f) => {
            if (f.id !== id) return f;
            const dates = [...(f.practicedDates || [])];
            if (!dates.length) return f;
            const today = todayIso();
            const withoutToday = dates.filter((d) => d !== today);
            // Prefer clearing today; else drop the most recent mark
            const next =
              withoutToday.length < dates.length
                ? withoutToday
                : dates.slice(0, -1);
            return { ...f, practicedDates: next };
          }),
          lastUpdated: now(),
        })),

      setDefenseNotes: (id, notes) =>
        set((s) => ({
          fileDefense: s.fileDefense.map((f) => (f.id === id ? { ...f, notes } : f)),
          lastUpdated: now(),
        })),

      setQBankStatus: (questionId, status) =>
        set((s) => {
          const next = { ...s.qbankStatus };
          if (status == null) delete next[questionId];
          else next[questionId] = status;
          return { qbankStatus: next, lastUpdated: now() };
        }),

      setQBankPos: (track, idx) => set({ qbankPos: { track, idx }, lastUpdated: now() }),

      setQBankOrder: (track, order) =>
        set((s) => {
          const next = { ...s.qbankOrder };
          if (order == null) delete next[track];
          else next[track] = order;
          return { qbankOrder: next, lastUpdated: now() };
        }),

      setStudyGuide: (role, guide) =>
        set((s) => {
          const next = { ...s.studyGuides };
          if (guide == null) delete next[role];
          else next[role] = guide;
          return { studyGuides: next, lastUpdated: now() };
        }),

      toggleStudyWeekItem: (role, itemId) =>
        set((s) => {
          const guide = s.studyGuides[role];
          if (!guide) return s;
          return {
            studyGuides: {
              ...s.studyGuides,
              [role]: {
                ...guide,
                week: guide.week.map((w) =>
                  w.id === itemId ? { ...w, done: !w.done } : w,
                ),
              },
            },
            lastUpdated: now(),
          };
        }),

      addRubricEntry: (entry) =>
        set((s) => {
          let e = normaliseEntry({
            ...entry,
            id: entry.id || entry.assessmentId || crypto.randomUUID(),
            date: entry.date || todayIso(),
          });
          // Soft default: tags ⇒ open gap (decision pack capture rule 3).
          const hasGapSignal =
            (e.gapTypes?.length ?? 0) > 0 || (e.knowledgeGapTags?.length ?? 0) > 0;
          if (hasGapSignal && !e.gapClosureStatus?.status) {
            e = {
              ...e,
              gapClosureStatus: {
                status: "open",
                openedDate: e.date,
                retestRequired: true,
                ...e.gapClosureStatus,
              },
            };
          }
          return {
            rubricEntries: [e, ...s.rubricEntries],
            lastUpdated: now(),
          };
        }),

      patchRubricEntry: (id, patch) =>
        set((s) => ({
          rubricEntries: s.rubricEntries.map((e) => {
            if (e.id !== id && e.assessmentId !== id) return e;
            return normaliseEntry({ ...e, ...patch, id: e.id, assessmentId: e.assessmentId });
          }),
          lastUpdated: now(),
        })),

      importRubricEntries: (list, mode = "merge") =>
        set((s) => ({
          rubricEntries:
            mode === "replace"
              ? list.map((e) => normaliseEntry(e))
              : mergeEntries(s.rubricEntries, list),
          lastUpdated: now(),
        })),

      deleteRubricEntry: (id) =>
        set((s) => ({
          rubricEntries: s.rubricEntries.filter((e) => e.id !== id && e.assessmentId !== id),
          lastUpdated: now(),
        })),

      upsertApplication: (app) =>
        set((s) => {
          const idx = s.applications.findIndex((a) => a.id === app.id);
          const applications =
            idx >= 0
              ? s.applications.map((a, i) => (i === idx ? app : a))
              : [app, ...s.applications];
          return { applications, lastUpdated: now() };
        }),

      upsertProject: (project) =>
        set((s) => ({ projects: upsertRow(s.projects, project), lastUpdated: now() })),
      deleteProject: (id) =>
        set((s) => ({ projects: s.projects.filter((p) => p.id !== id), lastUpdated: now() })),

      upsertResume: (resume) =>
        set((s) => ({ resumes: upsertRow(s.resumes, resume), lastUpdated: now() })),
      deleteResume: (id) =>
        set((s) => ({ resumes: s.resumes.filter((r) => r.id !== id), lastUpdated: now() })),

      upsertJobTarget: (target) =>
        set((s) => ({ jobTargets: upsertRow(s.jobTargets, target), lastUpdated: now() })),
      deleteJobTarget: (id) =>
        set((s) => ({
          jobTargets: s.jobTargets.filter((t) => t.id !== id),
          // A campaign without its target is unreachable in the UI and would keep
          // claiming stage readiness forever, so it goes with the target.
          campaigns: s.campaigns.filter((c) => c.jobTargetId !== id),
          lastUpdated: now(),
        })),

      upsertCampaign: (campaign) =>
        set((s) => ({ campaigns: upsertRow(s.campaigns, campaign), lastUpdated: now() })),
      deleteCampaign: (id) =>
        set((s) => ({ campaigns: s.campaigns.filter((c) => c.id !== id), lastUpdated: now() })),

      deleteApplication: (id) =>
        set((s) => ({
          applications: s.applications.filter((a) => a.id !== id),
          lastUpdated: now(),
        })),

      setWeeklyField: (weekStart, patch) =>
        set((s) => {
          const cur = s.weeklyReviews[weekStart] || {
            weekStart,
            done: false,
          };
          return {
            weeklyReviews: {
              ...s.weeklyReviews,
              [weekStart]: { ...cur, ...patch, lastUpdated: now() },
            },
            lastUpdated: now(),
          };
        }),

      logSolidInterview: (role, label) =>
        set((s) => ({
          solidInterviewLogs: {
            ...s.solidInterviewLogs,
            [role]: [...(s.solidInterviewLogs[role] || []), label || now()],
          },
          lastUpdated: now(),
        })),

      noteMockQuestion: (question) =>
        set((s) => {
          const q = question.trim();
          if (!q || s.mockAsked.includes(q)) return s;
          // Keep the most recent 40 so the avoid-list stays bounded but covers recent sessions.
          return { mockAsked: [...s.mockAsked, q].slice(-40), lastUpdated: now() };
        }),

      advanceMockSession: () => set((s) => ({ mockSeq: s.mockSeq + 1, lastUpdated: now() })),

      mergeCatalog: () =>
        set((s) => {
          const { problems, fileDefense } = mergeCatalogLists(s.problems, s.fileDefense);
          const fp = (ps: typeof problems, fs: typeof fileDefense) =>
            ps.map((p) => `${p.id}|${p.title}|${p.tier}|${p.pattern}|${p.core}|${p.roleTrack}|${p.leetcodeSlug ?? ""}`).join(";") +
            "#" +
            fs.map((f) => `${f.id}|${f.title}|${f.why}|${f.core}|${f.roleTrack}|${f.project ?? ""}`).join(";");
          if (fp(problems, fileDefense) === fp(s.problems, s.fileDefense)) return s;
          return { problems, fileDefense, lastUpdated: now() };
        }),

      importTwin: (raw) => {
        const cur = get().exportState();
        const { state, summary } = applyTwinImport(cur, raw);
        const { problems, fileDefense } = mergeCatalogLists(state.problems, state.fileDefense);
        set({
          ...state,
          problems,
          fileDefense,
          lastUpdated: now(),
        });
        return summary;
      },

      importState: (slice) => {
        const { problems, fileDefense } = mergeCatalogLists(
          slice.problems ?? [],
          slice.fileDefense ?? [],
        );
        set({ ...slice, problems, fileDefense, lastUpdated: now() });
      },
      exportState: () => pickSnapshot(get()),
    }),
    {
      name: "waypoint-v1",
      // Must match serverStorage.getItem envelope (`version: 1`).
      version: 1,
      storage: createJSONStorage(() => serverStorage),
      merge: (persisted, current) => mergeHydration(persisted, current as WaypointStore),
      partialize: (s) => pickSnapshot(s),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state._rehydrated = true;
        // Expand thin DB/seed lists to full catalog; set() so the merge persists.
        queueMicrotask(() => {
          useWaypointStore.getState().mergeCatalog();
        });
      },
    },
  ),
);

export function newApplication(partial?: Partial<Application>): Application {
  const t = now();
  return {
    id: crypto.randomUUID(),
    company: "",
    roleTitle: "",
    targetRole: "SWE_FS_II" as TargetRole,
    status: "wishlist" as AppStatus,
    statusChangedAt: t,
    materials: [],
    createdAt: t,
    updatedAt: t,
    ...partial,
  };
}

/* ─────────────────────── Career Library factories ───────────────────────
 * Blank rows, valid the moment they are created. Every required field gets a
 * real value so a half-filled draft can still round-trip through /api/state
 * without tripping a NOT NULL column.
 */

/** Stable, column-safe slug. Mirrors the catalog's `slug` (data/catalog.ts:12-18). */
export function projectSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export function newProject(partial?: Partial<Project>): Project {
  const t = now();
  const name = partial?.name ?? "";
  return {
    id: crypto.randomUUID(),
    slug: partial?.slug ?? (projectSlug(name) || "untitled"),
    name,
    summary: "",
    stage: "idea",
    ownership: "sole-author",
    architecture: "",
    technologies: [],
    decisions: [],
    testing: { strategy: "", automated: false },
    failures: [],
    limitations: [],
    competencies: [],
    evidenceRefs: [],
    defense: { ...EMPTY_PROJECT_DEFENSE },
    createdAt: t,
    updatedAt: t,
    ...partial,
  };
}

export function newResumeVersion(partial?: Partial<ResumeVersion>): ResumeVersion {
  const t = now();
  return {
    id: crypto.randomUUID(),
    label: "",
    body: "",
    claims: [],
    targetRole: null,
    frozenAt: null,
    createdAt: t,
    updatedAt: t,
    ...partial,
  };
}

export function newResumeClaim(partial?: Partial<ResumeClaim>): ResumeClaim {
  return {
    id: crypto.randomUUID(),
    text: "",
    section: "experience",
    projectIds: [],
    competencies: [],
    defense: { ...EMPTY_CLAIM_DEFENSE },
    ...partial,
  };
}

export function newJobTarget(partial?: Partial<JobTarget>): JobTarget {
  const t = now();
  return {
    id: crypto.randomUUID(),
    company: "",
    roleTitle: "",
    careerRole: null,
    applicationId: null,
    submittedResumeId: null,
    snapshots: [],
    createdAt: t,
    updatedAt: t,
    ...partial,
  };
}

export function newJdSnapshot(partial?: Partial<JdSnapshot>): JdSnapshot {
  return {
    id: crypto.randomUUID(),
    capturedAt: now(),
    body: "",
    requirements: [],
    ...partial,
  };
}

export function newJobRequirement(partial?: Partial<JobRequirement>): JobRequirement {
  return {
    id: crypto.randomUUID(),
    text: "",
    kind: "required",
    competencies: [],
    projectIds: [],
    claimIds: [],
    ...partial,
  };
}

export function newCampaign(partial?: Partial<Campaign>): Campaign {
  const t = now();
  return {
    id: crypto.randomUUID(),
    jobTargetId: "",
    careerRole: "swe",
    currentStageId: null,
    stages: [],
    domainRequirements: [],
    createdAt: t,
    updatedAt: t,
    ...partial,
  };
}

export function newCampaignStage(partial?: Partial<CampaignStage>): CampaignStage {
  return {
    id: crypto.randomUUID(),
    kind: "technical-screen",
    scheduledFor: null,
    completedAt: null,
    // Default 1: a stage you bothered to add is one you expect to sit.
    likelihood: 1,
    expectedCompetencies: [],
    expectedQuestionAreas: [],
    outcome: "pending",
    ...partial,
  };
}

export { weekStartIso, todayIso };

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
  addRubricEntry: (entry: Partial<RubricEntry>) => void;
  /** Patch fields on an existing entry (gap status chips, close-on-retest, etc.). */
  patchRubricEntry: (id: string, patch: Partial<RubricEntry>) => void;
  /** Merge or replace rubric assessments (multi-JSON import). */
  importRubricEntries: (list: RubricEntry[], mode?: "merge" | "replace") => void;
  deleteRubricEntry: (id: string) => void;
  upsertApplication: (app: Application) => void;
  deleteApplication: (id: string) => void;
  setWeeklyField: (
    weekStart: string,
    patch: Partial<{ whatMoved: string; focusNext: string; pipelineNotes: string; done: boolean }>,
  ) => void;
  logSolidInterview: (role: PrimaryRole, label?: string) => void;
  /** Pull new catalog rows; preserve status / practiced / notes. */
  mergeCatalog: () => void;
  /** One-shot twin import (practice progress + rubric only). Returns summary. */
  importTwin: (raw: unknown) => TwinImportSummary;
  importState: (slice: WaypointState) => void;
  exportState: () => WaypointState;
}

const seed = (): WaypointState => JSON.parse(JSON.stringify(SEED)) as WaypointState;

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

      mergeCatalog: () =>
        set((s) => {
          const { problems, fileDefense } = mergeCatalogLists(s.problems, s.fileDefense);
          const fp = (ps: typeof problems, fs: typeof fileDefense) =>
            ps.map((p) => `${p.id}|${p.title}|${p.tier}|${p.pattern}|${p.core}|${p.roleTrack}|${p.leetcodeSlug ?? ""}`).join(";") +
            "#" +
            fs.map((f) => `${f.id}|${f.title}|${f.why}|${f.core}|${f.roleTrack}`).join(";");
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
      exportState: () => {
        const s = get();
        const {
          _rehydrated: _,
          setPhase: _a,
          setRoleFilter: _b,
          toggleRhythm: _c,
          setRhythmNote: _d,
          setProblemStatus: _e,
          markDefensePracticed: _f,
          unmarkDefensePracticed: _unmarkDef,
          setDefenseNotes: _g,
          setQBankStatus: _h,
          setQBankPos: _i,
          addRubricEntry: _j,
          patchRubricEntry: _patchR,
          importRubricEntries: _impR,
          deleteRubricEntry: _delR,
          upsertApplication: _k,
          deleteApplication: _l,
          setWeeklyField: _m,
          logSolidInterview: _n,
          mergeCatalog: _q,
          importTwin: _twin,
          importState: _o,
          exportState: _p,
          ...rest
        } = s;
        return rest as WaypointState;
      },
    }),
    {
      name: "waypoint-v1",
      // Must match serverStorage.getItem envelope (`version: 1`).
      version: 1,
      storage: createJSONStorage(() => serverStorage),
      partialize: (s) => ({
        phase: s.phase,
        roleFilter: s.roleFilter,
        rhythmDays: s.rhythmDays,
        weeklyReviews: s.weeklyReviews,
        problems: s.problems,
        fileDefense: s.fileDefense,
        rubricEntries: s.rubricEntries,
        qbankStatus: s.qbankStatus,
        qbankPos: s.qbankPos,
        applications: s.applications,
        solidInterviewLogs: s.solidInterviewLogs,
        lastUpdated: s.lastUpdated,
      }),
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

export { weekStartIso, todayIso };

/**
 * Leave Sprint Twin — Zustand Store
 *
 * Canonical source of truth for all mutable state.
 * Uses persist middleware + careful seed merging so:
 *   - data/app-state.json (or seed.ts) provides baseline content
 *   - localStorage always wins for user progress
 *   - New fields from seed appear automatically
 *
 * Storage key: 'leave-sprint-twin-v1'
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AppState, DayState, RhythmKey, StageId, ProblemStatus, Energy, SprintStore } from './types';
import { SEED as seed } from '../data/seed';

// Initial seed (deep clone for safety)
const SEED_STATE: AppState = JSON.parse(JSON.stringify(seed)) as AppState;

// Default empty rhythm for a day
const defaultRhythm = (): DayState => ({
  rhythm: { coding: false, file: false, qa: false, build: false },
  focusNote: '',
  journal: '',
  energy: undefined,
});

export const useSprintStore = create<SprintStore>()(
  persist(
    (set, get) => ({
      // Initial hydration from seed
      days: SEED_STATE.days || {},
      stages: SEED_STATE.stages || {},
      problems: SEED_STATE.problems || [],
      fileDefense: SEED_STATE.fileDefense || [],
      lastUpdated: SEED_STATE.lastUpdated,
      _rehydrated: false,

      // --- Day Rhythm ---
      // Updates one of the four daily disciplines. Called by TodayRhythm and Calendar.
      updateDayRhythm: (day: number, key: RhythmKey, completed: boolean) => {
        set((state) => {
          const current = state.days[day] || defaultRhythm();
          const updatedRhythm = { ...current.rhythm, [key]: completed };
          return {
            days: {
              ...state.days,
              [day]: {
                ...current,
                rhythm: updatedRhythm,
                lastUpdated: new Date().toISOString(),
              },
            },
            lastUpdated: new Date().toISOString(),
          };
        });
      },

      updateDayJournal: (day: number, text: string) => {
        set((state) => {
          const current = state.days[day] || defaultRhythm();
          return {
            days: {
              ...state.days,
              [day]: { ...current, journal: text },
            },
            lastUpdated: new Date().toISOString(),
          };
        });
      },

      updateFocusNote: (day: number, note: string) => {
        set((state) => {
          const current = state.days[day] || defaultRhythm();
          return {
            days: {
              ...state.days,
              [day]: { ...current, focusNote: note },
            },
          };
        });
      },

      setEnergy: (day: number, energy: Energy) => {
        set((state) => {
          const current = state.days[day] || defaultRhythm();
          return {
            days: {
              ...state.days,
              [day]: { ...current, energy },
            },
          };
        });
      },

      // --- Stages ---
      markStageDone: (id: StageId) => {
        set((state) => ({
          stages: {
            ...state.stages,
            [id]: {
              done: true,
              doneAt: new Date().toISOString(),
            },
          },
          lastUpdated: new Date().toISOString(),
        }));
      },

      unmarkStage: (id: StageId) => {
        set((state) => ({
          stages: {
            ...state.stages,
            [id]: { done: false },
          },
        }));
      },

      // --- Problems ---
      updateProblemStatus: (id: string, status: ProblemStatus) => {
        set((state) => ({
          problems: state.problems.map((p) =>
            p.id === id ? { ...p, status } : p
          ),
          lastUpdated: new Date().toISOString(),
        }));
      },

      // --- File Defense ---
      markFilePracticed: (id: string, date?: string) => {
        const today = date || new Date().toISOString().slice(0, 10);
        set((state) => ({
          fileDefense: state.fileDefense.map((f) =>
            f.id === id
              ? {
                  ...f,
                  practicedDates: Array.from(new Set([...f.practicedDates, today])),
                }
              : f
          ),
          lastUpdated: new Date().toISOString(),
        }));
      },

      updateFileNotes: (id: string, notes: string) => {
        set((state) => ({
          fileDefense: state.fileDefense.map((f) =>
            f.id === id ? { ...f, notes } : f
          ),
        }));
      },

      // --- Reset (dev / testing) ---
      resetAll: () => {
        set({
          days: JSON.parse(JSON.stringify(SEED_STATE.days)),
          stages: JSON.parse(JSON.stringify(SEED_STATE.stages)),
          problems: JSON.parse(JSON.stringify(SEED_STATE.problems)),
          fileDefense: JSON.parse(JSON.stringify(SEED_STATE.fileDefense)),
          lastUpdated: new Date().toISOString(),
        });
      },

      _rehydrated: false,
    }),
    {
      name: 'leave-sprint-twin-v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        days: state.days,
        stages: state.stages,
        problems: state.problems,
        fileDefense: state.fileDefense,
        lastUpdated: state.lastUpdated,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;

        // Merge logic: seed provides baseline structure, persisted overrides it
        // Ensure all seed stages/problems exist even if new keys added later
        const seedStages = SEED_STATE.stages || {};
        const mergedStages: Record<StageId, any> = { ...seedStages };

        // Overlay persisted state (user progress wins)
        Object.keys(state.stages || {}).forEach((k) => {
          mergedStages[k] = state.stages[k];
        });

        // Same for problems (match by id)
        const seedProblems = SEED_STATE.problems || [];
        const persistedProblems = state.problems || [];
        const problemMap = new Map(seedProblems.map((p) => [p.id, { ...p }]));
        persistedProblems.forEach((pp) => {
          if (problemMap.has(pp.id)) {
            const base = problemMap.get(pp.id)!;
            problemMap.set(pp.id, { ...base, status: pp.status });
          } else {
            problemMap.set(pp.id, pp);
          }
        });

        const mergedFileDefense = (SEED_STATE.fileDefense || []).map((f) => {
          const persisted = (state.fileDefense || []).find((pf) => pf.id === f.id);
          return persisted ? { ...f, ...persisted } : f;
        });

        state.days = { ...(SEED_STATE.days || {}), ...(state.days || {}) };
        state.stages = mergedStages;
        state.problems = Array.from(problemMap.values());
        state.fileDefense = mergedFileDefense;
        state._rehydrated = true;
      },
      version: 1,
    }
  )
);

// --- Selectors / Helpers ---

/** Returns 0-100 completion percentage for a day's rhythm. */
export function getDayCompletion(dayState?: DayState): number {
  if (!dayState) return 0;
  const r = dayState.rhythm;
  const done = [r.coding, r.file, r.qa, r.build].filter(Boolean).length;
  return Math.round((done / 4) * 100);
}

/** How many days currently have all four rhythm items completed. */
export function getDaysFullyDone(days: Record<number, DayState>): number {
  return Object.values(days).filter((d) => getDayCompletion(d) === 100).length;
}

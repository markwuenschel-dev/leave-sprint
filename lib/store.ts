import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AppState, DayState, RhythmKey, StageId, StageState, ProblemStatus, Energy, SprintStore } from './types';
import type { RubricEntry } from './rubric/types';
import type { QBankStatus, TrackKey } from './qbank/types';
import { normaliseEntry } from './rubric/normalize';
import { mergeEntries } from './rubric/io';
import { SEED as seed } from '../data/seed';

const SEED_STATE: AppState = JSON.parse(JSON.stringify(seed)) as AppState;

const defaultRhythm = (): DayState => ({
  rhythm: { coding: false, file: false, qa: false, build: false },
  focusNote: '',
  journal: '',
  energy: undefined,
});

const now = () => new Date().toISOString();

export const useSprintStore = create<SprintStore>()(
  persist(
    (set, get) => ({
      // Initial state
      days: SEED_STATE.days || {},
      stages: SEED_STATE.stages || {},
      problems: SEED_STATE.problems || [],
      fileDefense: SEED_STATE.fileDefense || [],
      lastUpdated: SEED_STATE.lastUpdated,
      selectedDay: 1,
      _rehydrated: false,

      // New slices
      rubricEntries: [],
      qbankStatus: {},
      qbankPos: { track: 'swe', idx: 0 },

      // --- Day Rhythm actions ---
      updateDayRhythm: (day: number, key: RhythmKey, completed: boolean) => {
        set((state) => {
          const current = state.days[day] || defaultRhythm();
          return {
            days: {
              ...state.days,
              [day]: { ...current, rhythm: { ...current.rhythm, [key]: completed }, lastUpdated: now() },
            },
            lastUpdated: now(),
          };
        });
      },

      updateDayJournal: (day: number, text: string) => {
        set((state) => {
          const current = state.days[day] || defaultRhythm();
          return {
            days: { ...state.days, [day]: { ...current, journal: text } },
            lastUpdated: now(),
          };
        });
      },

      updateFocusNote: (day: number, note: string) => {
        set((state) => {
          const current = state.days[day] || defaultRhythm();
          return { days: { ...state.days, [day]: { ...current, focusNote: note } } };
        });
      },

      setEnergy: (day: number, energy: Energy) => {
        set((state) => {
          const current = state.days[day] || defaultRhythm();
          return { days: { ...state.days, [day]: { ...current, energy } } };
        });
      },

      setSelectedDay: (day: number) => {
        set({ selectedDay: Math.min(Math.max(day, 1), 29) });
      },

      // --- Stages ---
      markStageDone: (id: StageId) => {
        set((state) => ({
          stages: { ...state.stages, [id]: { done: true, doneAt: now() } },
          lastUpdated: now(),
        }));
      },

      unmarkStage: (id: StageId) => {
        set((state) => ({ stages: { ...state.stages, [id]: { done: false } } }));
      },

      // --- Problems ---
      updateProblemStatus: (id: string, status: ProblemStatus) => {
        set((state) => ({
          problems: state.problems.map((p) => (p.id === id ? { ...p, status } : p)),
          lastUpdated: now(),
        }));
      },

      // --- File Defense ---
      markFilePracticed: (id: string, date?: string) => {
        const today = date || new Date().toISOString().slice(0, 10);
        set((state) => ({
          fileDefense: state.fileDefense.map((f) =>
            f.id === id ? { ...f, practicedDates: Array.from(new Set([...f.practicedDates, today])) } : f,
          ),
          lastUpdated: now(),
        }));
      },

      updateFileNotes: (id: string, notes: string) => {
        set((state) => ({
          fileDefense: state.fileDefense.map((f) => (f.id === id ? { ...f, notes } : f)),
        }));
      },

      // --- Reset ---
      resetAll: () => {
        set({
          days: JSON.parse(JSON.stringify(SEED_STATE.days)),
          stages: JSON.parse(JSON.stringify(SEED_STATE.stages)),
          problems: JSON.parse(JSON.stringify(SEED_STATE.problems)),
          fileDefense: JSON.parse(JSON.stringify(SEED_STATE.fileDefense)),
          rubricEntries: [],
          qbankStatus: {},
          qbankPos: { track: 'swe', idx: 0 },
          lastUpdated: now(),
        });
      },

      // --- Rubric ---
      logRubricEntry: (entry) => {
        const normalised = normaliseEntry(entry);
        set((state) => ({
          rubricEntries: [normalised, ...state.rubricEntries],
          lastUpdated: now(),
        }));
      },

      deleteRubricEntry: (id: string) => {
        set((state) => ({ rubricEntries: state.rubricEntries.filter((e) => e.id !== id) }));
      },

      importRubricEntries: (list: RubricEntry[], mode: 'merge' | 'replace') => {
        set((state) => ({
          rubricEntries: mode === 'replace' ? list : mergeEntries(state.rubricEntries, list),
          lastUpdated: now(),
        }));
      },

      // --- Q Bank ---
      setQbankStatus: (id: string, status: QBankStatus | undefined) => {
        set((state) => {
          const next = { ...state.qbankStatus };
          if (status === undefined) delete next[id];
          else next[id] = status;
          return { qbankStatus: next };
        });
      },

      setQbankPos: (track: TrackKey, idx: number) => {
        set({ qbankPos: { track, idx } });
      },

      // --- Import / migration ---
      importState: (payload) => {
        set((state) => ({
          days: { ...state.days, ...(payload.days || {}) },
          stages: { ...state.stages, ...(payload.stages || {}) },
          problems: payload.problems ?? state.problems,
          fileDefense: payload.fileDefense ?? state.fileDefense,
          rubricEntries: payload.rubricEntries
            ? mergeEntries(state.rubricEntries, payload.rubricEntries.map((e) => normaliseEntry(e)))
            : state.rubricEntries,
          qbankStatus: payload.qbankStatus ? { ...state.qbankStatus, ...payload.qbankStatus } : state.qbankStatus,
          lastUpdated: now(),
        }));
      },

      importLegacyLocalStorage: () => {
        const result = { rubric: 0, qbank: 0, tasks: 0 };
        if (typeof localStorage === 'undefined') return result;

        // rubric-log-v1 → rubricEntries
        try {
          const raw = localStorage.getItem('rubric-log-v1');
          if (raw) {
            const arr = JSON.parse(raw);
            const list = (Array.isArray(arr) ? arr : [arr]).map((e) => normaliseEntry(e));
            if (list.length) {
              set((state) => ({ rubricEntries: mergeEntries(state.rubricEntries, list) }));
              result.rubric = list.length;
            }
          }
        } catch {
          /* ignore malformed legacy data */
        }

        // cqw-qbank-v1 → qbankStatus
        try {
          const raw = localStorage.getItem('cqw-qbank-v1');
          if (raw) {
            const map = JSON.parse(raw) as Record<string, QBankStatus>;
            const valid: Record<string, QBankStatus> = {};
            for (const [k, v] of Object.entries(map)) {
              if (v === 'mastered' || v === 'review') valid[k] = v;
            }
            set((state) => ({ qbankStatus: { ...state.qbankStatus, ...valid } }));
            result.qbank = Object.keys(valid).length;
          }
        } catch {
          /* ignore */
        }

        // cqw-sprint-v1 → day rhythm booleans + journals
        // Legacy keys: d{day}-{disc}-{i} (task done) and journal-d{day} (note).
        try {
          const raw = localStorage.getItem('cqw-sprint-v1');
          if (raw) {
            const flat = JSON.parse(raw) as Record<string, boolean | string>;
            const discMap: Record<string, RhythmKey> = { code: 'coding', coding: 'coding', file: 'file', qa: 'qa', build: 'build' };
            const rhythmUpdates: Record<number, Partial<Record<RhythmKey, boolean>>> = {};
            const journalUpdates: Record<number, string> = {};
            let taskCount = 0;
            for (const [k, v] of Object.entries(flat)) {
              const taskMatch = k.match(/^d(\d+)-(\w+)-\d+$/);
              const journalMatch = k.match(/^journal-d(\d+)$/);
              if (taskMatch && v === true) {
                const day = Number(taskMatch[1]);
                const disc = discMap[taskMatch[2]];
                if (disc) {
                  rhythmUpdates[day] = { ...(rhythmUpdates[day] || {}), [disc]: true };
                  taskCount++;
                }
              } else if (journalMatch && typeof v === 'string') {
                journalUpdates[Number(journalMatch[1])] = v;
              }
            }
            set((state) => {
              const days = { ...state.days };
              const allDays = new Set([...Object.keys(rhythmUpdates), ...Object.keys(journalUpdates)].map(Number));
              allDays.forEach((d) => {
                const base = days[d] || defaultRhythm();
                days[d] = {
                  ...base,
                  rhythm: { ...base.rhythm, ...(rhythmUpdates[d] || {}) },
                  journal: journalUpdates[d] ?? base.journal,
                };
              });
              return { days };
            });
            result.tasks = taskCount;
          }
        } catch {
          /* ignore */
        }

        set({ lastUpdated: now() });
        return result;
      },
    }),
    {
      name: 'leave-sprint-twin-v1',
      storage: createJSONStorage(() => localStorage),
      version: 2,
      partialize: (state) => ({
        days: state.days,
        stages: state.stages,
        problems: state.problems,
        fileDefense: state.fileDefense,
        rubricEntries: state.rubricEntries,
        qbankStatus: state.qbankStatus,
        qbankPos: state.qbankPos,
        lastUpdated: state.lastUpdated,
        selectedDay: state.selectedDay,
      }),
      migrate: (persisted, fromVersion) => {
        const p = (persisted || {}) as Record<string, unknown>;
        if (fromVersion < 2) {
          // v1 stored a simplified rubricEntries shape; normalise it.
          const old = Array.isArray(p.rubricEntries) ? p.rubricEntries : [];
          p.rubricEntries = old.map((e) => normaliseEntry(e as Record<string, unknown>));
          p.qbankStatus = p.qbankStatus || {};
          p.qbankPos = p.qbankPos || { track: 'swe', idx: 0 };
        }
        return p;
      },
      onRehydrateStorage: () => (state) => {
        if (!state) return;

        const seedStages = SEED_STATE.stages || {};
        const mergedStages: Record<StageId, StageState> = { ...seedStages };
        Object.keys(state.stages || {}).forEach((k) => {
          mergedStages[k] = state.stages[k];
        });

        const seedProblems = SEED_STATE.problems || [];
        const problemMap = new Map(seedProblems.map((p) => [p.id, { ...p }]));
        (state.problems || []).forEach((pp) => {
          if (problemMap.has(pp.id)) {
            problemMap.set(pp.id, { ...problemMap.get(pp.id)!, status: pp.status });
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
        // Preserve migrated/persisted new slices; only default when truly absent.
        state.rubricEntries = state.rubricEntries || [];
        state.qbankStatus = state.qbankStatus || {};
        state.qbankPos = state.qbankPos || { track: 'swe', idx: 0 };
        state._rehydrated = true;
      },
    },
  ),
);

// Selectors
export function getDayCompletion(dayState?: DayState): number {
  if (!dayState) return 0;
  const r = dayState.rhythm;
  const done = [r.coding, r.file, r.qa, r.build].filter(Boolean).length;
  return Math.round((done / 4) * 100);
}

export function getDaysFullyDone(days: Record<number, DayState>): number {
  return Object.values(days).filter((d) => getDayCompletion(d) === 100).length;
}

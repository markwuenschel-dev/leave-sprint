/**
 * Core domain types for Leave Sprint Twin.
 *
 * This file defines the exact shape expected by the Zustand store and
 * all components. Keep in sync with data/app-state.json.
 */

export type DayNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
  11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 |
  21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29;

export type RhythmKey = 'coding' | 'file' | 'qa' | 'build';

export interface DayRhythm {
  coding: boolean;
  file: boolean;
  qa: boolean;
  build: boolean;
}

export interface DayState {
  rhythm: DayRhythm;
  journal?: string;
  focusNote?: string;
  energy?: 'low' | 'medium' | 'high';
  lastUpdated?: string;
}

export type StageId = string; // "0", "15a", "16a" etc.

export interface Stage {
  id: StageId;
  name: string;
  phase?: string;
  tags?: ('MLE' | 'SWE')[];
  initialStatus?: string;
}

export interface StageState {
  done: boolean;
  doneAt?: string; // ISO timestamp
}

export type ProblemStatus = 'not-started' | 'practicing' | 'solid';
export type Tier = 'A' | 'B' | 'C' | 'D';

export interface Problem {
  id: string;
  title: string;
  tier: Tier;
  pattern: string;
  status: ProblemStatus;
  leetcodeSlug?: string;
  difficulty?: string;
}

export interface FileDefenseItem {
  id: string;
  title: string;
  why: string;
  terminology: string;
  interviewLine: string;
  practicedDates: string[]; // ISO date strings
  notes?: string;
}

export type Energy = 'low' | 'medium' | 'high' | undefined;

export interface AppState {
  // Mutable per-day rhythm + notes
  days: Record<number, DayState>;

  // 20-stage progression mutable state
  stages: Record<StageId, StageState>;

  // Problem bank mutable status
  problems: Problem[];

  // File defense mutable data
  fileDefense: FileDefenseItem[];

  // Global / derived snapshot helpers
  lastUpdated?: string;
}

export interface SprintStore extends AppState {
  // Day rhythm
  updateDayRhythm: (day: number, key: RhythmKey, completed: boolean) => void;
  updateDayJournal: (day: number, text: string) => void;
  updateFocusNote: (day: number, note: string) => void;
  setEnergy: (day: number, energy: Energy) => void;

  // Stages
  markStageDone: (id: StageId) => void;
  unmarkStage: (id: StageId) => void;

  // Problems
  updateProblemStatus: (id: string, status: ProblemStatus) => void;

  // File Defense
  markFilePracticed: (id: string, date?: string) => void;
  updateFileNotes: (id: string, notes: string) => void;

  // Reset helpers
  resetAll: () => void;

  // Hydration helper
  _rehydrated: boolean;
}

// Static day plan (content definition - easy to edit alongside json if needed)
export interface DayPlan {
  day: number;
  date: string; // human friendly e.g. "Jun 17"
  focus: string;
  coding: { title: string; tier: Tier; time: string };
  file: { title: string; time: string };
  qa: { prompt: string; time: string };
  build: { title: string; time: string };
}

export const SPRINT_START = new Date(2026, 5, 17); // June 17 2026 (month is 0-indexed)

export function getDateForDay(day: number): Date {
  const d = new Date(SPRINT_START);
  d.setDate(d.getDate() + (day - 1));
  return d;
}

export function formatDayDate(day: number): string {
  return getDateForDay(day).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

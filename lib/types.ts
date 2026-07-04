/**
 * Core domain types for Leave Sprint Twin.
 *
 * The Technical Competency rubric types now live in `lib/rubric/*` (full fidelity).
 * They are re-exported here for backwards-compatible imports.
 */

import type {
  RubricEntry,
  RubricEntryInput,
  TaskType,
  Role,
  LevelId,
  EvidenceClass,
  UniversalDimId,
  GateId,
  Difficulty,
  AssistanceLevel,
  PromotionRequirement,
} from './rubric/types';
import type { TrackKey, QBankStatus } from './qbank/types';

export type {
  RubricEntry,
  RubricEntryInput,
  TaskType,
  Role,
  LevelId,
  EvidenceClass,
  UniversalDimId,
  GateId,
  Difficulty,
  AssistanceLevel,
  PromotionRequirement,
  TrackKey,
  QBankStatus,
};
export { RD, RUBRIC_VERSION } from './rubric/referenceData';

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

export type StageId = string;

export interface Stage {
  id: StageId;
  name: string;
  phase?: string;
  tags?: ('MLE' | 'SWE')[];
  initialStatus?: string;
}

export interface StageState {
  done: boolean;
  doneAt?: string;
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
  practicedDates: string[];
  notes?: string;
}

export type Energy = 'low' | 'medium' | 'high' | undefined;

export interface AppState {
  days: Record<number, DayState>;
  stages: Record<StageId, StageState>;
  problems: Problem[];
  fileDefense: FileDefenseItem[];
  lastUpdated?: string;
}

export interface SprintStore extends AppState {
  // Day rhythm
  updateDayRhythm: (day: number, key: RhythmKey, completed: boolean) => void;
  updateDayJournal: (day: number, text: string) => void;
  updateFocusNote: (day: number, note: string) => void;
  setEnergy: (day: number, energy: Energy) => void;

  selectedDay: number;
  setSelectedDay: (day: number) => void;

  // Stages
  markStageDone: (id: StageId) => void;
  unmarkStage: (id: StageId) => void;

  // Problems
  updateProblemStatus: (id: string, status: ProblemStatus) => void;

  // File Defense
  markFilePracticed: (id: string, date?: string) => void;
  updateFileNotes: (id: string, notes: string) => void;

  // Reset
  resetAll: () => void;

  // Hydration
  _rehydrated: boolean;

  // === Rubric / competency ===
  rubricEntries: RubricEntry[];
  logRubricEntry: (entry: RubricEntryInput) => void;
  deleteRubricEntry: (id: string) => void;
  importRubricEntries: (list: RubricEntry[], mode: 'merge' | 'replace') => void;

  // === Q Bank ===
  qbankStatus: Record<string, QBankStatus>;
  qbankPos: { track: TrackKey; idx: number };
  setQbankStatus: (id: string, status: QBankStatus | undefined) => void;
  setQbankPos: (track: TrackKey, idx: number) => void;

  // === Import / migration ===
  importState: (payload: Partial<AppState> & {
    rubricEntries?: RubricEntry[];
    qbankStatus?: Record<string, QBankStatus>;
  }) => void;
  importLegacyLocalStorage: () => { rubric: number; qbank: number; tasks: number };
}

// Static day plan
export interface DayPlan {
  day: number;
  date: string;
  focus: string;
  coding: { title: string; tier: Tier; time: string };
  file: { title: string; time: string };
  qa: { title: string; time: string };
  build: { title: string; time: string };
}

export const SPRINT_START = new Date(2026, 5, 17);
export const SPRINT_DAYS = 29;

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

export type Domain = string;

/**
 * Promotion evidence standard — canonical source is RD.promotionEvidence.
 * Re-exported here for import compatibility (replaces the old divergent literal).
 */
export { PROMOTION_EVIDENCE } from './rubric/referenceData';
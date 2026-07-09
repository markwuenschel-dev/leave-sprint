/** Q Bank domain types (data lives in data/qbank.ts). */

import type { TaskType, Role } from '@waypoint/rubric';

export type TrackKey = 'swe' | 'mle' | 'ds' | 'de' | 'react' | 'sql' | 'sdlc' | 'diag';
export type QBankStatus = 'mastered' | 'review';

/** One Level-I question with its Level II/III stretch follow-ons. */
export interface QBankQuestion {
  id: string;
  q: string;
  /** Optional multi-line source under diagnosis, rendered as a fenced code block. */
  code?: string;
  /** Fence language hint for `code`, e.g. 'java' | 'python' | 'tsx' | 'sql'. */
  lang?: string;
  anchor: string;
  compressed?: string;
  detail?: string;
  followup?: string;
  followupAnswer?: string;
  tie?: string;
  trap?: string;
  l2q?: string;
  l2a?: string;
  l3q?: string;
  l3a?: string;
}

export interface QBankTrack {
  label: string;
  short: string;
  icon: string;
  color: string;
  questions: QBankQuestion[];
}

/** Maps a Q-Bank track to the rubric classification used by the mastered→log bridge. */
export interface TrackMapEntry {
  taskType: TaskType;
  domain: string;
  role: Role;
}

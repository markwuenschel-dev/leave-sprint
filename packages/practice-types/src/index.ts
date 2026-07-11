/** Practice-domain shapes shared by Waypoint (not leave-sprint day/stage spine). */

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
  /** When true, counts toward readiness practice floor for its role track. */
  core?: boolean;
  /** Optional primary track affinity for dual-primary filtering. */
  roleTrack?: 'SWE' | 'MLE' | 'BOTH' | 'OTHER';
}

export interface FileDefenseItem {
  id: string;
  title: string;
  why: string;
  terminology: string;
  interviewLine: string;
  practicedDates: string[];
  notes?: string;
  /** When true, counts toward readiness defense floor. */
  core?: boolean;
  roleTrack?: 'SWE' | 'MLE' | 'BOTH' | 'OTHER';
  /** Project this card belongs to (slug). Drives per-project grouping/filtering. */
  project?: string;
}

export type Energy = 'low' | 'medium' | 'high' | undefined;

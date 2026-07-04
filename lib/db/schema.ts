/**
 * Drizzle schema — normalized Postgres tables for the single-user app.
 * No user_id anywhere (one dataset). Record<>-keyed store slices map their key
 * to the table PK. The ~80-field RubricEntry is stored hybrid: hot query/sort
 * fields as columns + a `diagnostic` jsonb for the rest.
 */

import { pgTable, integer, text, boolean, timestamp, jsonb, real, index } from 'drizzle-orm/pg-core';
import type { QBankStatus } from '../qbank/types';

export const days = pgTable('days', {
  day: integer('day').primaryKey(), // 1..29
  coding: boolean('coding').notNull().default(false),
  file: boolean('file').notNull().default(false),
  qa: boolean('qa').notNull().default(false),
  build: boolean('build').notNull().default(false),
  journal: text('journal'),
  focusNote: text('focus_note'),
  energy: text('energy'), // 'low' | 'medium' | 'high' | null
  lastUpdated: text('last_updated'), // ISO string, matches DayState.lastUpdated
});

export const stages = pgTable('stages', {
  id: text('id').primaryKey(),
  done: boolean('done').notNull().default(false),
  doneAt: text('done_at'), // ISO string
});

export const problems = pgTable('problems', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  tier: text('tier').notNull(),
  pattern: text('pattern').notNull(),
  status: text('status').notNull(),
  leetcodeSlug: text('leetcode_slug'),
  difficulty: text('difficulty'),
});

export const fileDefense = pgTable('file_defense', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  why: text('why').notNull(),
  terminology: text('terminology').notNull(),
  interviewLine: text('interview_line').notNull(),
  practicedDates: jsonb('practiced_dates').$type<string[]>().notNull().default([]),
  notes: text('notes'),
});

export const rubricEntries = pgTable(
  'rubric_entries',
  {
    id: text('id').primaryKey(),
    rubricVersion: text('rubric_version'),
    date: text('date').notNull(), // 'YYYY-MM-DD'
    task: text('task'),
    taskType: text('task_type'),
    domain: text('domain'),
    primaryDomain: text('primary_domain'),
    primaryRole: text('primary_role'),
    difficulty: integer('difficulty'),
    assistanceLevel: integer('assistance_level'),
    evidenceClass: text('evidence_class'),
    universalScore: real('universal_score'),
    taskSpecificScore: real('task_specific_score'),
    rawScore: real('raw_score'),
    finalScore: real('final_score'),
    demonstratedLevel: text('demonstrated_level'),
    quickLog: boolean('quick_log').notNull().default(false),
    weaknessTags: jsonb('weakness_tags').$type<string[]>().notNull().default([]),
    // Everything else from the ~80-field record (levelScores, universalSubScores,
    // gates, §16/§17 diagnostic block, extra, etc.).
    diagnostic: jsonb('diagnostic').$type<Record<string, unknown>>().notNull().default({}),
  },
  (t) => [index('rubric_date_idx').on(t.date)],
);

export const qbankStatus = pgTable('qbank_status', {
  questionId: text('question_id').primaryKey(),
  status: text('status').$type<QBankStatus>().notNull(),
});

/** Singleton row (id=1) for top-level scalars. */
export const appMeta = pgTable('app_meta', {
  id: integer('id').primaryKey(), // always 1
  selectedDay: integer('selected_day').notNull().default(1),
  qbankPos: jsonb('qbank_pos').$type<{ track: string; idx: number }>().notNull().default({ track: 'swe', idx: 0 }),
  lastUpdated: text('last_updated'),
});

export const schema = { days, stages, problems, fileDefense, rubricEntries, qbankStatus, appMeta };

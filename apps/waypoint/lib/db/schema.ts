import { pgTable, integer, text, boolean, jsonb, real, index } from "drizzle-orm/pg-core";
import type { QBankStatus } from "@waypoint/qbank";

export const rhythmDays = pgTable("wp_rhythm_days", {
  date: text("date").primaryKey(),
  practice: boolean("practice").notNull().default(false),
  defense: boolean("defense").notNull().default(false),
  interview: boolean("interview").notNull().default(false),
  admin: boolean("admin").notNull().default(false),
  journal: text("journal"),
  focusNote: text("focus_note"),
  energy: text("energy"),
  lastUpdated: text("last_updated"),
});

export const weeklyReviews = pgTable("wp_weekly_reviews", {
  weekStart: text("week_start").primaryKey(),
  whatMoved: text("what_moved"),
  focusNext: text("focus_next"),
  pipelineNotes: text("pipeline_notes"),
  done: boolean("done").notNull().default(false),
  lastUpdated: text("last_updated"),
});

export const problems = pgTable("wp_problems", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  tier: text("tier").notNull(),
  pattern: text("pattern").notNull(),
  status: text("status").notNull(),
  leetcodeSlug: text("leetcode_slug"),
  difficulty: text("difficulty"),
  core: boolean("core").notNull().default(false),
  roleTrack: text("role_track"),
});

export const fileDefense = pgTable("wp_file_defense", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  why: text("why").notNull(),
  terminology: text("terminology").notNull(),
  interviewLine: text("interview_line").notNull(),
  practicedDates: jsonb("practiced_dates").$type<string[]>().notNull().default([]),
  notes: text("notes"),
  core: boolean("core").notNull().default(false),
  roleTrack: text("role_track"),
  project: text("project"),
});

export const rubricEntries = pgTable(
  "wp_rubric_entries",
  {
    id: text("id").primaryKey(),
    rubricVersion: text("rubric_version"),
    date: text("date").notNull(),
    task: text("task"),
    taskType: text("task_type"),
    domain: text("domain"),
    primaryDomain: text("primary_domain"),
    primaryRole: text("primary_role"),
    difficulty: integer("difficulty"),
    assistanceLevel: integer("assistance_level"),
    evidenceClass: text("evidence_class"),
    universalScore: real("universal_score"),
    taskSpecificScore: real("task_specific_score"),
    rawScore: real("raw_score"),
    finalScore: real("final_score"),
    demonstratedLevel: text("demonstrated_level"),
    quickLog: boolean("quick_log").notNull().default(false),
    weaknessTags: jsonb("weakness_tags").$type<string[]>().notNull().default([]),
    diagnostic: jsonb("diagnostic").$type<Record<string, unknown>>().notNull().default({}),
  },
  (t) => [index("wp_rubric_date_idx").on(t.date)],
);

export const qbankStatus = pgTable("wp_qbank_status", {
  questionId: text("question_id").primaryKey(),
  status: text("status").$type<QBankStatus>().notNull(),
});

export const applications = pgTable("wp_applications", {
  id: text("id").primaryKey(),
  company: text("company").notNull(),
  roleTitle: text("role_title").notNull(),
  targetRole: text("target_role").notNull(),
  url: text("url"),
  status: text("status").notNull(),
  statusChangedAt: text("status_changed_at").notNull(),
  appliedAt: text("applied_at"),
  notes: text("notes"),
  materials: jsonb("materials").$type<{ label: string; url: string }[]>().notNull().default([]),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const appMeta = pgTable("wp_app_meta", {
  id: integer("id").primaryKey(),
  phase: text("phase").notNull().default("B"),
  roleFilter: text("role_filter").notNull().default("ALL"),
  qbankPos: jsonb("qbank_pos").$type<{ track: string; idx: number }>().notNull().default({ track: "swe", idx: 0 }),
  qbankOrder: jsonb("qbank_order").$type<Record<string, string[]>>().notNull().default({}),
  studyGuides: jsonb("study_guides").$type<Record<string, unknown>>().notNull().default({}),
  solidInterviewLogs: jsonb("solid_interview_logs")
    .$type<{ SWE_FS_II: string[]; MLE_II: string[] }>()
    .notNull()
    .default({ SWE_FS_II: [], MLE_II: [] }),
  // AI Mock cross-session memory: rotation counter + recently-asked questions.
  mockSeq: integer("mock_seq").notNull().default(0),
  mockAsked: jsonb("mock_asked").$type<string[]>().notNull().default([]),
  lastUpdated: text("last_updated"),
});

export const schema = {
  rhythmDays,
  weeklyReviews,
  problems,
  fileDefense,
  rubricEntries,
  qbankStatus,
  applications,
  appMeta,
};

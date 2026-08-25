-- ARCHIVED LEGACY DDL — HISTORICAL COMPATIBILITY EVIDENCE ONLY.
--
-- This is the hand-written bootstrap that created every Waypoint database before
-- INT-004 introduced generated migrations. It is NOT a second production DDL
-- executor and nothing at runtime reads it. Its only job is to let a test build a
-- database the way the old code did, so the baseline adoption path can be proved
-- against a real legacy schema rather than a mock of one.
--
-- Changing this file changes what "legacy" means. Any edit needs an explicit
-- compatibility rationale (INT-004, R-007).
--
-- Captured from apps/waypoint/lib/db/migrate.ts at commit d7f9f80.
CREATE TABLE IF NOT EXISTS wp_rhythm_days (
  date text PRIMARY KEY,
  practice boolean NOT NULL DEFAULT false,
  defense boolean NOT NULL DEFAULT false,
  interview boolean NOT NULL DEFAULT false,
  admin boolean NOT NULL DEFAULT false,
  journal text,
  focus_note text,
  energy text,
  last_updated text
);
CREATE TABLE IF NOT EXISTS wp_weekly_reviews (
  week_start text PRIMARY KEY,
  what_moved text,
  focus_next text,
  pipeline_notes text,
  done boolean NOT NULL DEFAULT false,
  last_updated text
);
CREATE TABLE IF NOT EXISTS wp_problems (
  id text PRIMARY KEY,
  title text NOT NULL,
  tier text NOT NULL,
  pattern text NOT NULL,
  status text NOT NULL,
  leetcode_slug text,
  difficulty text,
  core boolean NOT NULL DEFAULT false,
  role_track text
);
CREATE TABLE IF NOT EXISTS wp_file_defense (
  id text PRIMARY KEY,
  title text NOT NULL,
  why text NOT NULL,
  terminology text NOT NULL,
  interview_line text NOT NULL,
  practiced_dates jsonb NOT NULL DEFAULT '[]',
  notes text,
  core boolean NOT NULL DEFAULT false,
  role_track text,
  project text
);
ALTER TABLE wp_file_defense ADD COLUMN IF NOT EXISTS project text;
CREATE TABLE IF NOT EXISTS wp_rubric_entries (
  id text PRIMARY KEY,
  rubric_version text,
  date text NOT NULL,
  task text,
  task_type text,
  domain text,
  primary_domain text,
  primary_role text,
  difficulty integer,
  assistance_level integer,
  evidence_class text,
  universal_score real,
  task_specific_score real,
  raw_score real,
  final_score real,
  demonstrated_level text,
  quick_log boolean NOT NULL DEFAULT false,
  weakness_tags jsonb NOT NULL DEFAULT '[]',
  diagnostic jsonb NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS wp_rubric_date_idx ON wp_rubric_entries (date);
CREATE TABLE IF NOT EXISTS wp_qbank_status (
  question_id text PRIMARY KEY,
  status text NOT NULL
);
CREATE TABLE IF NOT EXISTS wp_applications (
  id text PRIMARY KEY,
  company text NOT NULL,
  role_title text NOT NULL,
  target_role text NOT NULL,
  url text,
  status text NOT NULL,
  status_changed_at text NOT NULL,
  applied_at text,
  notes text,
  materials jsonb NOT NULL DEFAULT '[]',
  created_at text NOT NULL,
  updated_at text NOT NULL
);
CREATE TABLE IF NOT EXISTS wp_projects (
  id text PRIMARY KEY,
  slug text NOT NULL,
  name text NOT NULL,
  summary text NOT NULL DEFAULT '',
  stage text NOT NULL,
  ownership text NOT NULL,
  created_at text NOT NULL,
  updated_at text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'
);
CREATE TABLE IF NOT EXISTS wp_resumes (
  id text PRIMARY KEY,
  label text NOT NULL,
  target_role text,
  frozen_at text,
  created_at text NOT NULL,
  updated_at text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'
);
CREATE TABLE IF NOT EXISTS wp_job_targets (
  id text PRIMARY KEY,
  company text NOT NULL,
  role_title text NOT NULL,
  career_role text,
  application_id text,
  submitted_resume_id text,
  created_at text NOT NULL,
  updated_at text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'
);
CREATE TABLE IF NOT EXISTS wp_campaigns (
  id text PRIMARY KEY,
  job_target_id text NOT NULL,
  career_role text NOT NULL,
  current_stage_id text,
  created_at text NOT NULL,
  updated_at text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS wp_campaigns_target_idx ON wp_campaigns (job_target_id);
CREATE INDEX IF NOT EXISTS wp_job_targets_app_idx ON wp_job_targets (application_id);
CREATE TABLE IF NOT EXISTS wp_app_meta (
  id integer PRIMARY KEY,
  phase text NOT NULL DEFAULT 'B',
  role_filter text NOT NULL DEFAULT 'ALL',
  qbank_pos jsonb NOT NULL DEFAULT '{"track":"swe","idx":0}',
  qbank_order jsonb NOT NULL DEFAULT '{}',
  study_guides jsonb NOT NULL DEFAULT '{}',
  solid_interview_logs jsonb NOT NULL DEFAULT '{"SWE_FS_II":[],"MLE_II":[]}',
  mock_seq integer NOT NULL DEFAULT 0,
  mock_asked jsonb NOT NULL DEFAULT '[]',
  last_updated text
);
ALTER TABLE wp_app_meta ADD COLUMN IF NOT EXISTS qbank_order jsonb NOT NULL DEFAULT '{}';
ALTER TABLE wp_app_meta ADD COLUMN IF NOT EXISTS study_guides jsonb NOT NULL DEFAULT '{}';
ALTER TABLE wp_app_meta ADD COLUMN IF NOT EXISTS mock_seq integer NOT NULL DEFAULT 0;
ALTER TABLE wp_app_meta ADD COLUMN IF NOT EXISTS mock_asked jsonb NOT NULL DEFAULT '[]';

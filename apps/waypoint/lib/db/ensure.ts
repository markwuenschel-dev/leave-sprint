/**
 * Idempotent schema bootstrap for PGlite (called from API routes).
 */
import { getDb } from "./index";

let done = false;

const SQL = `
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
-- additive: existing DBs get the column without a table rebuild
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
`;

export default async function ensure(): Promise<void> {
  if (done) return;
  const db = await getDb();
  const client = (db as any).$client;
  if (client?.exec) {
    await client.exec(SQL);
  } else {
    for (const stmt of SQL.split(";").map((s) => s.trim()).filter(Boolean)) {
      try {
        await (db as any).execute(stmt);
      } catch {
        /* ignore */
      }
    }
  }
  done = true;
}

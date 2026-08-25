CREATE TABLE "wp_app_meta" (
	"id" integer PRIMARY KEY NOT NULL,
	"phase" text DEFAULT 'B' NOT NULL,
	"role_filter" text DEFAULT 'ALL' NOT NULL,
	"qbank_pos" jsonb DEFAULT '{"track":"swe","idx":0}'::jsonb NOT NULL,
	"qbank_order" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"study_guides" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"solid_interview_logs" jsonb DEFAULT '{"SWE_FS_II":[],"MLE_II":[]}'::jsonb NOT NULL,
	"mock_seq" integer DEFAULT 0 NOT NULL,
	"mock_asked" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"last_updated" text
);
--> statement-breakpoint
CREATE TABLE "wp_applications" (
	"id" text PRIMARY KEY NOT NULL,
	"company" text NOT NULL,
	"role_title" text NOT NULL,
	"target_role" text NOT NULL,
	"url" text,
	"status" text NOT NULL,
	"status_changed_at" text NOT NULL,
	"applied_at" text,
	"notes" text,
	"materials" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wp_campaigns" (
	"id" text PRIMARY KEY NOT NULL,
	"job_target_id" text NOT NULL,
	"career_role" text NOT NULL,
	"current_stage_id" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wp_job_targets" (
	"id" text PRIMARY KEY NOT NULL,
	"company" text NOT NULL,
	"role_title" text NOT NULL,
	"career_role" text,
	"application_id" text,
	"submitted_resume_id" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wp_projects" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"stage" text NOT NULL,
	"ownership" text NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wp_resumes" (
	"id" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"target_role" text,
	"frozen_at" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wp_file_defense" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"why" text NOT NULL,
	"terminology" text NOT NULL,
	"interview_line" text NOT NULL,
	"practiced_dates" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"notes" text,
	"core" boolean DEFAULT false NOT NULL,
	"role_track" text,
	"project" text
);
--> statement-breakpoint
CREATE TABLE "wp_problems" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"tier" text NOT NULL,
	"pattern" text NOT NULL,
	"status" text NOT NULL,
	"leetcode_slug" text,
	"difficulty" text,
	"core" boolean DEFAULT false NOT NULL,
	"role_track" text
);
--> statement-breakpoint
CREATE TABLE "wp_qbank_status" (
	"question_id" text PRIMARY KEY NOT NULL,
	"status" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wp_rhythm_days" (
	"date" text PRIMARY KEY NOT NULL,
	"practice" boolean DEFAULT false NOT NULL,
	"defense" boolean DEFAULT false NOT NULL,
	"interview" boolean DEFAULT false NOT NULL,
	"admin" boolean DEFAULT false NOT NULL,
	"journal" text,
	"focus_note" text,
	"energy" text,
	"last_updated" text
);
--> statement-breakpoint
CREATE TABLE "wp_rubric_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"rubric_version" text,
	"date" text NOT NULL,
	"task" text,
	"task_type" text,
	"domain" text,
	"primary_domain" text,
	"primary_role" text,
	"difficulty" integer,
	"assistance_level" integer,
	"evidence_class" text,
	"universal_score" real,
	"task_specific_score" real,
	"raw_score" real,
	"final_score" real,
	"demonstrated_level" text,
	"quick_log" boolean DEFAULT false NOT NULL,
	"weakness_tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"diagnostic" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wp_weekly_reviews" (
	"week_start" text PRIMARY KEY NOT NULL,
	"what_moved" text,
	"focus_next" text,
	"pipeline_notes" text,
	"done" boolean DEFAULT false NOT NULL,
	"last_updated" text
);
--> statement-breakpoint
CREATE INDEX "wp_campaigns_target_idx" ON "wp_campaigns" USING btree ("job_target_id");--> statement-breakpoint
CREATE INDEX "wp_job_targets_app_idx" ON "wp_job_targets" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "wp_rubric_date_idx" ON "wp_rubric_entries" USING btree ("date");
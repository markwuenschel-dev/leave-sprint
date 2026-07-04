CREATE TABLE "app_meta" (
	"id" integer PRIMARY KEY NOT NULL,
	"selected_day" integer DEFAULT 1 NOT NULL,
	"qbank_pos" jsonb DEFAULT '{"track":"swe","idx":0}'::jsonb NOT NULL,
	"last_updated" text
);
--> statement-breakpoint
CREATE TABLE "days" (
	"day" integer PRIMARY KEY NOT NULL,
	"coding" boolean DEFAULT false NOT NULL,
	"file" boolean DEFAULT false NOT NULL,
	"qa" boolean DEFAULT false NOT NULL,
	"build" boolean DEFAULT false NOT NULL,
	"journal" text,
	"focus_note" text,
	"energy" text,
	"last_updated" text
);
--> statement-breakpoint
CREATE TABLE "file_defense" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"why" text NOT NULL,
	"terminology" text NOT NULL,
	"interview_line" text NOT NULL,
	"practiced_dates" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "problems" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"tier" text NOT NULL,
	"pattern" text NOT NULL,
	"status" text NOT NULL,
	"leetcode_slug" text,
	"difficulty" text
);
--> statement-breakpoint
CREATE TABLE "qbank_status" (
	"question_id" text PRIMARY KEY NOT NULL,
	"status" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rubric_entries" (
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
CREATE TABLE "stages" (
	"id" text PRIMARY KEY NOT NULL,
	"done" boolean DEFAULT false NOT NULL,
	"done_at" text
);
--> statement-breakpoint
CREATE INDEX "rubric_date_idx" ON "rubric_entries" USING btree ("date");
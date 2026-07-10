import type { InferSelectModel } from "drizzle-orm";
import { normaliseEntry, type RubricEntry } from "@waypoint/rubric";
import { rubricEntries } from "./schema";

type RubricRow = InferSelectModel<typeof rubricEntries>;

const PROMOTED = [
  "id",
  "rubricVersion",
  "date",
  "task",
  "taskType",
  "domain",
  "primaryDomain",
  "primaryRole",
  "difficulty",
  "assistanceLevel",
  "evidenceClass",
  "universalScore",
  "taskSpecificScore",
  "rawScore",
  "finalScore",
  "demonstratedLevel",
  "quickLog",
  "weaknessTags",
] as const;

export function rubricEntryToRow(e: RubricEntry): RubricRow {
  const diagnostic: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(e)) {
    if (!(PROMOTED as readonly string[]).includes(k)) diagnostic[k] = v;
  }
  return {
    id: e.assessmentId || e.id,
    rubricVersion: e.rubricVersion ?? null,
    date: e.date,
    task: e.task ?? null,
    taskType: e.taskType || null,
    domain: e.domain ?? null,
    primaryDomain: e.primaryDomain ?? null,
    primaryRole: e.primaryRole || null,
    difficulty: e.difficulty ?? null,
    assistanceLevel: e.assistanceLevel ?? null,
    evidenceClass: e.evidenceClass ?? null,
    universalScore: e.universalScore ?? null,
    taskSpecificScore: e.taskSpecificScore ?? null,
    rawScore: e.rawScore ?? null,
    finalScore: e.finalScore ?? null,
    demonstratedLevel: e.demonstratedLevel ?? null,
    quickLog: Boolean(e.quickLog),
    weaknessTags: e.weaknessTags ?? [],
    diagnostic,
  };
}

export function rowToRubricEntry(row: RubricRow): RubricEntry {
  return normaliseEntry({
    ...row.diagnostic,
    id: row.id,
    rubricVersion: row.rubricVersion,
    date: row.date,
    task: row.task,
    taskType: row.taskType,
    domain: row.domain,
    primaryDomain: row.primaryDomain,
    primaryRole: row.primaryRole,
    difficulty: row.difficulty,
    assistanceLevel: row.assistanceLevel,
    evidenceClass: row.evidenceClass,
    universalScore: row.universalScore,
    taskSpecificScore: row.taskSpecificScore,
    rawScore: row.rawScore,
    finalScore: row.finalScore,
    demonstratedLevel: row.demonstratedLevel,
    quickLog: row.quickLog,
    weaknessTags: row.weaknessTags,
  });
}

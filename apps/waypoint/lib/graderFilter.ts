/**
 * Grader-provenance filter for the analytics boards (ADR-0002 trust-parity).
 * AI grades carry `calibration.graderModel` + `evaluatorType: 'AI grader'`;
 * manual/quick-log grades carry neither. Slicing by grader lets you spot whether
 * one model runs lenient, or compare AI-graded vs manual evidence.
 */

import type { RubricEntry } from "@waypoint/rubric";

/** "all" | "ai" | "manual" | a specific graderModel id. */
export type GraderFilter = string;

function isAI(e: RubricEntry): boolean {
  return !!e.calibration?.graderModel || e.calibration?.evaluatorType === "AI grader";
}

/** Distinct AI grader model ids present in the entries, sorted. */
export function graderModelsIn(entries: RubricEntry[]): string[] {
  const set = new Set<string>();
  for (const e of entries) {
    const m = e.calibration?.graderModel;
    if (m) set.add(m);
  }
  return [...set].sort();
}

export function filterByGrader(entries: RubricEntry[], filter: GraderFilter): RubricEntry[] {
  if (!filter || filter === "all") return entries;
  if (filter === "ai") return entries.filter(isAI);
  if (filter === "manual") return entries.filter((e) => !isAI(e));
  return entries.filter((e) => e.calibration?.graderModel === filter);
}

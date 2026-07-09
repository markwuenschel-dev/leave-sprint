/**
 * One-shot Leave Sprint Twin → Waypoint import (optional).
 * Scope: practice progress + rubric history only.
 * Non-imports: days, stages, journals, twin meta.
 */

import { normaliseEntry, type RubricEntry } from "@waypoint/rubric";
import type { ProblemStatus } from "@waypoint/practice-types";
import type { QBankStatus } from "@waypoint/qbank";
import type { WaypointState } from "./domain";

export interface TwinImportSummary {
  problemsUpdated: number;
  problemsUnmatched: string[];
  defenseUpdated: number;
  defenseUnmatched: string[];
  qbankKeys: number;
  rubricAdded: number;
  rubricSkipped: number;
  ignoredKeys: string[];
}

export interface TwinImportResult {
  state: WaypointState;
  summary: TwinImportSummary;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function asStatus(v: unknown): ProblemStatus | null {
  if (v === "not-started" || v === "practicing" || v === "solid") return v;
  return null;
}

function asQbank(v: unknown): QBankStatus | null {
  if (v === "mastered" || v === "review") return v;
  return null;
}

/**
 * Merge twin export JSON into a Waypoint state snapshot.
 * ID-join for problems/defense; unmatched twin ids listed; corrupt rubric quarantined.
 */
export function applyTwinImport(current: WaypointState, raw: unknown): TwinImportResult {
  const summary: TwinImportSummary = {
    problemsUpdated: 0,
    problemsUnmatched: [],
    defenseUpdated: 0,
    defenseUnmatched: [],
    qbankKeys: 0,
    rubricAdded: 0,
    rubricSkipped: 0,
    ignoredKeys: [],
  };

  if (!isRecord(raw)) {
    return { state: current, summary };
  }

  const known = new Set([
    "problems",
    "fileDefense",
    "rubricEntries",
    "qbankStatus",
    "qbankPos",
    "days",
    "stages",
    "lastUpdated",
    "selectedDay",
    "state", // nested zustand persist envelope
  ]);
  for (const k of Object.keys(raw)) {
    if (!known.has(k)) summary.ignoredKeys.push(k);
  }

  // Support raw twin payload or zustand persist { state: { ... } }
  let src = raw;
  if (isRecord(raw.state) && (raw.state.problems || raw.state.rubricEntries)) {
    src = raw.state as Record<string, unknown>;
  }

  let problems = current.problems.map((p) => ({ ...p }));
  let fileDefense = current.fileDefense.map((f) => ({
    ...f,
    practicedDates: [...(f.practicedDates || [])],
  }));
  let qbankStatus: Record<string, QBankStatus> = { ...current.qbankStatus };
  let rubricEntries = [...current.rubricEntries];

  // ── Problems (status by id) ──────────────────────────────────────────
  if (Array.isArray(src.problems)) {
    const byId = new Map(problems.map((p, i) => [p.id, i]));
    for (const row of src.problems) {
      if (!isRecord(row) || typeof row.id !== "string") continue;
      const st = asStatus(row.status);
      if (!st) continue;
      const idx = byId.get(row.id);
      if (idx === undefined) {
        summary.problemsUnmatched.push(row.id);
        continue;
      }
      if (problems[idx].status !== st) {
        problems[idx] = { ...problems[idx], status: st };
        summary.problemsUpdated++;
      }
    }
  }

  // ── File defense (practicedDates + notes by id) ──────────────────────
  if (Array.isArray(src.fileDefense)) {
    const byId = new Map(fileDefense.map((f, i) => [f.id, i]));
    for (const row of src.fileDefense) {
      if (!isRecord(row) || typeof row.id !== "string") continue;
      const idx = byId.get(row.id);
      if (idx === undefined) {
        summary.defenseUnmatched.push(row.id);
        continue;
      }
      const dates = Array.isArray(row.practicedDates)
        ? row.practicedDates.filter((d): d is string => typeof d === "string")
        : [];
      const notes = typeof row.notes === "string" ? row.notes : fileDefense[idx].notes;
      const mergedDates = Array.from(
        new Set([...(fileDefense[idx].practicedDates || []), ...dates]),
      ).sort();
      const changed =
        mergedDates.join(",") !== (fileDefense[idx].practicedDates || []).join(",") ||
        notes !== fileDefense[idx].notes;
      if (changed) {
        fileDefense[idx] = {
          ...fileDefense[idx],
          practicedDates: mergedDates,
          ...(notes != null ? { notes } : {}),
        };
        summary.defenseUpdated++;
      }
    }
  }

  // ── Q-bank status ────────────────────────────────────────────────────
  if (isRecord(src.qbankStatus)) {
    for (const [qid, st] of Object.entries(src.qbankStatus)) {
      const v = asQbank(st);
      if (!v) continue;
      qbankStatus[qid] = v;
      summary.qbankKeys++;
    }
  }

  // ── Rubric history ───────────────────────────────────────────────────
  if (Array.isArray(src.rubricEntries)) {
    const existingIds = new Set(
      rubricEntries.map((e) => e.id || e.assessmentId).filter(Boolean),
    );
    for (const row of src.rubricEntries) {
      try {
        const e = normaliseEntry(row as Partial<RubricEntry>);
        const id = e.id || e.assessmentId;
        if (!id || !e.task) {
          summary.rubricSkipped++;
          continue;
        }
        if (existingIds.has(id)) {
          summary.rubricSkipped++;
          continue;
        }
        rubricEntries = [e, ...rubricEntries];
        existingIds.add(id);
        summary.rubricAdded++;
      } catch {
        summary.rubricSkipped++;
      }
    }
  }

  // days / stages / journals: explicitly ignored (do not copy)

  return {
    state: {
      ...current,
      problems,
      fileDefense,
      qbankStatus,
      rubricEntries,
    },
    summary,
  };
}

export function formatTwinSummary(s: TwinImportSummary): string {
  const lines = [
    `Problems updated: ${s.problemsUpdated}` +
      (s.problemsUnmatched.length ? ` (${s.problemsUnmatched.length} unmatched ids)` : ""),
    `Defense updated: ${s.defenseUpdated}` +
      (s.defenseUnmatched.length ? ` (${s.defenseUnmatched.length} unmatched ids)` : ""),
    `Q-bank statuses: ${s.qbankKeys}`,
    `Rubric added: ${s.rubricAdded} (skipped ${s.rubricSkipped})`,
  ];
  if (s.ignoredKeys.length) {
    lines.push(`Ignored twin keys: ${s.ignoredKeys.slice(0, 12).join(", ")}`);
  }
  return lines.join("\n");
}

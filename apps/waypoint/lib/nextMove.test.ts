/**
 * INT-022 — pin pickNextMove priority as it runs today:
 * unfinished floor beats due retest beats daily rhythm.
 *
 * DS/DE (and any non-primary filter) have no floor in this function — they
 * fall through to that scope's retest queue, then rhythm. Pin that; do not
 * "fix" DS/DE policy. Product weights in nextMove.ts stay untouched.
 */

import { describe, expect, it } from "vitest";
import type { FileDefenseItem, Problem } from "@waypoint/practice-types";
import type { RubricEntry } from "@waypoint/rubric";
import type { RoleFilter, WaypointState } from "./domain";
import type { InterviewTabId, MainTabId } from "./nav";
import { pickNextMove } from "./nextMove";

function problem(id: string, over: Partial<Problem> = {}): Problem {
  return {
    id,
    title: id,
    tier: "A",
    pattern: "array",
    status: "not-started",
    core: true,
    ...over,
  };
}

function defense(id: string, over: Partial<FileDefenseItem> = {}): FileDefenseItem {
  return {
    id,
    title: id,
    why: "",
    terminology: "",
    interviewLine: "",
    practicedDates: [],
    core: true,
    ...over,
  };
}

function entry(over: Partial<RubricEntry> = {}): RubricEntry {
  return {
    id: over.id ?? "e1",
    assessmentId: over.id ?? "e1",
    date: "2026-01-05",
    task: "task",
    taskType: "coding",
    domain: "",
    primaryDomain: "",
    primaryRole: "SWE",
    finalScore: 70,
    demonstratedLevel: "",
    qualifyingDemonstratedLevel: "",
    ...over,
  } as unknown as RubricEntry;
}

/** One solid core problem + one practiced core defense + two interview logs. */
function greenRole(
  track: "SWE" | "MLE",
  role: "SWE_FS_II" | "MLE_II",
): Pick<WaypointState, "problems" | "fileDefense" | "solidInterviewLogs"> {
  return {
    problems: [problem(`${track}-p`, { roleTrack: track, status: "solid" })],
    fileDefense: [defense(`${track}-d`, { roleTrack: track, practicedDates: ["2026-01-01"] })],
    solidInterviewLogs: {
      SWE_FS_II: role === "SWE_FS_II" ? ["a", "b"] : [],
      MLE_II: role === "MLE_II" ? ["a", "b"] : [],
    },
  };
}

/** Open, due-now retest: past retestDate + High staleness. Not closed. */
function dueRetest(over: Partial<RubricEntry> = {}): RubricEntry {
  return entry({
    id: over.id ?? "retest-due",
    task: "two-sum retry",
    retestPlan: { retestDate: "2020-01-01" },
    staleness: { stalenessRisk: "High" },
    ...over,
  });
}

const RHYTHM_OPEN = {
  practice: false,
  defense: false,
  interview: false,
  admin: false,
};

const SWE_UNMET_PRACTICE = {
  problems: [problem("swe-p", { roleTrack: "SWE" as const, status: "practicing" as const })],
  fileDefense: [defense("swe-d", { roleTrack: "SWE" as const, practicedDates: ["2026-01-01"] })],
  solidInterviewLogs: { SWE_FS_II: ["a", "b"], MLE_II: [] as string[] },
};

describe("pickNextMove priority", () => {
  it.each([
    {
      name: "unmet SWE practice + due retest → tab practice (floor beats retest)",
      roleFilter: "SWE" as RoleFilter,
      ...SWE_UNMET_PRACTICE,
      rubricEntries: [dueRetest({ primaryRole: "SWE" })],
      rhythmDone: RHYTHM_OPEN,
      want: { tab: "practice" as MainTabId, title: "Practice · SWE core solid" },
    },
    {
      name: "SWE floors met + due retest → interview/gaps (retest beats rhythm)",
      roleFilter: "SWE" as RoleFilter,
      ...greenRole("SWE", "SWE_FS_II"),
      rubricEntries: [dueRetest({ primaryRole: "SWE" })],
      rhythmDone: RHYTHM_OPEN,
      want: {
        tab: "interview" as MainTabId,
        interviewTab: "gaps" as InterviewTabId,
        title: "Retest · two-sum retry",
      },
    },
    {
      name: "floors met, empty retest, practice rhythm open → tab practice (rhythm)",
      roleFilter: "SWE" as RoleFilter,
      ...greenRole("SWE", "SWE_FS_II"),
      rubricEntries: [],
      rhythmDone: { practice: false, defense: true, interview: true, admin: true },
      want: { tab: "practice" as MainTabId, title: "Daily rhythm · Practice" },
    },
    {
      name: "DS (no floor) + due DS retest → interview/gaps (skips SWE floor, hits retest)",
      roleFilter: "DS" as RoleFilter,
      ...SWE_UNMET_PRACTICE,
      rubricEntries: [dueRetest({ id: "ds-retest", primaryRole: "DS", task: "ds-retest" })],
      rhythmDone: RHYTHM_OPEN,
      want: {
        tab: "interview" as MainTabId,
        interviewTab: "gaps" as InterviewTabId,
        title: "Retest · ds-retest",
      },
    },
    {
      name: "DS (no floor) + empty retest + practice rhythm open → tab practice (rhythm)",
      roleFilter: "DS" as RoleFilter,
      ...SWE_UNMET_PRACTICE,
      rubricEntries: [],
      rhythmDone: { practice: false, defense: true, interview: true, admin: true },
      want: { tab: "practice" as MainTabId, title: "Daily rhythm · Practice" },
    },
  ])("$name", (row) => {
    const move = pickNextMove({
      problems: row.problems,
      fileDefense: row.fileDefense,
      rubricEntries: row.rubricEntries,
      solidInterviewLogs: row.solidInterviewLogs,
      roleFilter: row.roleFilter,
      rhythmDone: row.rhythmDone,
    });
    expect(move).toMatchObject(row.want);
  });
});

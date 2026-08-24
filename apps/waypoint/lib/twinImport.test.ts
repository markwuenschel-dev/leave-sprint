/**
 * WP-C22 — characterize applyTwinImport. Pins the one-shot twin merge as it
 * runs today: ID-join for problems, quarantine for corrupt rubric, zustand
 * envelope unwrap, ignored unknown keys.
 */

import { describe, expect, it } from "vitest";
import type { Problem } from "@waypoint/practice-types";
import type { WaypointState } from "./domain";
import { applyTwinImport } from "./twinImport";

function problem(id: string, over: Partial<Problem> = {}): Problem {
  return {
    id,
    title: id,
    tier: "A",
    pattern: "array",
    status: "not-started",
    ...over,
  };
}

function state(over: Partial<WaypointState> = {}): WaypointState {
  return {
    phase: "B",
    roleFilter: "ALL",
    rhythmDays: {},
    weeklyReviews: {},
    problems: [],
    fileDefense: [],
    rubricEntries: [],
    qbankStatus: {},
    qbankPos: { track: "swe", idx: 0 },
    qbankOrder: {},
    applications: [],
    projects: [],
    resumes: [],
    jobTargets: [],
    campaigns: [],
    solidInterviewLogs: { SWE_FS_II: [], MLE_II: [] },
    mockSeq: 0,
    mockAsked: [],
    studyGuides: {},
    ...over,
  };
}

const emptySummary = {
  problemsUpdated: 0,
  problemsUnmatched: [] as string[],
  defenseUpdated: 0,
  defenseUnmatched: [] as string[],
  qbankKeys: 0,
  rubricAdded: 0,
  rubricSkipped: 0,
  ignoredKeys: [] as string[],
};

describe("applyTwinImport", () => {
  it("returns the current state unchanged when raw is not an object", () => {
    const current = state({ problems: [problem("p1", { status: "solid" })] });
    for (const raw of [null, undefined, 0, "payload", ["not", "an", "object"]]) {
      const result = applyTwinImport(current, raw);
      expect(result.state).toBe(current);
      expect(result.summary).toEqual(emptySummary);
    }
  });

  it("updates matching problem status by id and lists unmatched ids", () => {
    const current = state({
      problems: [
        problem("p1", { status: "not-started" }),
        problem("p2", { status: "practicing" }),
      ],
    });
    const { state: next, summary } = applyTwinImport(current, {
      problems: [
        { id: "p1", status: "solid" },
        { id: "p2", status: "practicing" },
        { id: "ghost", status: "solid" },
      ],
    });
    expect(next.problems.map((p) => p.status)).toEqual(["solid", "practicing"]);
    expect(summary.problemsUpdated).toBe(1);
    expect(summary.problemsUnmatched).toEqual(["ghost"]);
    // Source rows are copied; current is not mutated.
    expect(current.problems[0].status).toBe("not-started");
  });

  it("increments rubricSkipped, not rubricAdded, for corrupt rubric rows", () => {
    const current = state({
      rubricEntries: [
        {
          id: "already",
          assessmentId: "already",
          task: "existing",
        } as never,
      ],
    });
    const { state: next, summary } = applyTwinImport(current, {
      rubricEntries: [
        { id: "good", task: "Two sum", finalScore: 80 },
        { id: "no-task" },
        { id: "already", task: "duplicate of current" },
        null,
      ],
    });
    expect(summary.rubricAdded).toBe(1);
    expect(summary.rubricSkipped).toBe(3);
    expect(next.rubricEntries.map((e) => e.id || e.assessmentId)).toEqual([
      "good",
      "already",
    ]);
    expect(next.rubricEntries[0].task).toBe("Two sum");
  });

  it("accepts a nested { state: { ... } } zustand persist envelope", () => {
    const current = state({ problems: [problem("p1", { status: "not-started" })] });
    const { state: next, summary } = applyTwinImport(current, {
      state: {
        problems: [{ id: "p1", status: "solid" }],
      },
    });
    expect(next.problems[0].status).toBe("solid");
    expect(summary.problemsUpdated).toBe(1);
  });

  it("lists unknown top-level keys in ignoredKeys", () => {
    const { summary } = applyTwinImport(state(), {
      problems: [],
      days: [],
      stages: [],
      lastUpdated: "2026-01-01",
      mystery: 1,
      alsoUnknown: true,
    });
    expect(summary.ignoredKeys).toEqual(["mystery", "alsoUnknown"]);
  });
});

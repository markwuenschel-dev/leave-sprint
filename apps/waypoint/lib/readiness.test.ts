/**
 * WP-C22 — characterize computeReadiness. Pins the evidence-green floor as it
 * runs today, including the interview Math.max(fromRubric, logs.length) path.
 * WP-C04 (change-the-log bypass) is out of scope: do not "fix" the log count.
 */

import { describe, expect, it } from "vitest";
import type { FileDefenseItem, Problem } from "@waypoint/practice-types";
import type { RubricEntry } from "@waypoint/rubric";
import type { WaypointState } from "./domain";
import { computeReadiness } from "./readiness";

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

/** Smallest WaypointState computeReadiness actually reads from. */
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
    solidInterviewLogs: { SWE_FS_II: [], MLE_II: [] },
    mockSeq: 0,
    mockAsked: [],
    studyGuides: {},
    ...over,
  };
}

function floorOf(s: WaypointState, role: "SWE_FS_II" | "MLE_II") {
  const snap = computeReadiness(s);
  const floor = snap.roles.find((r) => r.role === role);
  if (!floor) throw new Error(`missing role ${role}`);
  return { snap, floor };
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

function mergeRoleSlices(
  a: Pick<WaypointState, "problems" | "fileDefense" | "solidInterviewLogs">,
  b: Pick<WaypointState, "problems" | "fileDefense" | "solidInterviewLogs">,
): Pick<WaypointState, "problems" | "fileDefense" | "solidInterviewLogs"> {
  return {
    problems: [...a.problems, ...b.problems],
    fileDefense: [...a.fileDefense, ...b.fileDefense],
    solidInterviewLogs: {
      SWE_FS_II: [
        ...a.solidInterviewLogs.SWE_FS_II,
        ...b.solidInterviewLogs.SWE_FS_II,
      ],
      MLE_II: [...a.solidInterviewLogs.MLE_II, ...b.solidInterviewLogs.MLE_II],
    },
  };
}

describe("evidenceGreen", () => {
  it("is true only when both primary roles are green", () => {
    const both = mergeRoleSlices(greenRole("SWE", "SWE_FS_II"), greenRole("MLE", "MLE_II"));
    const green = computeReadiness(state(both));
    expect(green.roles.map((r) => r.role)).toEqual(["SWE_FS_II", "MLE_II"]);
    expect(green.roles.every((r) => r.green)).toBe(true);
    expect(green.evidenceGreen).toBe(true);

    // SWE still green; MLE has no interview evidence.
    const sweOnly = computeReadiness(state(greenRole("SWE", "SWE_FS_II")));
    expect(sweOnly.roles.find((r) => r.role === "SWE_FS_II")!.green).toBe(true);
    expect(sweOnly.roles.find((r) => r.role === "MLE_II")!.green).toBe(false);
    expect(sweOnly.evidenceGreen).toBe(false);
  });
});

describe("practice floor", () => {
  it("requires ≥80% solid on scoped core problems", () => {
    const five = (solid: number) =>
      Array.from({ length: 5 }, (_, i) =>
        problem(`swe-${i}`, {
          roleTrack: "SWE",
          status: i < solid ? "solid" : "practicing",
        }),
      );

    const met = floorOf(state({ problems: five(4) }), "SWE_FS_II").floor.practice;
    expect(met).toMatchObject({ met: true, count: 4, need: 4, ratio: 0.8 });

    const short = floorOf(state({ problems: five(3) }), "SWE_FS_II").floor.practice;
    expect(short).toMatchObject({ met: false, count: 3, need: 4, ratio: 0.6 });
  });

  it("ignores non-core problems once any core row is in scope", () => {
    const problems = [
      problem("core", { roleTrack: "SWE", status: "practicing", core: true }),
      problem("extra-1", { roleTrack: "SWE", status: "solid", core: false }),
      problem("extra-2", { roleTrack: "SWE", status: "solid", core: false }),
      problem("extra-3", { roleTrack: "SWE", status: "solid", core: false }),
      problem("extra-4", { roleTrack: "SWE", status: "solid", core: false }),
    ];
    const { floor } = floorOf(state({ problems }), "SWE_FS_II");
    expect(floor.practice).toMatchObject({ met: false, count: 0, need: 1, ratio: 0 });
  });
});

describe("interview floor", () => {
  it("counts solidInterviewLogs length even when rubric is empty", () => {
    // Current behavior: Math.max(fromRubric, logs.length). Two log ids meet
    // the floor with no rubric rows at all. Do not treat this as a bug here.
    const { floor } = floorOf(
      state({ solidInterviewLogs: { SWE_FS_II: ["log-a", "log-b"], MLE_II: [] } }),
      "SWE_FS_II",
    );
    expect(floor.interview).toMatchObject({ met: true, count: 2, need: 2 });
  });

  it("takes Math.max(fromRubric, logs.length) as the interview count", () => {
    const moreLogs = floorOf(
      state({
        rubricEntries: [entry({ id: "r1", primaryRole: "SWE", finalScore: 90 })],
        solidInterviewLogs: { SWE_FS_II: ["a", "b", "c"], MLE_II: [] },
      }),
      "SWE_FS_II",
    ).floor.interview;
    expect(moreLogs.count).toBe(3);

    const moreRubric = floorOf(
      state({
        rubricEntries: [
          entry({ id: "r1", primaryRole: "SWE", finalScore: 90 }),
          entry({ id: "r2", primaryRole: "SWE", finalScore: 90 }),
          entry({ id: "r3", primaryRole: "SWE", finalScore: 90 }),
        ],
        solidInterviewLogs: { SWE_FS_II: ["only-one"], MLE_II: [] },
      }),
      "SWE_FS_II",
    ).floor.interview;
    expect(moreRubric.count).toBe(3);
  });

  it("does not increment fromRubric for coached rows (llmIndependence.llmUsed === true)", () => {
    const { floor } = floorOf(
      state({
        rubricEntries: [
          entry({
            id: "c1",
            primaryRole: "SWE",
            finalScore: 95,
            llmIndependence: { llmUsed: true },
          }),
          entry({
            id: "c2",
            primaryRole: "SWE",
            finalScore: 95,
            llmIndependence: { llmUsed: true },
          }),
        ],
      }),
      "SWE_FS_II",
    );
    expect(floor.interview).toMatchObject({ met: false, count: 0, need: 2 });
  });

  it("meets the interview floor with two uncoached solid rubric rows and no logs", () => {
    const { floor } = floorOf(
      state({
        rubricEntries: [
          entry({ id: "u1", primaryRole: "SWE", finalScore: 70 }),
          entry({ id: "u2", primaryRole: "SWE", finalScore: 70 }),
        ],
      }),
      "SWE_FS_II",
    );
    expect(floor.interview).toMatchObject({ met: true, count: 2, need: 2 });
  });
});

describe("defense floor", () => {
  it("requires every scoped core item to have at least one practicedDates entry", () => {
    const oneCold = floorOf(
      state({
        fileDefense: [
          defense("d1", { roleTrack: "SWE", practicedDates: ["2026-01-01"] }),
          defense("d2", { roleTrack: "SWE", practicedDates: [] }),
        ],
      }),
      "SWE_FS_II",
    ).floor.defense;
    expect(oneCold).toMatchObject({ met: false, count: 1, need: 2 });

    const allPracticed = floorOf(
      state({
        fileDefense: [
          defense("d1", { roleTrack: "SWE", practicedDates: ["2026-01-01"] }),
          defense("d2", { roleTrack: "SWE", practicedDates: ["2026-01-02"] }),
        ],
      }),
      "SWE_FS_II",
    ).floor.defense;
    expect(allPracticed).toMatchObject({ met: true, count: 2, need: 2 });
  });
});

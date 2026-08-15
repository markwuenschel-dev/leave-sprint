import { describe, expect, it } from "vitest";

// Direct workspace-alias import: proves the runner resolves `@waypoint/*` to the
// package TS sources with no build step (packages/rubric has no dist).
import { RD, clusterForTag, type RubricEntry } from "@waypoint/rubric";

import { weekStartIso } from "./domain";
import {
  MATRIX_ROLES,
  buildGapBoard,
  buildRoleLevelMatrix,
  cumulativeQualifying,
  domainAverages,
  entryMatrixRole,
  filterEntriesByRole,
  performanceSummary,
  rolesForFilter,
  rollingAverage,
  scoreHistogram,
  scoreTimeline,
  skillAreaAverages,
  weeklyAssessmentBuckets,
} from "./gaps";

let seq = 0;
function entry(over: Partial<RubricEntry> = {}): RubricEntry {
  seq += 1;
  return {
    id: `e${seq}`,
    assessmentId: `e${seq}`,
    date: "2026-01-05",
    task: `task ${seq}`,
    taskType: "coding",
    domain: "",
    primaryDomain: "",
    primaryRole: "SWE",
    finalScore: 75,
    qualifyingDemonstratedLevel: "",
    levelScores: { L1: null, L2: null, L3: null },
    gates: {},
    knowledgeGapTags: [],
    gapTypes: [],
    ...over,
  } as unknown as RubricEntry;
}

const DAY_MS = 86_400_000;

describe("workspace alias resolution", () => {
  it("loads @waypoint/rubric from source and gets live values, not just types", () => {
    expect(Array.isArray(RD.taskTypes)).toBe(true);
    expect(RD.taskTypes.map((t) => t.id)).toContain("analyticsCase");
    expect(clusterForTag("Backpressure")).toBe("Data engineering pipelines");
  });
});

describe("entryMatrixRole", () => {
  it("trusts an explicit primaryRole when it is already a matrix role", () => {
    expect(entryMatrixRole(entry({ primaryRole: "BIA" }))).toBe("BIA");
    expect(entryMatrixRole(entry({ primaryRole: "MLE" }))).toBe("MLE");
  });

  it("falls back to matching domain text when primaryRole is unset", () => {
    expect(entryMatrixRole(entry({ primaryRole: "", domain: "React frontend work" }))).toBe("SWE");
    expect(entryMatrixRole(entry({ primaryRole: "", domain: "Machine learning eval" }))).toBe("MLE");
    expect(entryMatrixRole(entry({ primaryRole: "", domain: "Statistical analysis" }))).toBe("DS");
    expect(entryMatrixRole(entry({ primaryRole: "", domain: "ETL pipeline design" }))).toBe("DE");
  });

  it("matches BI before DS/DE, so dashboard work is not swallowed as data science", () => {
    // The DS pattern (/DATA.?SCIEN/) would also match this blob; BIE must win.
    expect(
      entryMatrixRole(entry({ primaryRole: "", domain: "Semantic layer for the data science team" })),
    ).toBe("BIE");
    expect(entryMatrixRole(entry({ primaryRole: "", primaryDomain: "Tableau dashboard" }))).toBe("BIE");
  });

  it("is case insensitive across domain, primaryDomain and primaryRole", () => {
    expect(entryMatrixRole(entry({ primaryRole: "", primaryDomain: "quicksight" }))).toBe("BIE");
  });

  it("returns null when nothing in the entry names a role", () => {
    expect(entryMatrixRole(entry({ primaryRole: "", domain: "", primaryDomain: "" }))).toBeNull();
  });
});

describe("filterEntriesByRole / rolesForFilter", () => {
  it("passes every entry through for ALL", () => {
    const es = [entry({ primaryRole: "SWE" }), entry({ primaryRole: "DE" })];
    expect(filterEntriesByRole(es, "ALL")).toHaveLength(2);
    expect(rolesForFilter("ALL")).toEqual(MATRIX_ROLES);
  });

  it("keeps only the matching role for a narrow filter", () => {
    const es = [entry({ primaryRole: "SWE" }), entry({ primaryRole: "DE" })];
    expect(filterEntriesByRole(es, "DE").map((e) => e.primaryRole)).toEqual(["DE"]);
    expect(rolesForFilter("DE")).toEqual(["DE"]);
  });

  it("drops unclassifiable entries from a narrow filter", () => {
    const es = [entry({ primaryRole: "", domain: "" })];
    expect(filterEntriesByRole(es, "SWE")).toEqual([]);
  });
});

describe("rollingAverage", () => {
  it("averages a trailing window, growing the window at the start of the series", () => {
    expect(rollingAverage([60, 70, 80, 90], 2)).toEqual([60, 65, 75, 85]);
  });

  it("skips nulls inside the window instead of treating them as zero", () => {
    expect(rollingAverage([60, null, 80], 3)).toEqual([60, 60, 70]);
  });

  it("emits null only where the whole window is empty", () => {
    expect(rollingAverage([null, null], 2)).toEqual([null, null]);
  });

  it("returns an empty series for empty input", () => {
    expect(rollingAverage([], 5)).toEqual([]);
  });

  it("rounds to a whole number", () => {
    expect(rollingAverage([70, 71], 2)).toEqual([70, 71]); // (70+71)/2 = 70.5 -> 71
  });
});

describe("scoreTimeline", () => {
  it("sorts chronologically and drops entries with no date", () => {
    const tl = scoreTimeline([
      entry({ id: "b", date: "2026-02-02" }),
      entry({ id: "a", date: "2026-01-01" }),
      entry({ id: "undated", date: "" }),
    ]);
    expect(tl.map((p) => p.id)).toEqual(["a", "b"]);
  });

  it("normalises a non-numeric final score to null", () => {
    const [p] = scoreTimeline([entry({ finalScore: undefined as never })]);
    expect(p.final).toBeNull();
  });
});

describe("scoreHistogram", () => {
  it("returns six fixed bins with the documented band classes", () => {
    const bins = scoreHistogram([]);
    expect(bins.map((b) => b.label)).toEqual(["0–49", "50–59", "60–69", "70–79", "80–89", "90+"]);
    expect(bins.map((b) => b.band)).toEqual([
      "fail",
      "fail",
      "borderline",
      "pass",
      "pass",
      "pass",
    ]);
  });

  it("places a score in the bin whose lower edge it meets (half-open bins)", () => {
    const bins = scoreHistogram([
      entry({ finalScore: 49 }),
      entry({ finalScore: 50 }),
      entry({ finalScore: 69 }),
      entry({ finalScore: 70 }),
      entry({ finalScore: 100 }),
    ]);
    expect(bins.map((b) => b.count)).toEqual([1, 1, 1, 1, 0, 1]);
  });

  it("ignores entries whose final score is not a number", () => {
    const bins = scoreHistogram([entry({ finalScore: null as never })]);
    expect(bins.reduce((s, b) => s + b.count, 0)).toBe(0);
  });
});

describe("weeklyAssessmentBuckets / cumulativeQualifying", () => {
  it("groups entries from the same week into one bucket", () => {
    // 2026-01-05 is a Monday; 06/07 fall in the same Mon–Sun week.
    const buckets = weeklyAssessmentBuckets([
      entry({ date: "2026-01-05", qualifyingDemonstratedLevel: "L1" }),
      entry({ date: "2026-01-06", qualifyingDemonstratedLevel: "L2" }),
      entry({ date: "2026-01-07", qualifyingDemonstratedLevel: "" }),
    ]);
    expect(buckets).toHaveLength(1);
    expect(buckets[0].count).toBe(3);
    expect(buckets[0].qualifying).toEqual({ L1: 1, L2: 1, L3: 0 });
  });

  it("splits entries from different weeks and sorts the buckets ascending", () => {
    const buckets = weeklyAssessmentBuckets([
      entry({ date: "2026-01-20" }),
      entry({ date: "2026-01-06" }),
    ]);
    expect(buckets).toHaveLength(2);
    expect(buckets[0].weekStart < buckets[1].weekStart).toBe(true);
  });

  it("anchors each bucket at or before its earliest member, within one week", () => {
    const buckets = weeklyAssessmentBuckets([entry({ date: "2026-01-07" })]);
    const start = Date.parse(`${buckets[0].weekStart}T00:00:00Z`);
    const member = Date.parse("2026-01-07T00:00:00Z");
    expect(start).toBeLessThanOrEqual(member);
    expect(member - start).toBeLessThanOrEqual(7 * DAY_MS);
  });

  it("groups a Sunday with the same local Monday as weekStartIso", () => {
    // 2026-08-09 is a Sunday. UTC toISOString().slice(0, 10) can land on
    // Saturday in TZ east of UTC; domain weekStartIso is local Monday.
    const buckets = weeklyAssessmentBuckets([entry({ date: "2026-08-09" })]);
    expect(buckets).toHaveLength(1);
    expect(buckets[0].weekStart).toBe(weekStartIso(new Date("2026-08-09T00:00:00")));
  });

  it("skips entries with no date", () => {
    expect(weeklyAssessmentBuckets([entry({ date: "" })])).toEqual([]);
  });

  it("accumulates qualifying counts across buckets", () => {
    const buckets = weeklyAssessmentBuckets([
      entry({ date: "2026-01-06", qualifyingDemonstratedLevel: "L1" }),
      entry({ date: "2026-01-13", qualifyingDemonstratedLevel: "L2" }),
      entry({ date: "2026-01-20", qualifyingDemonstratedLevel: "" }),
    ]);
    expect(cumulativeQualifying(buckets)).toEqual([1, 2, 2]);
  });

  it("returns an empty running total for no buckets", () => {
    expect(cumulativeQualifying([])).toEqual([]);
  });
});

describe("buildRoleLevelMatrix", () => {
  it("emits one row per matrix role under the ALL filter", () => {
    const m = buildRoleLevelMatrix([], "ALL");
    expect(m.rows.map((r) => r.role)).toEqual(MATRIX_ROLES);
    expect(m.rows.every((r) => r.total === 0 && r.best === null)).toBe(true);
  });

  it("marks the highest level reached as best and counts each cell", () => {
    const m = buildRoleLevelMatrix(
      [
        entry({ primaryRole: "SWE", qualifyingDemonstratedLevel: "L1" }),
        entry({ primaryRole: "SWE", qualifyingDemonstratedLevel: "L2" }),
        entry({ primaryRole: "SWE", qualifyingDemonstratedLevel: "L2" }),
      ],
      "SWE",
    );
    const row = m.rows[0];
    expect(row.total).toBe(3);
    expect(row.best).toBe("L2");
    expect(row.cells.L1).toEqual({ count: 1, isBest: false });
    expect(row.cells.L2).toEqual({ count: 2, isBest: true });
    expect(row.cells.L3).toEqual({ count: 0, isBest: false });
  });

  it("excludes entries that never reached a qualifying level", () => {
    const m = buildRoleLevelMatrix(
      [entry({ primaryRole: "SWE", qualifyingDemonstratedLevel: "" })],
      "SWE",
    );
    expect(m.rows[0].total).toBe(0);
    expect(m.rows[0].best).toBeNull();
  });
});

describe("performanceSummary", () => {
  it("summarises counts, averages and rates over the filtered set", () => {
    const s = performanceSummary([
      entry({ finalScore: 80, qualifyingDemonstratedLevel: "L2" }),
      entry({ finalScore: 70, qualifyingDemonstratedLevel: "L1" }),
      entry({ finalScore: 60, qualifyingDemonstratedLevel: "" }),
    ]);
    expect(s.graded).toBe(3);
    expect(s.avgFinal).toBe(70);
    expect(s.passRate).toBe(67); // 2 of 3 at >= 70
    expect(s.qualifyingRate).toBe(67);
    expect(s.bestLevel).toEqual({ L1: 1, L2: 1, L3: 0, none: 1 });
  });

  it("holds the trend at null until two full five-grade windows exist", () => {
    const nine = Array.from({ length: 9 }, (_, i) =>
      entry({ date: `2026-01-${String(i + 1).padStart(2, "0")}`, finalScore: 70 }),
    );
    expect(performanceSummary(nine).trend).toBeNull();

    const ten = [...nine, entry({ date: "2026-01-10", finalScore: 70 })];
    expect(performanceSummary(ten).trend).toBe(0);
  });

  it("computes the trend as trailing five minus the prior five", () => {
    const dates = Array.from({ length: 10 }, (_, i) => `2026-01-${String(i + 1).padStart(2, "0")}`);
    const es = dates.map((date, i) => entry({ date, finalScore: i < 5 ? 60 : 80 }));
    expect(performanceSummary(es).trend).toBe(20);
  });

  it("reports zero rates and a null average for an empty set", () => {
    const s = performanceSummary([]);
    expect(s).toMatchObject({ graded: 0, avgFinal: null, trend: null, qualifyingRate: 0, passRate: 0 });
  });

  it("covers every task type, including ones with no entries", () => {
    const s = performanceSummary([entry({ taskType: "coding" })]);
    expect(s.coverage).toHaveLength(RD.taskTypes.length);
    expect(s.coverage.find((c) => c.taskType === "coding")!.count).toBe(1);
    expect(s.coverage.find((c) => c.taskType === "sysdesign")!.count).toBe(0);
  });
});

describe("skillAreaAverages / domainAverages", () => {
  it("ranks task types by average final score, hiding the empty ones", () => {
    const stats = skillAreaAverages([
      entry({ taskType: "coding", finalScore: 60 }),
      entry({ taskType: "sysdesign", finalScore: 90 }),
    ]);
    expect(stats.map((s) => s.taskType)).toEqual(["sysdesign", "coding"]);
    expect(stats.map((s) => s.avgFinal)).toEqual([90, 60]);
  });

  it("ranks domains by entry count and applies the topN cap", () => {
    const stats = domainAverages(
      [
        entry({ primaryDomain: "SQL", finalScore: 80 }),
        entry({ primaryDomain: "SQL", finalScore: 60 }),
        entry({ primaryDomain: "React", finalScore: 90 }),
      ],
      "ALL",
      1,
    );
    expect(stats).toEqual([{ domain: "SQL", avg: 70, count: 2 }]);
  });

  it("ignores entries with no domain or no numeric score", () => {
    expect(domainAverages([entry({ primaryDomain: "" }), entry({ finalScore: null as never })])).toEqual([]);
  });
});

describe("buildGapBoard", () => {
  it("scopes the board to the role filter before delegating to the rubric package", () => {
    const board = buildGapBoard(
      [
        entry({ primaryRole: "SWE", gapClosureStatus: { status: "open" } as never, gapTypes: ["Mechanism gap"] }),
        entry({ primaryRole: "DE", gapClosureStatus: { status: "open" } as never, gapTypes: ["Recall gap"] }),
      ],
      "SWE",
    );
    expect(board.columns[0].items).toHaveLength(1);
    expect(board.gapTypeCounts).toEqual([{ type: "Mechanism gap", count: 1 }]);
  });
});

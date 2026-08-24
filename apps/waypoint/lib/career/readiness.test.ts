/**
 * Pins the model decisions the Career surface must not be able to change on its own.
 *
 * Regression class:
 *   1. The ranked queue widening past the declared target role, which is how Red Team
 *      — an exploratory role whose weights have no §9.3 row — got into a DS queue once.
 *   2. The BI collapse inventing a merged weight profile the spec never states.
 *   3. The routing summary going quiet about evidence that never reached the graph,
 *      or about the fact that no real entry carries a direct competency tag.
 *
 * Every `asOf` is a literal — no clock is read anywhere in this file.
 */

import { describe, expect, it } from "vitest";

import type { RubricEntry } from "@waypoint/rubric";

import {
  A_ROLE,
  BI_GROUP,
  buildCareerReadiness,
  collapseBi,
  isLocallyCalibrated,
  summariseRouting,
} from "./readiness";

const ASOF = "2026-08-24";

let seq = 0;
function entry(over: Partial<RubricEntry> = {}): RubricEntry {
  seq += 1;
  return {
    id: `e${seq}`,
    assessmentId: `e${seq}`,
    date: ASOF,
    task: `task ${seq}`,
    taskType: "analyticsCase",
    domain: "",
    primaryDomain: "Statistical Analysis",
    primaryRole: "DS",
    finalScore: 78,
    qualifyingDemonstratedLevel: "",
    levelScores: { L1: null, L2: null, L3: null },
    gates: {},
    knowledgeGapTags: [],
    gapTypes: [],
    ...over,
  } as unknown as RubricEntry;
}

const ENTRIES: RubricEntry[] = [
  entry({ id: "a1", taskType: "analyticsCase", primaryDomain: "Statistical Analysis", finalScore: 82 }),
  entry({ id: "a2", taskType: "analyticsCase", primaryDomain: "Data Analysis", finalScore: 66 }),
  entry({ id: "a3", taskType: "coding", primaryDomain: "SQL", finalScore: 74, date: "2026-06-02" }),
  entry({ id: "a4", taskType: "sysdesign", primaryDomain: "Data Engineering", finalScore: 71, date: "2026-05-10" }),
];

describe("buildCareerReadiness", () => {
  const view = buildCareerReadiness(ENTRIES, ASOF);

  it("targets the declared A role and nothing else", () => {
    expect(A_ROLE).toBe("ds");
    expect(view.target.role).toBe("ds");
  });

  it("scopes every ranked action to the target role", () => {
    expect(view.actions.length).toBeGreaterThan(0);
    expect(view.actions.every((a) => a.role === A_ROLE)).toBe(true);
  });

  it("never lets an exploratory role's competencies into the queue", () => {
    const ids = view.actions.map((a) => a.competency);
    for (const rt of ["recon", "exploitation", "hypothesis-formation", "scope-discipline"]) {
      expect(ids, rt).not.toContain(rt);
    }
  });

  it("reports gaps as unproven dimensions, not as every dimension", () => {
    expect(view.target.gaps.length).toBeLessThanOrEqual(view.target.dimensions.length);
    for (const g of view.target.gaps) expect(g.status, g.competency).not.toBe("established");
    // `priorities` remains the complete worklist.
    expect(view.target.priorities.length).toBe(view.target.dimensions.length);
  });

  it("keeps warm and exploratory roles inspectable but out of the queue", () => {
    expect(view.warm.map((r) => r.role)).toEqual(["de", "swe", "mle"]);
    expect(view.exploratory.map((r) => r.role)).toEqual(["redteam"]);
    expect(view.actions.every((a) => a.role !== "redteam")).toBe(true);
  });

  it("ignores role filtering — the graph is built from every entry", () => {
    const mixed = [...ENTRIES, entry({ id: "z1", primaryRole: "SWE", taskType: "coding", finalScore: 90 })];
    const wider = buildCareerReadiness(mixed, ASOF);
    expect(wider.routing.total).toBe(mixed.length);
    expect(wider.routing.total).toBeGreaterThan(view.routing.total);
  });

  it("is deterministic for the same inputs", () => {
    const again = buildCareerReadiness(ENTRIES, ASOF);
    expect(JSON.stringify(again.target)).toBe(JSON.stringify(view.target));
    expect(JSON.stringify(again.actions)).toBe(JSON.stringify(view.actions));
  });
});

describe("routing summary", () => {
  it("accounts for every entry handed in", () => {
    const view = buildCareerReadiness(ENTRIES, ASOF);
    expect(view.routing.routed + view.routing.unrouted.length).toBe(ENTRIES.length);
    expect(view.routing.total).toBe(ENTRIES.length);
  });

  it("flags that real entries carry no direct competency tags", () => {
    // The adapter never populates `competencies` (adapter.ts:86-131), so nothing
    // routes at direct strength. The view depends on this being surfaced, not hidden.
    const view = buildCareerReadiness(ENTRIES, ASOF);
    expect(view.routing.hasDirectEvidence).toBe(false);
    expect(view.routing.channelCounts.direct).toBe(0);
    expect(view.routing.channelCounts.taskType + view.routing.channelCounts.domain)
      .toBeGreaterThan(0);
  });

  it("names each unrouted entry with a countable reason", () => {
    const withDrops = [
      ...ENTRIES,
      entry({ id: "u1", finalScore: undefined as unknown as number }),
      entry({ id: "u2", taskType: "", primaryDomain: "Nonsense Domain" }),
    ];
    const view = buildCareerReadiness(withDrops, ASOF);
    const ids = view.routing.unrouted.map((u) => u.evidenceId);
    expect(ids).toContain("u1");
    expect(ids).toContain("u2");
    const counted = Object.values(view.routing.byReason).reduce((a, b) => a + b, 0);
    expect(counted).toBe(view.routing.unrouted.length);
  });

  it("counts an attempt once per channel, not once per competency reached", () => {
    // One broad domain tag reaches several competencies; that is one piece of
    // evidence, not several, and breadth must not be inflated by it.
    const one = buildCareerReadiness([entry({ id: "solo", taskType: "", primaryDomain: "Machine Learning" })], ASOF);
    const total =
      one.routing.channelCounts.direct +
      one.routing.channelCounts.taskType +
      one.routing.channelCounts.domain;
    expect(total).toBe(1);
  });

  it("handles an empty store without inventing anything", () => {
    const view = buildCareerReadiness([], ASOF);
    expect(view.routing.total).toBe(0);
    expect(view.routing.routed).toBe(0);
    expect(view.routing.unrouted).toEqual([]);
    expect(view.target.score).toBeNull();
    expect(view.target.band).toBe("no-evidence");
    expect(summariseRouting(view.graph, 0).hasDirectEvidence).toBe(false);
  });
});

describe("BI collapse", () => {
  const view = buildCareerReadiness(ENTRIES, ASOF);

  it("keeps both roles distinct rather than merging them", () => {
    expect(view.bi.roles.map((r) => r.role)).toEqual(BI_GROUP);
    expect(BI_GROUP).toEqual(["bie", "bia"]);
  });

  it("shows one weight column per role and never averages them", () => {
    for (const row of view.bi.rows) {
      expect(row.weights.length, row.competency).toBe(BI_GROUP.length);
    }
    // sql-reasoning is 25 in both §9.3 profiles; semantic-modeling differs (20 vs 15).
    const semantic = view.bi.rows.find((r) => r.competency === "semantic-modeling");
    expect(semantic?.weights).toEqual([20, 15]);
  });

  it("marks a competency absent from one profile as null, not zero", () => {
    const stats = view.bi.rows.find((r) => r.competency === "statistical-reasoning");
    // BIA weights descriptive statistics at 10; BIE's profile omits it entirely.
    expect(stats?.weights[0]).toBeNull();
    expect(stats?.weights[1]).toBe(10);
  });

  it("shares graph-level facts across the two columns", () => {
    const g = view.graph;
    for (const row of view.bi.rows) {
      expect(row.score, row.competency).toBe(g.nodes[row.competency].score);
      expect(row.confidence, row.competency).toBe(g.nodes[row.competency].confidence);
    }
  });

  it("orders rows deterministically by heaviest unmet weight", () => {
    const a = collapseBi(view.graph).rows.map((r) => r.competency);
    const b = collapseBi(view.graph).rows.map((r) => r.competency);
    expect(b).toEqual(a);
  });
});

describe("spec provenance", () => {
  it("flags exactly the roles whose weights are a local calibration", () => {
    expect(isLocallyCalibrated("redteam")).toBe(true);
    for (const r of ["ds", "de", "swe", "mle", "bie", "bia"] as const) {
      expect(isLocallyCalibrated(r), r).toBe(false);
    }
  });
});

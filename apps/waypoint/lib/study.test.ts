/**
 * INT-020 — pin parseGuide grounding against validRepIds.
 * Ghost qbank ids are dropped; digest-known ids are kept.
 * Empty learn + empty week still returns null.
 */

import { describe, expect, it } from "vitest";
import { parseGuide, type StudyDigest } from "./study";

function digest(over: Partial<StudyDigest> = {}): StudyDigest {
  return {
    role: "SWE",
    gradeCount: 0,
    misses: [],
    weakDomains: [],
    retrainCards: [],
    dueRetests: [],
    defenseStories: [],
    qbankCandidates: [],
    ...over,
  };
}

const known = digest({ qbankCandidates: [{ id: "qb-known", q: "what is a window frame?" }] });

describe("parseGuide grounding", () => {
  it("drops a ghost qbank id", () => {
    const guide = parseGuide(
      JSON.stringify({
        learn: [
          {
            title: "Window frames",
            why: "recurring miss cluster",
            reps: [{ kind: "qbank", id: "ghost" }],
          },
        ],
        week: [{ id: "w1", text: "review window frames" }],
      }),
      known,
    );
    expect(guide?.learn[0]?.reps).toEqual([]);
  });

  it("keeps a qbank id present in the digest", () => {
    const guide = parseGuide(
      JSON.stringify({
        learn: [
          {
            title: "Window frames",
            why: "recurring miss cluster",
            reps: [{ kind: "qbank", id: "qb-known", label: "window frames" }],
          },
        ],
        week: [{ id: "w1", text: "review window frames" }],
      }),
      known,
    );
    expect(guide?.learn[0]?.reps).toEqual([
      { kind: "qbank", id: "qb-known", label: "window frames" },
    ]);
  });

  it("returns null for all-ghost learn and empty week", () => {
    // No title/why → learn filtered out; same !learn.length && !week.length as today.
    const guide = parseGuide(
      JSON.stringify({
        learn: [{ reps: [{ kind: "qbank", id: "ghost" }] }],
        week: [],
      }),
      known,
    );
    expect(guide).toBeNull();
  });
});

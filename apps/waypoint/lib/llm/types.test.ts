/**
 * The provider parse boundary. `parseObservations` is where an untrusted model
 * response becomes a typed `Observations`; every adapter (anthropic/openai/grok/
 * gemini) funnels through it. Structured output is a request, not a guarantee, so
 * a degraded response must fail here — loudly and attributably — rather than
 * arriving downstream as a well-formed all-zero grade.
 */

import { describe, expect, it } from "vitest";

import { ObservationsValidationError, RD } from "@waypoint/rubric";
import { parseObservations, userContent } from "./types";

const subs = () => Object.fromEntries(RD.universalDims.map((d) => [d.id, d.max]));

/** A response that satisfies OBSERVATIONS_JSON_SCHEMA in full. */
function compliant(): Record<string, unknown> {
  return {
    universalSubScores: subs(),
    levelScores: { L1: 88, L2: 74, L3: 60 },
    taskSpecificScore: 80,
    gates: [{ gate: RD.gates[0].gate, verdict: "Pass" }],
    gapTypes: [],
    knowledgeGapTags: [],
    weaknessTags: [],
    severity: "Low",
    nextActionType: "retest",
    strengths: "s",
    weaknesses: "w",
    surviveProbing: "p",
    calibrationConfidence: "High",
    scoreUncertainty: { range: [75, 85], reason: "r" },
    proposedNewTags: [],
  };
}

describe("parseObservations", () => {
  it("parses a compliant response", () => {
    const o = parseObservations(JSON.stringify(compliant()));
    expect(o.taskSpecificScore).toBe(80);
    expect(o.levelScores.L2).toBe(74);
  });

  it("still tolerates prose wrapped around the JSON object", () => {
    const o = parseObservations(`Here is the grade:\n${JSON.stringify(compliant())}\nHope that helps.`);
    expect(o.levelScores.L1).toBe(88);
  });

  it("throws a named error when the response is not JSON at all", () => {
    expect(() => parseObservations("I'm sorry, I can't grade that.")).toThrow(ObservationsValidationError);
  });

  it("throws on an empty response instead of returning undefined", () => {
    expect(() => parseObservations("")).toThrow(ObservationsValidationError);
  });

  it("REJECTS a partial response that would otherwise score as a real all-zero grade", () => {
    const partial = compliant();
    delete partial.universalSubScores;
    let caught: unknown;
    try {
      parseObservations(JSON.stringify(partial));
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(ObservationsValidationError);
    expect((caught as ObservationsValidationError).issues).toContain(
      "observations.universalSubScores: required property is absent",
    );
  });

  it("rejects a truncated sub-score block (one dimension short)", () => {
    const partial = compliant();
    const dims = subs();
    delete dims[RD.universalDims[RD.universalDims.length - 1].id];
    partial.universalSubScores = dims;
    expect(() => parseObservations(JSON.stringify(partial))).toThrow(ObservationsValidationError);
  });

  it("lets an off-vocabulary enum value through — the intake coerces those, ADR-0004 §5", () => {
    const odd = compliant();
    odd.severity = "Catastrophic";
    expect(parseObservations(JSON.stringify(odd)).severity).toBe("Catastrophic");
  });

  it("carries a diagnosable message a caller can put in front of a human", () => {
    let caught: unknown;
    try {
      parseObservations("{ not json");
    } catch (err) {
      caught = err;
    }
    expect((caught as Error | undefined)?.name).toBe("ObservationsValidationError");
    expect((caught as Error | undefined)?.message).toContain("was not JSON");
  });
});

describe("userContent", () => {
  it("appends a correction note only on a retry", () => {
    expect(userContent({ system: "s", user: "u" })).toBe("u");
    expect(userContent({ system: "s", user: "u", retryNote: "fix it" })).toContain("[CORRECTION] fix it");
  });
});

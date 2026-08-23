/**
 * INT-021 — pin the probe and debrief reply parsers as they run today.
 * FOLLOWUP: DONE / DONE. is no probe; garbage or brace-less debrief is null.
 */

import { describe, expect, it } from "vitest";
import { parseDebriefReply, parseProbeReply } from "./prompt";

const FENCED_DEBRIEF = `Here you go:
\`\`\`json
{
  "headline": "Solid fundamentals, thin on tradeoffs",
  "overall": "L1 cleared cleanly. Focus next on the why behind the data structure.",
  "levels": [
    {
      "level": 1,
      "verdict": "Cleared comfortably.",
      "good": "Named chaining and treeify.",
      "improve": "Did not mention load factor.",
      "next": "Walk through a resize with numbers."
    }
  ]
}
\`\`\``;

describe("parseProbeReply", () => {
  it.each([
    {
      name: "FOLLOWUP: DONE → probe is null",
      raw: "FEEDBACK: Solid, that holds up.\nFOLLOWUP: DONE",
      feedback: "Solid, that holds up.",
      probe: null,
    },
    {
      name: "FOLLOWUP: DONE. → probe is null",
      raw: "FEEDBACK: Not fully there yet.\nFOLLOWUP: DONE.",
      feedback: "Not fully there yet.",
      probe: null,
    },
    {
      name: "FEEDBACK + FOLLOWUP question → probe is that question",
      raw: "FEEDBACK: Solid, that holds up.\nFOLLOWUP: Why does the load factor trigger a resize?",
      feedback: "Solid, that holds up.",
      probe: "Why does the load factor trigger a resize?",
    },
  ])("$name", ({ raw, feedback, probe }) => {
    expect(parseProbeReply(raw)).toEqual({ feedback, probe });
  });
});

describe("parseDebriefReply", () => {
  it.each([
    { name: "{not json} → null", raw: "{not json}", want: null },
    { name: "empty → null", raw: "", want: null },
    { name: "no braces → null", raw: "just prose, no object", want: null },
    {
      name: "fenced JSON with headline/overall/levels → parsed object",
      raw: FENCED_DEBRIEF,
      want: {
        headline: "Solid fundamentals, thin on tradeoffs",
        overall: "L1 cleared cleanly. Focus next on the why behind the data structure.",
        levels: [
          {
            level: 1,
            verdict: "Cleared comfortably.",
            good: "Named chaining and treeify.",
            improve: "Did not mention load factor.",
            next: "Walk through a resize with numbers.",
          },
        ],
      },
    },
  ])("$name", ({ raw, want }) => {
    expect(parseDebriefReply(raw)).toEqual(want);
  });
});

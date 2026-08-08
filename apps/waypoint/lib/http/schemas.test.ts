/**
 * WP-C08 — per-route body parsers. Each case below is an input the routes
 * previously accepted by casting (or turned into a 500 deep in the DB/prompt
 * layer); it must now be a clean 4xx. The "still accepted" cases pin the other
 * direction: what works today must keep working.
 */

import { describe, expect, it } from "vitest";
import type { ParseResult } from "./parse";
import {
  parseInterviewBody,
  parseObservationContext,
  parseStateBody,
  parseStudyBody,
} from "./schemas";

/** Unwrap without branching, so every assertion below runs unconditionally. */
const valueOf = <T>(r: ParseResult<T>): T | null => (r.ok ? r.value : null);

const CTX = {
  task: "Explain hash map collisions",
  date: "2026-08-08",
  taskType: "knowledge",
  domain: "Java",
  primaryRole: "SWE",
  problemLevel: "L2",
  difficulty: 2,
  questionSource: "qbank",
  assessmentMode: "mock interview",
  followUpsAsked: 1,
  coached: false,
};

/** What AIMockPanel actually posts for a grade turn (AIMockPanel.tsx:495-513). */
const LIVE_GRADE_BODY = {
  action: "grade",
  provider: "anthropic",
  ctx: CTX,
  question: "How does a HashMap resolve collisions?",
  answer: "Chaining, then treeify past a threshold.",
  probingTranscript: "Q: and resizing? A: rehash at load factor.",
};

describe("parseObservationContext", () => {
  it("accepts the context the live client sends", () => {
    const res = parseObservationContext(CTX);
    expect(res.ok).toBe(true);
    expect(valueOf(res)).toMatchObject({ primaryRole: "SWE", questionSource: "qbank" });
  });

  it("rejects an empty object — the truthiness check that let anything through", () => {
    const res = parseObservationContext({});
    expect(res.ok).toBe(false);
  });

  it("rejects an off-vocabulary role / taskType / level before it reaches the entry", () => {
    expect(parseObservationContext({ ...CTX, primaryRole: "WIZARD" }).ok).toBe(false);
    expect(parseObservationContext({ ...CTX, taskType: "vibes" }).ok).toBe(false);
    expect(parseObservationContext({ ...CTX, problemLevel: "L9" }).ok).toBe(false);
  });

  it("rejects a non-ISO date and an out-of-range difficulty", () => {
    expect(parseObservationContext({ ...CTX, date: "yesterday" }).ok).toBe(false);
    expect(parseObservationContext({ ...CTX, difficulty: 99 }).ok).toBe(false);
    expect(parseObservationContext({ ...CTX, difficulty: "2" }).ok).toBe(false);
  });

  it("rejects an unknown assessmentMode rather than persisting it", () => {
    expect(parseObservationContext({ ...CTX, assessmentMode: "telepathy" }).ok).toBe(false);
  });

  it("drops fields it does not know instead of passing them into the record", () => {
    const res = parseObservationContext({ ...CTX, evilExtra: "<script>", graderModel: "spoofed" });
    expect(res.ok).toBe(true);
    expect(Object.keys(valueOf(res) ?? {})).not.toContain("evilExtra");
    expect(Object.keys(valueOf(res) ?? {})).not.toContain("graderModel");
  });
});

describe("parseInterviewBody", () => {
  it("accepts the live grade body and narrows it", () => {
    const res = parseInterviewBody(LIVE_GRADE_BODY);
    expect(res.ok).toBe(true);
    expect(valueOf(res)).toMatchObject({
      action: "grade",
      question: LIVE_GRADE_BODY.question,
      answer: LIVE_GRADE_BODY.answer,
      probingTranscript: LIVE_GRADE_BODY.probingTranscript,
    });
  });

  it("defaults a missing action to grade (unchanged behaviour)", () => {
    const { action: _action, ...noAction } = LIVE_GRADE_BODY;
    const res = parseInterviewBody(noAction);
    expect(res.ok && res.value.action).toBe("grade");
  });

  it("rejects a grade with a junk ctx that used to sail through the truthiness check", () => {
    const res = parseInterviewBody({ ...LIVE_GRADE_BODY, ctx: { anything: true } });
    expect(res.ok).toBe(false);
  });

  it("rejects an unknown provider and an unknown action", () => {
    expect(parseInterviewBody({ ...LIVE_GRADE_BODY, provider: "skynet" }).ok).toBe(false);
    expect(parseInterviewBody({ ...LIVE_GRADE_BODY, action: "delete" }).ok).toBe(false);
    expect(parseInterviewBody({ ...LIVE_GRADE_BODY, provider: undefined }).ok).toBe(false);
  });

  it("keeps the per-action required-field checks the route used to do", () => {
    expect(parseInterviewBody({ provider: "openai", action: "question", role: "SWE" }).ok).toBe(false);
    expect(parseInterviewBody({ provider: "openai", action: "probe" }).ok).toBe(false);
    expect(parseInterviewBody({ provider: "openai", action: "debrief", session: [] }).ok).toBe(false);
    expect(
      parseInterviewBody({ provider: "openai", action: "question", role: "SWE", domain: "Java" }).ok,
    ).toBe(true);
  });

  it("rejects a mistyped level/avoid instead of handing them to the prompt builder", () => {
    expect(
      parseInterviewBody({ provider: "openai", action: "question", role: "r", domain: "d", level: 7 }).ok,
    ).toBe(false);
    expect(
      parseInterviewBody({ provider: "openai", action: "question", role: "r", domain: "d", avoid: "nope" }).ok,
    ).toBe(false);
  });

  it("rejects a debrief session whose levels are not 1|2|3", () => {
    const res = parseInterviewBody({
      provider: "openai",
      action: "debrief",
      session: [{ level: 4, finalScore: 10, question: "q", answer: "a" }],
    });
    expect(res.ok).toBe(false);
  });

  it("accepts a well-formed debrief session", () => {
    const res = parseInterviewBody({
      provider: "openai",
      action: "debrief",
      session: [{ level: 1, finalScore: 72, passed: true, question: "q", answer: "a" }],
    });
    expect(res.ok).toBe(true);
    expect((valueOf(res) as { session?: unknown[] } | null)?.session).toHaveLength(1);
  });
});

describe("parseStudyBody", () => {
  const digest = {
    role: "SWE",
    gradeCount: 3,
    misses: [],
    weakDomains: [],
    retrainCards: [],
    dueRetests: [],
    defenseStories: [],
    qbankCandidates: [],
  };

  it("accepts a well-formed digest", () => {
    expect(parseStudyBody({ provider: "openai", digest }).ok).toBe(true);
  });

  it("rejects a digest missing a list the prompt builder walks (was a 500)", () => {
    const { qbankCandidates: _q, ...partial } = digest;
    expect(parseStudyBody({ provider: "openai", digest: partial }).ok).toBe(false);
  });

  it("rejects a non-object digest and an unknown provider", () => {
    expect(parseStudyBody({ provider: "openai", digest: "everything" }).ok).toBe(false);
    expect(parseStudyBody({ provider: "hal9000", digest }).ok).toBe(false);
  });
});

describe("parseStateBody", () => {
  const slice = {
    phase: "B",
    roleFilter: "ALL",
    rhythmDays: { "2026-08-08": { date: "2026-08-08", slots: { practice: true, defense: false, interview: false, admin: false } } },
    weeklyReviews: { "2026-08-03": { weekStart: "2026-08-03", done: false } },
    problems: [{ id: "p1", title: "Two Sum", tier: "core", pattern: "hash", status: "todo" }],
    fileDefense: [{ id: "f1", title: "t", why: "w", terminology: "t", interviewLine: "l" }],
    rubricEntries: [{ id: "e1", date: "2026-08-08", finalScore: 71 }],
    qbankStatus: { "swe-1": "mastered" },
    qbankPos: { track: "swe", idx: 3 },
    qbankOrder: {},
    studyGuides: {},
    applications: [{ id: "a1", company: "ACME", roleTitle: "SWE" }],
    solidInterviewLogs: { SWE_FS_II: [], MLE_II: [] },
    mockSeq: 2,
    mockAsked: ["q"],
    lastUpdated: "2026-08-08T10:00:00.000Z",
    __authoritative: true,
  };

  it("accepts the slice the live client saves", () => {
    const res = parseStateBody(slice);
    expect(res.ok).toBe(true);
    expect(valueOf(res)).toMatchObject({ __authoritative: true });
  });

  it("accepts a slice with the optional metadata omitted (upsert-only saves)", () => {
    const { phase: _p, mockSeq: _m, studyGuides: _s, lastUpdated: _l, ...lean } = slice;
    expect(parseStateBody(lean).ok).toBe(true);
  });

  it("rejects a body that is not an object — the sole write path took anything", () => {
    expect(parseStateBody("wipe").ok).toBe(false);
    expect(parseStateBody(null).ok).toBe(false);
    expect(parseStateBody([]).ok).toBe(false);
  });

  it("rejects a slice missing a collection saveState iterates (was a 500)", () => {
    const { rubricEntries: _r, ...noEntries } = slice;
    expect(parseStateBody(noEntries).ok).toBe(false);
    const { qbankStatus: _q, ...noQbank } = slice;
    expect(parseStateBody(noQbank).ok).toBe(false);
  });

  it("rejects a collection of the wrong container type", () => {
    expect(parseStateBody({ ...slice, rubricEntries: {} }).ok).toBe(false);
    expect(parseStateBody({ ...slice, rhythmDays: [] }).ok).toBe(false);
  });

  it("rejects rows that would hit the DB without a primary key", () => {
    expect(parseStateBody({ ...slice, rubricEntries: [{ date: "2026-08-08" }] }).ok).toBe(false);
    expect(parseStateBody({ ...slice, applications: [null] }).ok).toBe(false);
    expect(
      parseStateBody({ ...slice, rhythmDays: { x: { slots: {} } } }).ok,
    ).toBe(false);
  });

  it("rejects mistyped metadata that lands verbatim in wp_app_meta", () => {
    expect(parseStateBody({ ...slice, phase: "Z" }).ok).toBe(false);
    expect(parseStateBody({ ...slice, mockSeq: "two" }).ok).toBe(false);
    expect(parseStateBody({ ...slice, qbankPos: "swe" }).ok).toBe(false);
    expect(parseStateBody({ ...slice, __authoritative: "yes" }).ok).toBe(false);
  });

  it("does not touch the interior of a rubric entry (no silent data loss)", () => {
    const entry = { id: "e1", date: "2026-08-08", diagnostic: { deep: { nested: [1, 2] } } };
    const res = parseStateBody({ ...slice, rubricEntries: [entry] });
    expect(res.ok).toBe(true);
    expect(valueOf(res)?.rubricEntries[0]).toBe(entry as never);
  });
});

/**
 * WP-C08 at the route level: the handlers themselves must refuse a body they
 * cannot parse, and must not reach their side effect (saveState / the provider)
 * on the way. These are the regressions that fail against the pre-fix routes,
 * where `(await req.json()) as SomeBody` meant a malformed body sailed through
 * to the database or the grader.
 *
 * The routes live under app/api/**, which this lane owns; the test file lives
 * beside the shared parsing module it exercises.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { KGTAG_CLUSTERS } from "@waypoint/rubric";

const saveState = vi.fn<(slice: unknown, authoritative?: boolean) => Promise<{ lastUpdated: string }>>(
  async () => ({ lastUpdated: "2026-08-08T00:00:00.000Z" }),
);
const loadState = vi.fn<() => Promise<{ empty: boolean }>>(async () => ({ empty: true }));
vi.mock("@/lib/db/state", () => ({ saveState, loadState }));
vi.mock("@/lib/db/ensure", () => ({ default: async () => {} }));

const gradeToEntry = vi.fn<(...args: unknown[]) => Promise<unknown>>();
const complete = vi.fn<() => Promise<string>>(async () => "ok");
vi.mock("@/lib/llm", () => ({
  availableProviders: () => ["anthropic", "openai"],
  getProvider: () => ({
    id: "anthropic",
    model: "test-model-1",
    grade: vi.fn<() => Promise<unknown>>(),
    complete,
  }),
  gradeToEntry,
}));

const { PUT } = await import("@/app/api/state/route");
const { POST: interviewPOST } = await import("@/app/api/interview/route");

function stateReq(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/state", {
    method: "PUT",
    headers: { "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function interviewReq(body: unknown): Request {
  return new Request("http://localhost/api/interview", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const SLICE = {
  phase: "B",
  roleFilter: "ALL",
  rhythmDays: {},
  weeklyReviews: {},
  problems: [],
  fileDefense: [],
  rubricEntries: [{ id: "e1", date: "2026-08-08", finalScore: 71 }],
  qbankStatus: {},
  qbankPos: { track: "swe", idx: 0 },
  qbankOrder: {},
  studyGuides: {},
  applications: [],
  solidInterviewLogs: { SWE_FS_II: [], MLE_II: [] },
  mockSeq: 0,
  mockAsked: [],
  lastUpdated: "2026-08-08T00:00:00.000Z",
};

const CTX = {
  task: "Explain hash map collisions",
  date: "2026-08-08",
  taskType: "knowledge",
  domain: "Java",
  primaryRole: "SWE",
  problemLevel: "L2",
  difficulty: 2,
  questionSource: "qbank",
};

beforeEach(() => {
  saveState.mockClear();
  gradeToEntry.mockClear();
  complete.mockClear();
});

describe("PUT /api/state", () => {
  it("still persists a valid slice, authoritative flag included", async () => {
    const res = await PUT(stateReq({ ...SLICE, __authoritative: true }));
    expect(res.status).toBe(200);
    expect(saveState).toHaveBeenCalledTimes(1);
    expect(saveState.mock.calls[0][1]).toBe(true);
  });

  it("treats a slice without the flag as non-authoritative (upsert-only)", async () => {
    const res = await PUT(stateReq(SLICE));
    expect(res.status).toBe(200);
    expect(saveState.mock.calls[0][1]).toBe(false);
  });

  it("400s a malformed slice and never reaches the database", async () => {
    const { rubricEntries: _r, ...noEntries } = SLICE;
    const res = await PUT(stateReq(noEntries));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "missing_fields", kind: "client_input" });
    expect(saveState).not.toHaveBeenCalled();
  });

  it("400s a non-object body on the sole write path", async () => {
    const res = await PUT(stateReq('"wipe"'));
    expect(res.status).toBe(400);
    expect(saveState).not.toHaveBeenCalled();
  });

  it("413s an oversized save instead of buffering it into the DB layer", async () => {
    const res = await PUT(stateReq(SLICE, { "content-length": String(64 * 1024 * 1024) }));
    expect(res.status).toBe(413);
    expect(saveState).not.toHaveBeenCalled();
  });

  it("400s invalid JSON with the pre-existing code", async () => {
    const res = await PUT(stateReq("{oops"));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "invalid_json" });
  });
});

describe("POST /api/interview", () => {
  it("still grades a well-formed turn", async () => {
    gradeToEntry.mockResolvedValueOnce({ entry: { id: "e1" }, monotonicOk: true, flagged: false, droppedTags: [] });
    const res = await interviewPOST(
      interviewReq({ provider: "anthropic", action: "grade", ctx: CTX, question: "q", answer: "a" }),
    );
    expect(res.status).toBe(200);
    expect(gradeToEntry).toHaveBeenCalledTimes(1);
    // The context handed to the seam is the parsed one.
    expect(gradeToEntry.mock.calls[0][2]).toMatchObject({ primaryRole: "SWE", questionSource: "qbank" });
  });

  it("injects flattened KGTAG_CLUSTERS into the grade prompt when knownTags is omitted", async () => {
    gradeToEntry.mockResolvedValueOnce({ entry: { id: "e1" }, monotonicOk: true, flagged: false, droppedTags: [] });
    const res = await interviewPOST(
      interviewReq({ provider: "anthropic", action: "grade", ctx: CTX, question: "q", answer: "a" }),
    );
    expect(res.status).toBe(200);
    const input = gradeToEntry.mock.calls[0][1] as { system: string };
    const clusterMember = Object.values(KGTAG_CLUSTERS).flat()[0];
    expect(clusterMember).toBeTruthy();
    expect(input.system).toContain(clusterMember);
  });

  it("lets client-supplied non-empty knownTags win over KGTAG_CLUSTERS", async () => {
    gradeToEntry.mockResolvedValueOnce({ entry: { id: "e1" }, monotonicOk: true, flagged: false, droppedTags: [] });
    const res = await interviewPOST(
      interviewReq({
        provider: "anthropic",
        action: "grade",
        ctx: CTX,
        question: "q",
        answer: "a",
        knownTags: ["client-only-unique-tag-xyz"],
      }),
    );
    expect(res.status).toBe(200);
    const input = gradeToEntry.mock.calls[0][1] as { system: string };
    expect(input.system).toContain("client-only-unique-tag-xyz");
    expect(input.system).not.toContain(Object.values(KGTAG_CLUSTERS).flat()[0]);
  });

  it("400s a junk ctx and never calls the grader (was: any object was accepted)", async () => {
    const res = await interviewPOST(
      interviewReq({ provider: "anthropic", action: "grade", ctx: { junk: true }, question: "q", answer: "a" }),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ kind: "client_input" });
    expect(gradeToEntry).not.toHaveBeenCalled();
  });

  it("400s an unknown provider before touching the seam", async () => {
    const res = await interviewPOST(interviewReq({ provider: "skynet", action: "hint", transcript: "t" }));
    expect(res.status).toBe(400);
    expect(complete).not.toHaveBeenCalled();
  });

  it("400s a configured-but-unavailable provider with provider_unavailable", async () => {
    const res = await interviewPOST(interviewReq({ provider: "grok", action: "hint", transcript: "t" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "provider_unavailable" });
  });

  it("reports an unusable model response as 502 kind=model_response, not an opaque failure", async () => {
    // Cross-lane: packages/rubric/src/observations.ts:228 throws
    // ObservationsValidationError when the model breaks the emission contract.
    const err = new Error("Model observations failed the ADR-0004 emission contract (2 issues): …");
    err.name = "ObservationsValidationError";
    gradeToEntry.mockRejectedValueOnce(err);
    const res = await interviewPOST(
      interviewReq({ provider: "anthropic", action: "grade", ctx: CTX, question: "q", answer: "a" }),
    );
    expect(res.status).toBe(502);
    expect(await res.json()).toMatchObject({ error: "grade_failed", kind: "model_response" });
  });

  it("reports a provider failure as 502 kind=upstream", async () => {
    gradeToEntry.mockRejectedValueOnce(new Error("429 rate_limit_exceeded"));
    const res = await interviewPOST(
      interviewReq({ provider: "anthropic", action: "grade", ctx: CTX, question: "q", answer: "a" }),
    );
    expect(res.status).toBe(502);
    expect(await res.json()).toMatchObject({ kind: "upstream" });
  });

  it("reports our own fault as 500 kind=internal", async () => {
    gradeToEntry.mockRejectedValueOnce(new TypeError("x is not a function"));
    const res = await interviewPOST(
      interviewReq({ provider: "anthropic", action: "grade", ctx: CTX, question: "q", answer: "a" }),
    );
    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({ kind: "internal" });
  });
});

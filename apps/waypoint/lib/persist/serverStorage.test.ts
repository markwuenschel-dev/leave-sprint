/**
 * The save loop must not retry a rejection the server will never accept.
 *
 * Before this, serverStorage.flush() special-cased only 401 and let every other
 * non-2xx fall into the catch, which rescheduled at a 10s ceiling forever. Once
 * /api/state gained a 16MB body cap (lib/http/parse.ts:59-68 BODY_LIMITS.state)
 * and a real body parser (lib/http/schemas.ts:parseStateBody), a 413 or a 400
 * became permanently unsatisfiable — and therefore an infinite request loop.
 *
 * Two layers are covered: the pure status → class decision, and the observable
 * loop behaviour through the StateStorage surface with a mocked fetch.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { classifySaveFailure } from "./serverStorage";

describe("classifySaveFailure", () => {
  it("keeps 401 on its own auth path", () => {
    expect(classifySaveFailure(401)).toBe("auth");
  });

  it("treats the statuses /api/state can actually emit for a bad body as permanent", () => {
    // 413 ← lib/http/parse.ts:70-75 TOO_LARGE; 400 ← parse.ts:33 fail() default.
    expect(classifySaveFailure(413)).toBe("permanent");
    expect(classifySaveFailure(400)).toBe("permanent");
  });

  it("treats other non-retryable 4xx as permanent", () => {
    for (const s of [403, 404, 405, 409, 415, 422]) {
      expect(classifySaveFailure(s)).toBe("permanent");
    }
  });

  it("keeps the standard retry-after statuses transient", () => {
    for (const s of [408, 425, 429]) {
      expect(classifySaveFailure(s)).toBe("transient");
    }
  });

  it("keeps 5xx transient — a server fault can self-heal", () => {
    // route.ts:62 returns 500 save_failed for a DB/migration hiccup.
    for (const s of [500, 502, 503, 504]) {
      expect(classifySaveFailure(s)).toBe("transient");
    }
  });

  it("treats an opaque/unknown status as transient rather than dropping the retry", () => {
    expect(classifySaveFailure(0)).toBe("transient");
    expect(classifySaveFailure(302)).toBe("transient");
  });
});

// ── loop behaviour ────────────────────────────────────────────────────────────

type Mod = typeof import("./serverStorage");

/** serverStorage keeps module-level queue/timer state, so each case needs a fresh copy. */
async function freshModule(): Promise<Mod> {
  vi.resetModules();
  return import("./serverStorage");
}

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

/** A zustand-shaped envelope — setItem JSON.parses this and queues `.state`. */
const ENVELOPE = JSON.stringify({ state: { rubricEntries: [], problems: [] }, version: 1 });

type FetchFn = (input: string, init?: { body?: unknown }) => Promise<Response>;

/** The parsed JSON body of the nth recorded fetch call. */
function sentBody(nth: number): Record<string, unknown> {
  const call = fetchMock.mock.calls.at(nth);
  return JSON.parse(String(call?.[1]?.body ?? "{}")) as Record<string, unknown>;
}

let fetchMock: ReturnType<typeof vi.fn<FetchFn>>;

beforeEach(() => {
  vi.useFakeTimers();
  fetchMock = vi.fn<FetchFn>();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("save loop", () => {
  it("stops after ONE request when the body is permanently rejected (413)", async () => {
    const mod = await freshModule();
    fetchMock.mockResolvedValue(
      jsonResponse(413, {
        error: "payload_too_large",
        message: "Request body exceeds the 16384KB limit for this endpoint.",
        kind: "client_input",
      }),
    );

    await mod.serverStorage.setItem("waypoint", ENVELOPE);
    await vi.advanceTimersByTimeAsync(600); // past DEBOUNCE_MS
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Pre-fix this scheduled at a 10s ceiling forever: 60s ⇒ ~7 more requests.
    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const s = mod.getSaveState();
    expect(s.status).toBe("error");
    expect(s.permanent).toBe(true);
    expect(s.auth).toBeUndefined();
    expect(s.detail).toContain("exceeds the");
  });

  it("stops after ONE request on a 400 and surfaces the parser's message", async () => {
    const mod = await freshModule();
    fetchMock.mockResolvedValue(
      jsonResponse(400, {
        error: "missing_fields",
        message: "Required field `rhythmDays` is missing.",
        kind: "client_input",
      }),
    );

    await mod.serverStorage.setItem("waypoint", ENVELOPE);
    await vi.advanceTimersByTimeAsync(60_600);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(mod.getSaveState()).toMatchObject({
      status: "error",
      permanent: true,
      detail: "Required field `rhythmDays` is missing.",
    });
  });

  it("does NOT discard the user's work on a permanent failure — a later edit still tries", async () => {
    const mod = await freshModule();
    fetchMock.mockResolvedValue(jsonResponse(413, { error: "payload_too_large" }));

    await mod.serverStorage.setItem("waypoint", ENVELOPE);
    await vi.advanceTimersByTimeAsync(60_600);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // The queue was kept, so the next state change re-arms exactly one attempt.
    fetchMock.mockResolvedValue(jsonResponse(200, { ok: true }));
    await mod.serverStorage.setItem("waypoint", ENVELOPE);
    await vi.advanceTimersByTimeAsync(600);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(mod.getSaveState()).toEqual({ status: "saved" });
  });

  it("still retries a 500 with backoff", async () => {
    const mod = await freshModule();
    fetchMock.mockResolvedValue(jsonResponse(500, { error: "save_failed", kind: "internal" }));

    await mod.serverStorage.setItem("waypoint", ENVELOPE);
    await vi.advanceTimersByTimeAsync(600);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(mod.getSaveState()).toEqual({ status: "error" });

    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetchMock.mock.calls.length).toBeGreaterThan(5);
  });

  it("still retries a thrown fetch (offline)", async () => {
    const mod = await freshModule();
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    await mod.serverStorage.setItem("waypoint", ENVELOPE);
    await vi.advanceTimersByTimeAsync(60_600);

    expect(fetchMock.mock.calls.length).toBeGreaterThan(5);
    expect(mod.getSaveState()).toEqual({ status: "error" });
  });

  it("keeps the 401 path exactly as it was: flagged auth, not rescheduled, not permanent", async () => {
    const mod = await freshModule();
    fetchMock.mockResolvedValue(jsonResponse(401, { error: "unauthorized" }));

    await mod.serverStorage.setItem("waypoint", ENVELOPE);
    await vi.advanceTimersByTimeAsync(60_600);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(mod.getSaveState()).toEqual({ status: "error", auth: true });
  });

  it("sends __authoritative=false before hydration and true after a confirmed read", async () => {
    const mod = await freshModule();
    fetchMock.mockResolvedValue(jsonResponse(200, { ok: true }));

    await mod.serverStorage.setItem("waypoint", ENVELOPE);
    await vi.advanceTimersByTimeAsync(600);
    expect(sentBody(0).__authoritative).toBe(false);

    fetchMock.mockResolvedValue(jsonResponse(200, { empty: false, rubricEntries: [] }));
    await mod.serverStorage.getItem("waypoint");

    fetchMock.mockResolvedValue(jsonResponse(200, { ok: true }));
    await mod.serverStorage.setItem("waypoint", ENVELOPE);
    await vi.advanceTimersByTimeAsync(600);
    expect(sentBody(-1).__authoritative).toBe(true);
  });
});

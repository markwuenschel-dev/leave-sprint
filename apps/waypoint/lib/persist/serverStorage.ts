import type { StateStorage } from "zustand/middleware";
// Type-only: the /api/state body contract, owned by the route's parser. Importing
// it (rather than hand-mirroring `{ ...slice, __authoritative }`) makes a change to
// that contract a tsc error here instead of a runtime 400. `import type` is erased,
// so nothing from lib/http lands in the client bundle.
import type { StateSaveRequestBody } from "@/lib/http/schemas";

const ENDPOINT = "/api/state";
const DEBOUNCE_MS = 500;
const MAX_BACKOFF_MS = 10_000;

let serverEmpty = false;
export function serverWasEmpty(): boolean {
  return serverEmpty;
}

// True once we have successfully READ server state at least once. Saves before
// this still go out (so an import always persists) but are flagged NON-authoritative,
// so the server treats them as upsert-only and never deletes/wipes. After a
// confirmed read, saves are authoritative and may apply deletions.
let hydrated = false;

export type SaveState = {
  status: "idle" | "saving" | "saved" | "error";
  /** 401 — the session lapsed. Unlock and the queued save goes out. */
  auth?: boolean;
  /** The server will never accept this payload; retrying is pointless (see below). */
  permanent?: boolean;
  /** `message`/`error` from the failure body (lib/http/respond.ts:31-36), if any. */
  detail?: string;
};

/**
 * How a non-2xx save is treated.
 *
 * The bug this replaces: every status except 401 fell through to the catch, which
 * rescheduled at a 10s ceiling — so a 413 (body over BODY_LIMITS.state, see
 * lib/http/parse.ts:59-68) or a 400 (parseStateBody rejected the slice,
 * lib/http/schemas.ts:parseStateBody) hammered the endpoint forever, invisibly.
 *
 * The split:
 *   • 401           → "auth". Pre-existing behaviour, unchanged: re-queue, surface
 *                     it, do NOT reschedule — the retry is the user unlocking.
 *   • 408, 425, 429 → "transient". The standard retry-after-a-wait statuses: the
 *                     request is well-formed, the server just isn't taking it now.
 *   • other 4xx     → "permanent". The server has judged THIS body unacceptable;
 *                     resending the identical bytes gets the identical answer.
 *                     Covers 400/413 (the two the route can actually emit) and
 *                     403/404/405/422 from a gateway or a stale tab after a deploy.
 *   • 5xx & the rest → "transient". A fault on the server side (route.ts:62 returns
 *                     500 save_failed for a DB/migration hiccup) or an opaque
 *                     status 0 — all plausibly self-healing, so keep backing off.
 *
 * A thrown fetch (offline, DNS, TLS) never reaches here: it is caught below and
 * stays transient, exactly as before.
 */
export type SaveFailureClass = "auth" | "permanent" | "transient";

/** 4xx that a later attempt with the SAME body can still succeed on. */
const RETRYABLE_CLIENT_STATUSES = new Set([408, 425, 429]);

export function classifySaveFailure(status: number): SaveFailureClass {
  if (status === 401) return "auth";
  if (RETRYABLE_CLIENT_STATUSES.has(status)) return "transient";
  if (status >= 400 && status < 500) return "permanent";
  return "transient";
}

/** Best-effort read of the failure body; never throws, never blocks the caller. */
async function failureDetail(res: Response): Promise<string | undefined> {
  try {
    const data: unknown = await res.json();
    if (!data || typeof data !== "object") return undefined;
    const { message, error } = data as { message?: unknown; error?: unknown };
    if (typeof message === "string" && message.trim()) return message.trim();
    if (typeof error === "string" && error.trim()) return error.trim();
    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Build the PUT body. `slice` is genuinely `unknown` — it is whatever
 * `JSON.parse` yielded from zustand's serialized envelope (setItem, below) — so
 * the spread is an assertion, not a proof. What the declared return type DOES
 * buy: the `__authoritative` half is checked against the route's own exported
 * contract, so renaming/retyping that flag breaks the build here.
 */
function saveBody(slice: unknown): StateSaveRequestBody {
  return {
    ...(slice as Omit<StateSaveRequestBody, "__authoritative">),
    __authoritative: hydrated,
  };
}

let saveState: SaveState = { status: "idle" };
const listeners = new Set<(s: SaveState) => void>();

function setSaveState(s: SaveState): void {
  saveState = s;
  for (const l of listeners) l(s);
}

export function getSaveState(): SaveState {
  return saveState;
}

export function subscribeSaveState(listener: (s: SaveState) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

let pending: unknown = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let backoff = DEBOUNCE_MS;

async function flush(): Promise<void> {
  if (pending == null) return;
  const body = pending;
  pending = null;
  setSaveState({ status: "saving" });
  try {
    // NOTE: no `keepalive` here. Browsers cap keepalive request bodies at 64KB and
    // *throw* over that; our save carries the whole catalog + every rubric entry's
    // diagnostic blob, so it crosses 64KB after ~15 grades — which surfaced as a
    // permanent "Save error" and lost writes. Unload durability is handled
    // separately by beaconFlush (sendBeacon), so a normal debounced save needs no cap.
    const res = await fetch(ENDPOINT, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(saveBody(body)),
    });
    if (!res.ok) {
      const kind = classifySaveFailure(res.status);
      if (kind === "auth") {
        if (pending == null) pending = body;
        setSaveState({ status: "error", auth: true });
        return;
      }
      if (kind === "permanent") {
        // Keep the payload rather than dropping it: dropping is silent data loss,
        // and a 400 can become savable after the next edit fixes the slice. What we
        // drop is the TIMER — no reschedule, so the doomed request goes out at most
        // once per user edit instead of every 10s forever. The indicator stays in a
        // distinct "not saved" state until a save actually succeeds.
        if (pending == null) pending = body;
        setSaveState({ status: "error", permanent: true, detail: await failureDetail(res) });
        return;
      }
      throw new Error(`PUT ${res.status}`);
    }
    backoff = DEBOUNCE_MS;
    setSaveState({ status: "saved" });
  } catch {
    if (pending == null) pending = body;
    backoff = Math.min(backoff * 2, MAX_BACKOFF_MS);
    setSaveState({ status: "error" });
    schedule(backoff);
  }
}

function schedule(delay = DEBOUNCE_MS): void {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void flush();
  }, delay);
}

/**
 * Unload durability. `sendBeacon` returns only "queued / not queued" — it never
 * exposes the response, so a permanent rejection CANNOT be classified here and a
 * 413/400 beacon is indistinguishable from a successful one. That is unchanged by
 * the classifier above and not fixable without abandoning sendBeacon. The blast
 * radius is bounded: a beacon fires only on hide/pagehide, so it makes at most one
 * doomed request per unload — never a loop — and the next session re-saves from
 * the rehydrated store. The retry-forever bug lived entirely in flush().
 */
function beaconFlush(): void {
  if (pending == null) return;
  const body = pending;
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  try {
    const ok = navigator.sendBeacon(
      ENDPOINT,
      new Blob([JSON.stringify(saveBody(body))], { type: "application/json" }),
    );
    if (ok) pending = null;
  } catch {
    /* leave pending */
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") beaconFlush();
  });
  window.addEventListener("pagehide", beaconFlush);
}

export const serverStorage: StateStorage = {
  getItem: async (): Promise<string | null> => {
    // Retry transient failures — the API is briefly not ready right after a deploy,
    // and reliable hydration is what lets later saves apply real deletes.
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const res = await fetch(ENDPOINT, { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as Record<string, unknown> & { empty?: boolean };
          serverEmpty = !!data.empty;
          hydrated = true; // confirmed read — subsequent saves are authoritative
          const { empty: _e, driver: _d, ...slice } = data;
          return JSON.stringify({ state: slice, version: 1 });
        }
        if (res.status === 401) return null; // auth gate, not transient
      } catch {
        /* network — retry */
      }
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
    return null; // gave up; saves still go out, just non-authoritative (upsert-only)
  },
  setItem: async (_name: string, value: string): Promise<void> => {
    try {
      const parsed = JSON.parse(value) as { state?: unknown };
      pending = parsed.state ?? parsed;
      schedule();
    } catch {
      /* ignore */
    }
  },
  removeItem: async (): Promise<void> => {},
};

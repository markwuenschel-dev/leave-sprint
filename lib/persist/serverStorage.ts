/**
 * Zustand `persist` storage backed by the /api/state endpoint instead of
 * localStorage. Reads hydrate the store from Postgres; writes are debounced +
 * coalesced into a single PUT, and flushed on tab hide/close via sendBeacon so
 * nothing is lost on unload.
 *
 * The store keeps working exactly as before — every `set()` triggers `setItem`,
 * so all actions stay optimistic/synchronous; the network write is background.
 *
 * Save status is exposed (getSaveState / subscribeSaveState) so the UI can show
 * a Saving/Saved/Not-saved indicator — silent losses (401s, 5xx) become visible.
 */

import type { StateStorage } from "zustand/middleware";

const ENDPOINT = "/api/state";
const DEBOUNCE_MS = 500;
const MAX_BACKOFF_MS = 10_000;

let serverEmpty = false;
/** Whether the server reported an uninitialized DB on the last hydrate. */
export function serverWasEmpty(): boolean {
  return serverEmpty;
}

/* ── Save-status observable ──────────────────────────────────────────────── */

export type SaveState = {
  status: "idle" | "saving" | "saved" | "error";
  /** True when the last failure was a 401 (token gate) — the user must reconnect. */
  auth?: boolean;
};

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

/* ── Write queue ─────────────────────────────────────────────────────────── */

let pending: unknown = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let backoff = DEBOUNCE_MS;

async function flush(): Promise<void> {
  if (pending == null) return;
  const body = pending;
  pending = null;
  setSaveState({ status: "saving" });
  try {
    const res = await fetch(ENDPOINT, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    });
    if (res.status === 401) {
      // Session expired: keep the edit and surface it — don't silently retry forever.
      if (pending == null) pending = body;
      setSaveState({ status: "error", auth: true });
      return;
    }
    if (!res.ok) throw new Error(`PUT ${res.status}`);
    backoff = DEBOUNCE_MS;
    setSaveState({ status: "saved" });
  } catch {
    // Re-queue the latest state and retry with backoff.
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
 * Flush on unload with sendBeacon — purpose-built for tab-close/navigation and
 * not cancelled mid-flight like a keepalive fetch. Sends POST (see the POST
 * handler on /api/state).
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
      new Blob([JSON.stringify(body)], { type: "application/json" }),
    );
    if (ok) pending = null;
    // If the beacon couldn't be queued, leave `pending` so a later flush retries.
  } catch {
    /* leave pending for a later flush */
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
    try {
      const res = await fetch(ENDPOINT, { cache: "no-store" });
      if (!res.ok) return null;
      const data = (await res.json()) as Record<string, unknown> & { empty?: boolean };
      serverEmpty = !!data.empty;
      const { empty: _empty, driver: _driver, ...slice } = data as Record<string, unknown>;
      return JSON.stringify({ state: slice, version: 4 });
    } catch {
      return null;
    }
  },

  setItem: async (_name: string, value: string): Promise<void> => {
    try {
      const parsed = JSON.parse(value) as { state?: unknown };
      pending = parsed.state ?? parsed;
      schedule();
    } catch {
      /* ignore malformed */
    }
  },

  removeItem: async (): Promise<void> => {
    // resetAll() clears via set() → setItem, so nothing to do here.
  },
};

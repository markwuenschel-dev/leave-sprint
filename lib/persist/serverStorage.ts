/**
 * Zustand `persist` storage backed by the /api/state endpoint instead of
 * localStorage. Reads hydrate the store from Postgres; writes are debounced +
 * coalesced into a single PUT, flushed on tab hide/close so nothing is lost.
 *
 * The store keeps working exactly as before — every `set()` triggers `setItem`,
 * so all actions stay optimistic/synchronous; the network write is background.
 */

import type { StateStorage } from "zustand/middleware";

const ENDPOINT = "/api/state";
const DEBOUNCE_MS = 600;
const MAX_BACKOFF_MS = 10_000;

let serverEmpty = false;
/** Whether the server reported an uninitialized DB on the last hydrate. */
export function serverWasEmpty(): boolean {
  return serverEmpty;
}

let pending: unknown = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let backoff = DEBOUNCE_MS;

async function flush(): Promise<void> {
  if (pending == null) return;
  const body = pending;
  pending = null;
  try {
    const res = await fetch(ENDPOINT, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    });
    if (!res.ok) throw new Error(`PUT ${res.status}`);
    backoff = DEBOUNCE_MS;
  } catch {
    // Re-queue the latest state and retry with backoff.
    if (pending == null) pending = body;
    backoff = Math.min(backoff * 2, MAX_BACKOFF_MS);
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

// Flush a pending write when the tab is hidden or closed.
if (typeof window !== "undefined") {
  const flushNow = () => {
    if (pending == null) return;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    void flush();
  };
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushNow();
  });
  window.addEventListener("beforeunload", flushNow);
}

export const serverStorage: StateStorage = {
  getItem: async (): Promise<string | null> => {
    try {
      const res = await fetch(ENDPOINT, { cache: "no-store" });
      if (!res.ok) return null;
      const data = (await res.json()) as Record<string, unknown> & { empty?: boolean };
      serverEmpty = !!data.empty;
      const { empty: _empty, ...slice } = data;
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

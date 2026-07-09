import type { StateStorage } from "zustand/middleware";

const ENDPOINT = "/api/state";
const DEBOUNCE_MS = 500;
const MAX_BACKOFF_MS = 10_000;

let serverEmpty = false;
export function serverWasEmpty(): boolean {
  return serverEmpty;
}

export type SaveState = {
  status: "idle" | "saving" | "saved" | "error";
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
      if (pending == null) pending = body;
      setSaveState({ status: "error", auth: true });
      return;
    }
    if (!res.ok) throw new Error(`PUT ${res.status}`);
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
    try {
      const res = await fetch(ENDPOINT, { cache: "no-store" });
      if (!res.ok) return null;
      const data = (await res.json()) as Record<string, unknown> & { empty?: boolean };
      serverEmpty = !!data.empty;
      const { empty: _e, driver: _d, ...slice } = data;
      return JSON.stringify({ state: slice, version: 1 });
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
      /* ignore */
    }
  },
  removeItem: async (): Promise<void> => {},
};

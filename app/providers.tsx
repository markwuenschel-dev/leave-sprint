"use client";

/**
 * Client boot: hydrate the store from the server (skipHydration is on, so we call
 * rehydrate() here), gate the UI until data has arrived (no seed→server flash),
 * and run the one-time localStorage → Postgres migration for existing browsers.
 */

import { useEffect, useState } from "react";
import { useSprintStore } from "@/lib/store";
import { serverWasEmpty } from "@/lib/persist/serverStorage";

const MIGRATED_KEY = "leave-sprint-migrated-v1";
const OLD_KEY = "leave-sprint-twin-v1";

function runOneTimeMigration() {
  if (typeof localStorage === "undefined") return;
  if (!serverWasEmpty() || localStorage.getItem(MIGRATED_KEY)) return;

  const store = useSprintStore.getState();
  const raw = localStorage.getItem(OLD_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      const slice = parsed?.state ?? parsed;
      if (slice && typeof slice === "object") store.importState(slice);
    } catch {
      /* ignore malformed */
    }
    store.importLegacyLocalStorage(); // also pulls old standalone-page keys
  }
  // Initialize the server even when there's no localStorage (persists the seed).
  useSprintStore.setState({ lastUpdated: new Date().toISOString() });
  localStorage.setItem(MIGRATED_KEY, "1");
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      runOneTimeMigration();
      setHydrated(true);
    };
    const unsub = useSprintStore.persist.onFinishHydration(finish);
    void useSprintStore.persist.rehydrate();
    if (useSprintStore.persist.hasHydrated()) finish();
    return unsub;
  }, []);

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0c10] text-[var(--text-dim)]">
        <div className="flex items-center gap-3 text-sm">
          <span className="inline-block h-4 w-4 rounded-full border-2 border-white/20 border-t-[var(--cyan)] animate-spin" />
          Loading your sprint…
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

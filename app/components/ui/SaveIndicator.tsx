"use client";

/**
 * Header indicator for the server-persist write path. Subscribes to the save
 * status exposed by serverStorage so a failed/pending save is visible instead
 * of silently lost. On an auth failure (token gate 401) it links to /unlock.
 */

import { useEffect, useState } from "react";
import { getSaveState, subscribeSaveState, type SaveState } from "@/lib/persist/serverStorage";
import { Check, Loader2, CloudOff } from "lucide-react";

export function SaveIndicator() {
  const [s, setS] = useState<SaveState>(() => getSaveState());
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => subscribeSaveState(setS), []);

  // Flash "Saved ✓" briefly, then fade back to nothing.
  useEffect(() => {
    if (s.status !== "saved") return;
    setShowSaved(true);
    const t = setTimeout(() => setShowSaved(false), 2000);
    return () => clearTimeout(t);
  }, [s]);

  if (s.status === "error") {
    return (
      <button
        onClick={() => { if (s.auth) window.location.href = "/unlock"; }}
        className="flex items-center gap-1.5 text-xs text-[var(--orange)]"
        title={s.auth ? "Your session expired — click to reconnect." : "Save failed; retrying automatically."}
      >
        <CloudOff size={13} /> {s.auth ? "Not saved — reconnect" : "Not saved — retrying"}
      </button>
    );
  }

  if (s.status === "saving") {
    return (
      <span className="flex items-center gap-1.5 text-xs text-[var(--text-dim)]">
        <Loader2 size={13} className="animate-spin" /> Saving…
      </span>
    );
  }

  if (s.status === "saved" && showSaved) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-[var(--done)]">
        <Check size={13} /> Saved
      </span>
    );
  }

  return null;
}

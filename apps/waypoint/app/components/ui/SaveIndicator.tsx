"use client";

import { useEffect, useState } from "react";
import { getSaveState, subscribeSaveState, type SaveState } from "@/lib/persist/serverStorage";

export function SaveIndicator() {
  const [s, setS] = useState<SaveState>({ status: "idle" });
  useEffect(() => subscribeSaveState(setS), []);
  useEffect(() => {
    setS(getSaveState());
  }, []);

  if (s.status === "idle") return null;
  const label =
    s.status === "saving"
      ? "Saving…"
      : s.status === "saved"
        ? "Saved"
        : s.auth
          ? "Auth error"
          : s.permanent
            ? "Not saved"
            : "Save error";
  // "Save error" is transient — it is still retrying on a backoff. "Not saved" is
  // terminal: the server rejected this payload and nothing is retrying, so it gets
  // the more alarming accent (magenta already reads as regression elsewhere, e.g.
  // GapsBoard.tsx:17 uses it for "reopened").
  const color =
    s.status === "error"
      ? s.permanent
        ? "var(--magenta)"
        : "var(--orange)"
      : s.status === "saved"
        ? "var(--green)"
        : "var(--text-dim)";
  // `title` for the server's own explanation — same tooltip idiom as page.tsx:120
  // and Flashcard.tsx:79; no new UI vocabulary.
  const title = s.permanent
    ? `Your changes are NOT being saved and will be lost on reload — the server rejected them${s.detail ? `: ${s.detail}` : " and retrying will not help"}. Save your work with More → Backup → Export JSON before reloading.`
    : undefined;
  return (
    <span className="text-xs font-medium" style={{ color }} title={title}>
      {label}
    </span>
  );
}

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
          : "Save error";
  const color =
    s.status === "error" ? "var(--orange)" : s.status === "saved" ? "var(--green)" : "var(--text-dim)";
  return (
    <span className="text-xs font-medium" style={{ color }}>
      {label}
    </span>
  );
}

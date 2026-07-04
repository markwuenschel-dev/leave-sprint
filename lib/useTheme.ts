"use client";

/**
 * Theme state — localStorage only, deliberately independent of the zustand store
 * (which is gated behind the server-hydration spinner in app/providers.tsx).
 * The pre-paint inline script in app/layout.tsx already set `data-theme`; this
 * hook keeps it in sync with user choice and OS changes.
 */

import { useCallback, useEffect, useState } from "react";

export type ThemeMode = "dark" | "light" | "system";
const KEY = "ls-theme";

function resolve(mode: ThemeMode): "dark" | "light" {
  if (mode === "system") {
    return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }
  return mode;
}

function apply(mode: ThemeMode) {
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-theme", resolve(mode));
  }
}

export function useTheme() {
  const [mode, setModeState] = useState<ThemeMode>("system");

  useEffect(() => {
    let stored: ThemeMode = "system";
    try {
      stored = (localStorage.getItem(KEY) as ThemeMode) || "system";
    } catch {
      /* ignore */
    }
    setModeState(stored);
    apply(stored);
  }, []);

  useEffect(() => {
    if (mode !== "system" || typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => apply("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [mode]);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* ignore */
    }
    apply(next);
  }, []);

  return { mode, resolved: resolve(mode), setMode };
}

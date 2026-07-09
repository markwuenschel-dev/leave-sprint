"use client";

import { useEffect, useState } from "react";

export type Theme = "dark" | "light" | "system";
const KEY = "wp-theme";

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("system");

  useEffect(() => {
    const t = (localStorage.getItem(KEY) as Theme) || "system";
    setThemeState(t);
    apply(t);
  }, []);

  function apply(t: Theme) {
    const resolved =
      t === "system"
        ? window.matchMedia("(prefers-color-scheme: light)").matches
          ? "light"
          : "dark"
        : t;
    document.documentElement.setAttribute("data-theme", resolved);
  }

  function setTheme(t: Theme) {
    setThemeState(t);
    localStorage.setItem(KEY, t);
    apply(t);
  }

  return { theme, setTheme };
}

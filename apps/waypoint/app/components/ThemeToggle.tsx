"use client";

import { useTheme } from "@/lib/useTheme";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const next = theme === "dark" ? "light" : theme === "light" ? "system" : "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      className="text-xs px-2 py-1 rounded-lg border border-[var(--hairline)] text-[var(--text-mid)] hover:border-[var(--hairline-strong)]"
      title={`Theme: ${theme}`}
    >
      {theme}
    </button>
  );
}

"use client";

import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme, type ThemeMode } from "@/lib/useTheme";

const OPTIONS: { mode: ThemeMode; icon: typeof Moon; label: string }[] = [
  { mode: "dark", icon: Moon, label: "Dark" },
  { mode: "light", icon: Sun, label: "Light" },
  { mode: "system", icon: Monitor, label: "System" },
];

export function ThemeToggle() {
  const { mode, setMode } = useTheme();
  return (
    <div className="flex items-center gap-0.5 rounded-2xl border border-[var(--hairline)] bg-[var(--fill-subtle)] p-0.5" role="group" aria-label="Theme">
      {OPTIONS.map((o) => {
        const Icon = o.icon;
        const active = mode === o.mode;
        return (
          <button
            key={o.mode}
            onClick={() => setMode(o.mode)}
            title={o.label}
            aria-pressed={active}
            className={`flex h-7 w-7 items-center justify-center rounded-xl transition-colors ${
              active ? "bg-[var(--fill-strong)] text-[var(--cyan)]" : "text-[var(--text-dim)] hover:text-[var(--text)]"
            }`}
          >
            <Icon size={14} />
          </button>
        );
      })}
    </div>
  );
}

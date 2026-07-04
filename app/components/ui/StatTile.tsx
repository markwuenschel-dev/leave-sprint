"use client";

/** Compact stat card. Ported from the rubric analytics r-stat-card grid. */

import type { ReactNode } from "react";

interface StatTileProps {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  accent?: string; // CSS color for the value
}

export function StatTile({ label, value, sub, accent = "var(--text)" }: StatTileProps) {
  return (
    <div className="rounded-2xl border border-[var(--hairline)] bg-[var(--surface)] p-4">
      <div className="text-[10px] uppercase tracking-widest text-[var(--text-dim)]">{label}</div>
      <div className="font-mono text-2xl font-semibold tabular-nums mt-1" style={{ color: accent }}>
        {value}
      </div>
      {sub && <div className="text-xs text-[var(--text-dim)] mt-0.5">{sub}</div>}
    </div>
  );
}

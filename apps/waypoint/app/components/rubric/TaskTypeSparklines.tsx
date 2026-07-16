"use client";

/**
 * Small multiples: one compact final-score sparkline per task type, shared 0–100
 * scale + 70 pass line. Small multiples are the dataviz answer to "many series" —
 * each panel is direct-labeled (color dot + name + latest value), so identity is
 * never color-alone and the panels stay comparable.
 */

import type { TaskTypeTrend } from "@/lib/gaps";
import { Sparkline } from "../ui/Sparkline";

function Mini({ t }: { t: TaskTypeTrend }) {
  const vals = t.final;
  let lastIdx = -1;
  for (let i = vals.length - 1; i >= 0; i--) {
    if (vals[i] != null) {
      lastIdx = i;
      break;
    }
  }
  const last = lastIdx >= 0 ? (vals[lastIdx] as number) : null;

  return (
    <div className="rounded-xl border border-[var(--hairline)] bg-[var(--surface)] p-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="inline-flex min-w-0 items-center gap-1.5 text-xs font-medium text-[var(--text-mid)]">
          <span
            className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ background: t.color }}
            aria-hidden
          />
          <span className="truncate">{t.label}</span>
        </span>
        <span className="font-mono text-sm font-bold" style={{ color: t.color }}>
          {last ?? "—"}
        </span>
      </div>
      <div className="mt-2">
        <Sparkline values={vals} color={t.color} />
      </div>
      <div className="mt-1 text-[10px] text-[var(--text-dim)]">
        {t.count} log{t.count === 1 ? "" : "s"}
      </div>
    </div>
  );
}

export function TaskTypeSparklines({ trends }: { trends: TaskTypeTrend[] }) {
  if (!trends.length) {
    return (
      <p className="text-sm text-[var(--text-dim)]">
        No task-type trends in this filter yet.
      </p>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {trends.map((t) => (
        <Mini key={t.taskType} t={t} />
      ))}
    </div>
  );
}

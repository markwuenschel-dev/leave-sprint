"use client";

/**
 * Small multiples: one compact final-score sparkline per task type, shared 0–100
 * scale + 70 pass line. Small multiples are the dataviz answer to "many series" —
 * each panel is direct-labeled (color dot + name + latest value), so identity is
 * never color-alone and the panels stay comparable.
 */

import type { TaskTypeTrend } from "@/lib/gaps";

const W = 168;
const H = 46;
const PAD = 4;

function Mini({ t }: { t: TaskTypeTrend }) {
  const vals = t.final;
  const n = vals.length;
  let lastIdx = -1;
  for (let i = n - 1; i >= 0; i--) {
    if (vals[i] != null) {
      lastIdx = i;
      break;
    }
  }
  const last = lastIdx >= 0 ? (vals[lastIdx] as number) : null;

  const x = (i: number) => PAD + (n <= 1 ? (W - 2 * PAD) / 2 : (i / (n - 1)) * (W - 2 * PAD));
  const y = (v: number) => PAD + (1 - Math.max(0, Math.min(100, v)) / 100) * (H - 2 * PAD);

  let d = "";
  let pen = false;
  vals.forEach((v, i) => {
    if (v == null) {
      pen = false;
      return;
    }
    d += `${pen ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)} `;
    pen = true;
  });

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
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        className="mt-2"
        role="img"
        aria-label={`${t.label} final-score trend over ${t.count} assessments, latest ${last ?? "n/a"}`}
      >
        <line
          x1={PAD}
          x2={W - PAD}
          y1={y(70)}
          y2={y(70)}
          stroke="var(--green)"
          strokeWidth={1}
          strokeDasharray="3 3"
          opacity={0.45}
        />
        <path d={d.trim()} fill="none" stroke={t.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {last != null ? <circle cx={x(lastIdx)} cy={y(last)} r={2.75} fill={t.color} /> : null}
      </svg>
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

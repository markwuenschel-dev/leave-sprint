"use client";

/**
 * Reusable inline-SVG multi-series line chart for score-over-time trends.
 * No charting dependency. One y-axis (0–yMax), series plotted by attempt index
 * (dates are lumpy), recessive grid, optional pass threshold, hover crosshair +
 * tooltip, legend + direct end-labels (identity never color-alone), and a
 * <details> data-table fallback for accessibility.
 */

import { useRef, useState } from "react";

export interface TrendSeries {
  key: string;
  label: string;
  color: string; // a CSS var, e.g. "var(--cyan)"
  values: (number | null)[];
}

interface TrendChartProps {
  title: string;
  subtitle?: string;
  series: TrendSeries[];
  labels: string[]; // x label (date) per index; length === series[i].values.length
  yMax?: number;
  height?: number;
  threshold?: { y: number; label: string };
  dotsMax?: number; // draw point dots only when n <= this (default 24)
}

const W = 720;
const PAD = { l: 34, r: 48, t: 12, b: 26 };

export function TrendChart({
  title,
  subtitle,
  series,
  labels,
  yMax = 100,
  height = 240,
  threshold,
  dotsMax = 24,
}: TrendChartProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const n = labels.length;

  if (n === 0 || series.every((s) => s.values.every((v) => v === null))) {
    return (
      <p className="text-sm text-[var(--text-dim)]">
        Not enough graded assessments in this filter yet to chart a trend.
      </p>
    );
  }

  const plotW = W - PAD.l - PAD.r;
  const plotH = height - PAD.t - PAD.b;
  const x = (i: number) => PAD.l + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const y = (v: number) => PAD.t + (1 - Math.max(0, Math.min(yMax, v)) / yMax) * plotH;

  const buildPath = (values: (number | null)[]) => {
    let d = "";
    let pen = false;
    values.forEach((v, i) => {
      if (v == null) {
        pen = false;
        return;
      }
      d += `${pen ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)} `;
      pen = true;
    });
    return d.trim();
  };

  const yTicks = [0, Math.round(yMax / 2), yMax];
  const xTickIdx = Array.from(new Set([0, Math.round((n - 1) / 2), n - 1])).filter(
    (i) => i >= 0 && i < n,
  );
  const showDots = n <= dotsMax;
  const lastOf = (s: TrendSeries) => {
    for (let i = s.values.length - 1; i >= 0; i--) if (s.values[i] != null) return i;
    return -1;
  };

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((px - PAD.l) / plotW) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  }

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-dim)]">
          {title}
        </div>
        {/* Legend — secondary encoding so identity is never color-alone */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {series.map((s) => (
            <span key={s.key} className="inline-flex items-center gap-1.5 text-[11px] text-[var(--text-mid)]">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ background: s.color }}
                aria-hidden
              />
              {s.label}
            </span>
          ))}
        </div>
      </div>
      {subtitle ? <div className="mb-2 text-xs text-[var(--text-dim)]">{subtitle}</div> : null}

      <div ref={wrapRef} className="relative" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        <svg
          viewBox={`0 0 ${W} ${height}`}
          width="100%"
          height={height}
          role="img"
          aria-label={`${title}. ${series.map((s) => s.label).join(", ")} over ${n} assessments.`}
          className="overflow-visible"
        >
          {/* gridlines + y labels */}
          {yTicks.map((t) => (
            <g key={t}>
              <line
                x1={PAD.l}
                x2={W - PAD.r}
                y1={y(t)}
                y2={y(t)}
                stroke="var(--hairline)"
                strokeWidth={1}
              />
              <text x={PAD.l - 6} y={y(t) + 3} textAnchor="end" className="fill-[var(--text-dim)] text-[9px]">
                {t}
              </text>
            </g>
          ))}

          {/* pass threshold */}
          {threshold ? (
            <g>
              <line
                x1={PAD.l}
                x2={W - PAD.r}
                y1={y(threshold.y)}
                y2={y(threshold.y)}
                stroke="var(--green)"
                strokeWidth={1}
                strokeDasharray="4 4"
                opacity={0.7}
              />
              <text x={W - PAD.r + 4} y={y(threshold.y) + 3} className="fill-[var(--green)] text-[9px]">
                {threshold.label}
              </text>
            </g>
          ) : null}

          {/* x date labels */}
          {xTickIdx.map((i) => (
            <text
              key={i}
              x={x(i)}
              y={height - 6}
              textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}
              className="fill-[var(--text-dim)] text-[9px]"
            >
              {labels[i]?.slice(5)}
            </text>
          ))}

          {/* series lines */}
          {series.map((s) => (
            <path
              key={s.key}
              d={buildPath(s.values)}
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}

          {/* dots (only when sparse enough to be legible) */}
          {showDots
            ? series.flatMap((s) =>
                s.values.map((v, i) =>
                  v == null ? null : (
                    <circle key={`${s.key}-${i}`} cx={x(i)} cy={y(v)} r={2.5} fill={s.color} />
                  ),
                ),
              )
            : null}

          {/* direct end-labels */}
          {series.map((s) => {
            const li = lastOf(s);
            if (li < 0) return null;
            return (
              <text
                key={`end-${s.key}`}
                x={x(li) + 5}
                y={y(s.values[li] as number) + 3}
                className="text-[9px] font-semibold"
                style={{ fill: s.color }}
              >
                {s.values[li]}
              </text>
            );
          })}

          {/* hover crosshair + highlighted points */}
          {hover != null ? (
            <g>
              <line
                x1={x(hover)}
                x2={x(hover)}
                y1={PAD.t}
                y2={height - PAD.b}
                stroke="var(--text-dim)"
                strokeWidth={1}
                opacity={0.5}
              />
              {series.map((s) => {
                const v = s.values[hover];
                return v == null ? null : (
                  <circle
                    key={`h-${s.key}`}
                    cx={x(hover)}
                    cy={y(v)}
                    r={3.5}
                    fill={s.color}
                    stroke="var(--surface)"
                    strokeWidth={1.5}
                  />
                );
              })}
            </g>
          ) : null}
        </svg>

        {/* tooltip */}
        {hover != null ? (
          <div
            className="pointer-events-none absolute top-1 z-10 -translate-x-1/2 rounded-lg border border-[var(--hairline)] bg-[var(--surface-2)] px-2 py-1 text-[11px] shadow-lg"
            style={{ left: `${(x(hover) / W) * 100}%` }}
          >
            <div className="font-mono text-[10px] text-[var(--text-dim)]">{labels[hover]}</div>
            {series.map((s) => (
              <div key={s.key} className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: s.color }} aria-hidden />
                <span className="text-[var(--text-mid)]">{s.label}</span>
                <span className="ml-auto font-mono tabular-nums text-[var(--text)]">
                  {s.values[hover] ?? "—"}
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {/* accessible data-table fallback */}
      <details className="mt-2">
        <summary className="cursor-pointer text-[11px] text-[var(--text-dim)]">Data table</summary>
        <div className="mt-2 max-h-48 overflow-auto rounded-lg border border-[var(--hairline)]">
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 bg-[var(--surface-2)] text-[var(--text-dim)]">
              <tr>
                <th className="px-2 py-1 text-left font-medium">#</th>
                <th className="px-2 py-1 text-left font-medium">Date</th>
                {series.map((s) => (
                  <th key={s.key} className="px-2 py-1 text-right font-medium">
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="font-mono tabular-nums text-[var(--text-mid)]">
              {labels.map((lab, i) => (
                <tr key={i} className="border-t border-[var(--hairline)]">
                  <td className="px-2 py-0.5">{i + 1}</td>
                  <td className="px-2 py-0.5">{lab}</td>
                  {series.map((s) => (
                    <td key={s.key} className="px-2 py-0.5 text-right">
                      {s.values[i] ?? "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

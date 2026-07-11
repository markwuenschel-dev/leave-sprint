"use client";

/**
 * Non-line analytics for the Readiness + Performance surfaces (inline SVG / CSS,
 * no charting dep):
 *  - ReadinessKPIs  : summary stat tiles (numbers Performance's trends don't show)
 *  - SkillAreaBars  : ranked avg-final per task type (where you stand now)
 *  - GateBars       : pass/partial/fail per mandatory gate (status colors)
 *  - DomainRadar    : avg score across technical domains
 *  - ScoreHistogram : distribution of final scores, colored by pass band
 */

import type { ReactNode } from "react";
import type { PerfSummary, SkillAreaStat, DomainStat, HistBin } from "@/lib/gaps";
import { card } from "../surfaces/shared";

const STATUS = { pass: "var(--green)", partial: "var(--yellow)", fail: "#ef4444" } as const;

/* ── Readiness KPI tiles ─────────────────────────────────────────────────── */
function Tile({ label, value, sub, accent }: { label: string; value: ReactNode; sub?: string; accent?: string }) {
  return (
    <div className="rounded-2xl border border-[var(--hairline)] bg-[var(--surface)] p-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-dim)]">{label}</div>
      <div className="mt-1 font-mono text-3xl font-bold" style={{ color: accent ?? "var(--text)" }}>{value}</div>
      {sub ? <div className="mt-0.5 text-[11px] text-[var(--text-dim)]">{sub}</div> : null}
    </div>
  );
}

export function ReadinessKPIs({ s }: { s: PerfSummary }) {
  if (!s.graded) {
    return (
      <div className={card}>
        <p className="text-sm text-[var(--text-dim)]">
          No graded assessments yet — import JSON or log a grade to populate readiness numbers.
        </p>
      </div>
    );
  }
  const covered = s.coverage.filter((c) => c.count > 0).length;
  return (
    <div>
      <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-dim)]">
        Evidence at a glance
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <Tile label="Graded" value={s.graded} sub="assessments" accent="var(--cyan)" />
        <Tile
          label="Avg final"
          value={s.avgFinal ?? "—"}
          sub="/ 100"
          accent={s.avgFinal != null && s.avgFinal >= 70 ? "var(--green)" : "var(--yellow)"}
        />
        <Tile label="Qualifying rate" value={`${s.qualifyingRate}%`} sub="earned a level" />
        <Tile
          label="Pass rate"
          value={`${s.passRate}%`}
          sub="scored ≥ 70"
          accent={s.passRate >= 50 ? "var(--green)" : "var(--yellow)"}
        />
        <Tile
          label="Best levels"
          value={
            <span className="inline-flex items-baseline gap-1.5 text-2xl">
              <span style={{ color: "var(--cyan)" }}>{s.bestLevel.L1}</span>
              <span className="text-base text-[var(--text-dim)]">·</span>
              <span style={{ color: "var(--orange)" }}>{s.bestLevel.L2}</span>
              <span className="text-base text-[var(--text-dim)]">·</span>
              <span style={{ color: "var(--magenta)" }}>{s.bestLevel.L3}</span>
            </span>
          }
          sub="L1 · L2 · L3 hits"
        />
        <Tile
          label="Proof strength"
          value={s.avgProof != null ? `${Math.round(s.avgProof * 100)}%` : "—"}
          sub="avg confidence"
        />
        <Tile label="Coverage" value={`${covered}/${s.coverage.length}`} sub="task types w/ evidence" />
        <div className="rounded-2xl border border-[var(--hairline)] bg-[var(--surface)] p-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-dim)]">Task types</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {s.coverage.map((c) => (
              <span
                key={c.taskType}
                title={`${c.label}: ${c.count}`}
                className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px]"
                style={{
                  background: c.count ? `color-mix(in srgb, ${c.color} 16%, transparent)` : "var(--surface-2)",
                  color: c.count ? c.color : "var(--text-dim)",
                }}
              >
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{ background: c.count ? c.color : "var(--text-dim)" }}
                />
                {c.count}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Ranked bars: avg final by skill area ────────────────────────────────── */
export function SkillAreaBars({ data }: { data: SkillAreaStat[] }) {
  if (!data.length) return <p className="text-sm text-[var(--text-dim)]">No graded assessments in this filter yet.</p>;
  return (
    <div className="space-y-2.5">
      {data.map((d) => {
        const w = d.avgFinal != null ? d.avgFinal : 0;
        return (
          <div key={d.taskType} className="flex items-center gap-3">
            <div className="w-28 shrink-0 truncate text-xs text-[var(--text-mid)]" title={d.label}>
              {d.label}
            </div>
            <div className="relative h-5 flex-1 overflow-hidden rounded-md bg-[var(--surface-2)]">
              <div className="h-full rounded-md" style={{ width: `${w}%`, background: d.color }} />
              <div className="absolute inset-y-0" style={{ left: "70%", borderLeft: "1px dashed var(--green)" }} aria-hidden />
            </div>
            <div className="w-16 shrink-0 text-right font-mono text-sm font-semibold" style={{ color: d.color }}>
              {d.avgFinal ?? "—"}
              <span className="text-[10px] text-[var(--text-dim)]"> ·{d.count}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Stacked bars: gate pass / partial / fail ────────────────────────────── */
export function GateBars({
  data,
}: {
  data: { gate: string; pass: number; partial: number; fail: number; total: number }[];
}) {
  const rows = data.filter((g) => g.total > 0);
  if (!rows.length) return <p className="text-sm text-[var(--text-dim)]">No gate results in this filter yet.</p>;
  const pct = (n: number, t: number) => (t ? (n / t) * 100 : 0);
  return (
    <div>
      <div className="mb-2 flex items-center gap-x-3 text-[11px] text-[var(--text-mid)]">
        {(["pass", "partial", "fail"] as const).map((k) => (
          <span key={k} className="inline-flex items-center gap-1.5 capitalize">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: STATUS[k] }} />
            {k}
          </span>
        ))}
      </div>
      <div className="space-y-2">
        {rows.map((g) => (
          <div key={g.gate} className="flex items-center gap-3">
            <div className="w-36 shrink-0 truncate text-xs text-[var(--text-mid)]" title={g.gate}>
              {g.gate}
            </div>
            <div className="flex h-5 flex-1 overflow-hidden rounded-md bg-[var(--surface-2)]">
              <div style={{ width: `${pct(g.pass, g.total)}%`, background: STATUS.pass }} title={`Pass ${g.pass}`} />
              <div style={{ width: `${pct(g.partial, g.total)}%`, background: STATUS.partial }} title={`Partial ${g.partial}`} />
              <div style={{ width: `${pct(g.fail, g.total)}%`, background: STATUS.fail }} title={`Fail ${g.fail}`} />
            </div>
            <div className="w-10 shrink-0 text-right font-mono text-xs text-[var(--text-dim)]">{g.total}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Radar: avg score by technical domain ────────────────────────────────── */
export function DomainRadar({ data }: { data: DomainStat[] }) {
  if (data.length < 3) {
    return (
      <p className="text-sm text-[var(--text-dim)]">
        Need at least 3 domains with graded evidence to draw a radar (currently {data.length}).
      </p>
    );
  }
  const size = 300;
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 - 46;
  const n = data.length;
  const ang = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const at = (i: number, r: number): [number, number] => [cx + Math.cos(ang(i)) * r, cy + Math.sin(ang(i)) * r];
  const poly = (r: (d: DomainStat, i: number) => number) =>
    data.map((d, i) => at(i, r(d, i)).map((v) => v.toFixed(1)).join(",")).join(" ");
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width="100%"
      height={size}
      role="img"
      aria-label="Average score by technical domain"
      className="overflow-visible"
    >
      {[25, 50, 75, 100].map((ring) => (
        <polygon key={ring} points={poly(() => (ring / 100) * R)} fill="none" stroke="var(--hairline)" strokeWidth={1} />
      ))}
      {data.map((_, i) => {
        const [x, y] = at(i, R);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--hairline)" strokeWidth={1} />;
      })}
      <polygon
        points={poly((d) => (d.avg / 100) * R)}
        fill="color-mix(in srgb, var(--cyan) 22%, transparent)"
        stroke="var(--cyan)"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {data.map((d, i) => {
        const [x, y] = at(i, (d.avg / 100) * R);
        return <circle key={i} cx={x} cy={y} r={2.75} fill="var(--cyan)" />;
      })}
      {data.map((d, i) => {
        const [x, y] = at(i, R + 16);
        const c = Math.cos(ang(i));
        const anchor = c > 0.3 ? "start" : c < -0.3 ? "end" : "middle";
        const short = d.domain.length > 16 ? d.domain.slice(0, 15) + "…" : d.domain;
        return (
          <text key={i} x={x} y={y + 3} textAnchor={anchor} className="fill-[var(--text-dim)] text-[8px]">
            {short} <tspan className="fill-[var(--text-mid)]">{d.avg}</tspan>
          </text>
        );
      })}
    </svg>
  );
}

/* ── Histogram: final-score distribution by band ─────────────────────────── */
export function ScoreHistogram({ data }: { data: HistBin[] }) {
  const BAND: Record<HistBin["band"], string> = {
    fail: STATUS.fail,
    borderline: STATUS.partial,
    pass: STATUS.pass,
  };
  const max = Math.max(...data.map((b) => b.count), 1);
  const total = data.reduce((s, b) => s + b.count, 0);
  if (!total) return <p className="text-sm text-[var(--text-dim)]">No graded assessments in this filter yet.</p>;
  return (
    <div>
      <div className="flex items-end gap-1.5" style={{ minHeight: 150 }}>
        {data.map((b) => {
          const h = Math.max(3, Math.round((b.count / max) * 128));
          return (
            <div key={b.label} className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <div className="font-mono text-[10px] text-[var(--text-dim)]">{b.count || ""}</div>
              <div
                className="w-full max-w-[3rem] rounded-t-md"
                style={{ height: h, background: BAND[b.band] }}
                title={`${b.label}: ${b.count}`}
              />
              <div className="truncate font-mono text-[9px] text-[var(--text-dim)]">{b.label}</div>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-[var(--text-dim)]">
        {total} graded · <span style={{ color: STATUS.fail }}>red &lt; 60</span> ·{" "}
        <span style={{ color: STATUS.partial }}>amber 60–69</span> · <span style={{ color: STATUS.pass }}>green ≥ 70</span>
      </p>
    </div>
  );
}

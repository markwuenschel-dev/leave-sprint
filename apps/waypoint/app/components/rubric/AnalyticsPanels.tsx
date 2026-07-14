"use client";

/**
 * Non-line analytics for the Performance surface (inline SVG / CSS,
 * no charting dep):
 *  - SkillAreaBars  : ranked avg-final per task type (where you stand now)
 *  - GateBars       : pass/partial/fail per mandatory gate (status colors)
 *  - DomainRadar    : avg score across technical domains
 *  - ScoreHistogram : distribution of final scores, colored by pass band
 */

import type { SkillAreaStat, DomainStat, HistBin } from "@/lib/gaps";

const STATUS = { pass: "var(--green)", partial: "var(--yellow)", fail: "#ef4444" } as const;

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

"use client";

/**
 * Multi-line burndown / progress SVG. Ported from rBurndownSVG / pgBurndownSVG.
 * Each series is an array of (number | null) values indexed by day; nulls create
 * gaps. Includes an optional "today" marker.
 */

export interface BurndownSeries {
  points: (number | null)[];
  color: string;
  dashed?: boolean;
  label?: string;
}

export interface BurndownMarker {
  index: number;
  label: string;
  color?: string;
}

interface BurndownProps {
  series: BurndownSeries[];
  maxY: number;
  width?: number;
  height?: number;
  todayIndex?: number;
  xLabels?: string[];
  markers?: BurndownMarker[];
}

export function Burndown({ series, maxY, width = 620, height = 200, todayIndex, xLabels, markers }: BurndownProps) {
  const pad = { top: 16, right: 16, bottom: 26, left: 32 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const nDays = Math.max(...series.map((s) => s.points.length), 1);

  const x = (i: number) => pad.left + (i / Math.max(nDays - 1, 1)) * plotW;
  const y = (v: number) => pad.top + plotH - (v / (maxY || 1)) * plotH;

  const pathFor = (pts: (number | null)[]) => {
    let d = "";
    let pen = false;
    pts.forEach((v, i) => {
      if (v === null || v === undefined) {
        pen = false;
        return;
      }
      d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)} `;
      pen = true;
    });
    return d.trim();
  };

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(maxY * f));

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="max-w-full">
      {yTicks.map((v) => (
        <g key={v}>
          <line x1={pad.left} y1={y(v)} x2={width - pad.right} y2={y(v)} stroke="var(--border)" strokeWidth={1} opacity={0.4} />
          <text x={pad.left - 6} y={y(v)} textAnchor="end" dominantBaseline="middle" fontSize={9} fill="var(--text-dim)" className="font-mono">
            {v}
          </text>
        </g>
      ))}

      {todayIndex !== undefined && todayIndex >= 0 && (
        <line x1={x(todayIndex)} y1={pad.top} x2={x(todayIndex)} y2={pad.top + plotH} stroke="var(--magenta)" strokeWidth={1} strokeDasharray="3 3" opacity={0.7} />
      )}

      {markers?.map((m, i) => (
        <g key={`m${i}`}>
          <line x1={x(m.index)} y1={pad.top} x2={x(m.index)} y2={pad.top + plotH} stroke={m.color ?? "var(--text-dim)"} strokeWidth={1} strokeDasharray="2 3" opacity={0.5} />
          <text x={x(m.index)} y={pad.top - 4} textAnchor="middle" fontSize={8} fill={m.color ?? "var(--text-dim)"} className="font-mono">
            {m.label}
          </text>
        </g>
      ))}

      {series.map((s, i) => (
        <path key={i} d={pathFor(s.points)} fill="none" stroke={s.color} strokeWidth={2} strokeDasharray={s.dashed ? "5 4" : undefined} strokeLinejoin="round" strokeLinecap="round" />
      ))}

      {xLabels &&
        xLabels.map((lbl, i) =>
          lbl ? (
            <text key={i} x={x(i)} y={height - 8} textAnchor="middle" fontSize={9} fill="var(--text-dim)" className="font-mono">
              {lbl}
            </text>
          ) : null,
        )}
    </svg>
  );
}

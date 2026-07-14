"use client";

/**
 * A single-arc donut for a 0–100 score, with a tick at the pass line so the arc
 * reads against a real target rather than an abstract percentage. Centre content
 * is the caller's (normally the score itself).
 *
 * `score === null` renders the empty track as a dashed ring — "no evidence yet"
 * has to look different from "scored zero".
 */

import type { ReactNode } from "react";

export const PASS_LINE = 70;

/** Pass band → colour. Mirrors the bands the histogram uses. */
export function scoreColor(score: number | null): string {
  if (score == null) return "var(--text-dim)";
  if (score >= PASS_LINE) return "var(--green)";
  if (score >= 60) return "var(--yellow)";
  return "#ef4444";
}

export function ScoreDonut({
  score,
  size = 136,
  strokeWidth = 12,
  center,
  label,
}: {
  /** 0–100, or null when there's nothing graded. */
  score: number | null;
  size?: number;
  strokeWidth?: number;
  center?: ReactNode;
  label: string;
}) {
  const c = size / 2;
  const r = c - strokeWidth / 2 - 2;
  const circ = 2 * Math.PI * r;
  const v = score == null ? 0 : Math.max(0, Math.min(1, score / 100));
  // Arc starts at 12 o'clock, so the pass line sits 70% of the way round.
  const tickAngle = -90 + (PASS_LINE / 100) * 360;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={label}
      className="shrink-0"
    >
      <g transform={`rotate(-90 ${c} ${c})`}>
        <circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke="var(--fill-strong)"
          strokeWidth={strokeWidth}
          strokeDasharray={score == null ? "3 6" : undefined}
        />
        {score != null ? (
          <circle
            cx={c}
            cy={c}
            r={r}
            fill="none"
            stroke={scoreColor(score)}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${circ * v} ${circ * (1 - v)}`}
            className="transition-all duration-500"
          />
        ) : null}
      </g>
      {score != null ? (
        <line
          x1={c}
          y1={c - r - strokeWidth / 2 - 1}
          x2={c}
          y2={c - r + strokeWidth / 2 + 1}
          stroke="var(--text-dim)"
          strokeWidth={2}
          transform={`rotate(${tickAngle + 90} ${c} ${c})`}
        >
          <title>Pass line — {PASS_LINE}</title>
        </line>
      ) : null}
      {center ? (
        <foreignObject x={0} y={0} width={size} height={size}>
          <div className="flex h-full w-full items-center justify-center">{center}</div>
        </foreignObject>
      ) : null}
    </svg>
  );
}

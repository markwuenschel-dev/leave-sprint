"use client";

/**
 * Concentric progress rings (activity-rings style) for the per-role readiness
 * floor: one ring per dimension, outer → inner, plus centered content.
 */

export interface FloorRing {
  /** 0..1 progress toward this dimension's floor. */
  value: number;
  color: string;
}

export function FloorRings({
  rings,
  size = 132,
  strokeWidth = 10,
  gap = 3,
  center,
  label,
}: {
  /** Outer ring first. */
  rings: FloorRing[];
  size?: number;
  strokeWidth?: number;
  /** Gap between rings, px. */
  gap?: number;
  center?: React.ReactNode;
  label?: string;
}) {
  const c = size / 2;
  const outerR = c - strokeWidth / 2;

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
        {rings.map((ring, i) => {
          const r = outerR - i * (strokeWidth + gap);
          if (r <= 0) return null;
          const circ = 2 * Math.PI * r;
          const v = Math.max(0, Math.min(1, ring.value));
          return (
            <g key={i}>
              <circle
                cx={c}
                cy={c}
                r={r}
                fill="none"
                stroke="var(--fill-strong)"
                strokeWidth={strokeWidth}
              />
              <circle
                cx={c}
                cy={c}
                r={r}
                fill="none"
                stroke={ring.color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={`${circ * v} ${circ * (1 - v)}`}
                className="transition-all duration-500"
              />
            </g>
          );
        })}
      </g>
      {center ? (
        <foreignObject x={0} y={0} width={size} height={size}>
          <div className="flex h-full w-full items-center justify-center">{center}</div>
        </foreignObject>
      ) : null}
    </svg>
  );
}

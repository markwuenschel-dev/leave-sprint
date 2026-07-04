"use client";

/** Tiny inline trend line (SVG). Ported from rSparkline. */

interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
  min?: number;
  max?: number;
}

export function Sparkline({ values, width = 120, height = 36, color = "var(--cyan)", min = 0, max = 100 }: SparklineProps) {
  const PAD = 4;
  if (!values.length) return <span className="text-[var(--text-dim)] text-xs">—</span>;

  const lo = Math.min(...values, min);
  const hi = Math.max(...values, max);
  const range = hi - lo || 1;

  const pts = values.map((s, i) => {
    const x = PAD + (i / Math.max(values.length - 1, 1)) * (width - PAD * 2);
    const y = height - PAD - ((s - lo) / range) * (height - PAD * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const last = values[values.length - 1];
  const [lx, ly] = pts[pts.length - 1].split(",").map(Number);

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lx} cy={ly} r={2.5} fill={color} />
      <title>{`latest ${last}`}</title>
    </svg>
  );
}

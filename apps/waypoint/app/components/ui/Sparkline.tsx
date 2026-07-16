"use client";

/** Minimal 0–100 line sparkline (SVG), no wrapper/label/footer — just the chart. */

interface SparklineProps {
  values: (number | null)[];
  color?: string;
  width?: number;
  height?: number;
  passLine?: number | null;
}

export function Sparkline({
  values,
  color = "var(--cyan)",
  width = 168,
  height = 46,
  passLine = 70,
}: SparklineProps) {
  const pad = 4;
  const n = values.length;
  let lastIdx = -1;
  for (let i = n - 1; i >= 0; i--) {
    if (values[i] != null) {
      lastIdx = i;
      break;
    }
  }
  const last = lastIdx >= 0 ? (values[lastIdx] as number) : null;

  const x = (i: number) =>
    pad + (n <= 1 ? (width - 2 * pad) / 2 : (i / (n - 1)) * (width - 2 * pad));
  const y = (v: number) => pad + (1 - Math.max(0, Math.min(100, v)) / 100) * (height - 2 * pad);

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

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      role="img"
      aria-label={`Score trend over ${n} assessments, latest ${last ?? "n/a"}`}
    >
      {passLine != null ? (
        <line
          x1={pad}
          x2={width - pad}
          y1={y(passLine)}
          y2={y(passLine)}
          stroke="var(--green)"
          strokeWidth={1}
          strokeDasharray="3 3"
          opacity={0.45}
        />
      ) : null}
      <path d={d.trim()} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {last != null ? <circle cx={x(lastIdx)} cy={y(last)} r={2.75} fill={color} /> : null}
    </svg>
  );
}

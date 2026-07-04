"use client";

/**
 * Radar / spider chart (SVG). Ported from rSpider. Plots N axes with values
 * normalised 0–100. Pure presentational.
 */

interface RadarProps {
  labels: string[];
  values: (number | null)[]; // 0–100 per axis
  size?: number;
  color?: string;
  showLabels?: boolean;
}

export function Radar({ labels, values, size = 220, color = "var(--cyan)", showLabels = true }: RadarProps) {
  const n = labels.length;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - (showLabels ? 42 : 8);
  const rings = [0.25, 0.5, 0.75, 1];

  const angleFor = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const point = (i: number, radius: number) => {
    const a = angleFor(i);
    return [cx + radius * Math.cos(a), cy + radius * Math.sin(a)] as const;
  };

  const gridPoly = (frac: number) =>
    labels.map((_, i) => point(i, r * frac).join(",")).join(" ");

  const dataPoly = values
    .map((v, i) => point(i, r * ((v ?? 0) / 100)).join(","))
    .join(" ");

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
      {rings.map((frac) => (
        <polygon key={frac} points={gridPoly(frac)} fill="none" stroke="var(--border)" strokeWidth={1} opacity={0.6} />
      ))}
      {labels.map((_, i) => {
        const [x, y] = point(i, r);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--border)" strokeWidth={1} opacity={0.4} />;
      })}
      <polygon points={dataPoly} fill={color} fillOpacity={0.18} stroke={color} strokeWidth={2} />
      {values.map((v, i) => {
        const [x, y] = point(i, r * ((v ?? 0) / 100));
        return <circle key={i} cx={x} cy={y} r={2.5} fill={color} />;
      })}
      {showLabels &&
        labels.map((label, i) => {
          const [x, y] = point(i, r + 16);
          const anchor = Math.abs(x - cx) < 4 ? "middle" : x > cx ? "start" : "end";
          return (
            <text
              key={i}
              x={x}
              y={y}
              textAnchor={anchor}
              dominantBaseline="middle"
              fontSize={10}
              fill="var(--text-mid)"
              className="font-mono"
            >
              {label}
            </text>
          );
        })}
    </svg>
  );
}

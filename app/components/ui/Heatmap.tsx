"use client";

/**
 * Contribution-graph style heatmap. Each cell has a 0..1 intensity; empty cells
 * read as a faint surface square, filled cells tint toward `accent`. Theme-aware
 * via color-mix so it works in dark and parchment.
 */

export interface HeatCell {
  day: number;
  value: number; // 0..1
  title?: string;
}

interface HeatmapProps {
  cells: HeatCell[];
  columns?: number;
  accent?: string;
}

export function Heatmap({ cells, columns = 7, accent = "var(--green)" }: HeatmapProps) {
  return (
    <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
      {cells.map((c) => {
        const bg =
          c.value <= 0
            ? "var(--surface-2)"
            : `color-mix(in srgb, ${accent} ${Math.round(18 + c.value * 72)}%, transparent)`;
        return (
          <div
            key={c.day}
            title={c.title ?? `Day ${c.day} · ${Math.round(c.value * 100)}%`}
            className="aspect-square rounded-md border border-[var(--hairline)] flex items-center justify-center"
            style={{ background: bg }}
          >
            <span className="text-[9px] font-mono text-[var(--text-dim)]">{c.day}</span>
          </div>
        );
      })}
    </div>
  );
}

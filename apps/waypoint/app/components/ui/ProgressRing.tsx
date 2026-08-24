"use client";

/** Circular progress ring (SVG). */

interface ProgressRingProps {
  value: number; // 0–100
  size?: number;
  stroke?: number;
  color?: string;
  trackColor?: string;
  children?: React.ReactNode;
}

export function ProgressRing({
  value,
  size = 64,
  stroke = 6,
  color = "var(--cyan)",
  trackColor = "var(--border)",
  children,
}: ProgressRingProps) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = circ - (clamped / 100) * circ;

  return (
    <div
      className="relative inline-flex max-w-full items-center justify-center"
      style={{ width: size, height: size }}
    >
      {/* viewBox + max-w-full so the ring shrinks with a narrow container rather than
          overflowing it; previously it only fitted because every call site was small. */}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90 h-auto max-w-full"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={trackColor}
          strokeWidth={stroke}
          opacity={0.5}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          className="progress-ring"
        />
      </svg>
      {children !== undefined ? (
        <div className="absolute inset-0 flex items-center justify-center">{children}</div>
      ) : null}
    </div>
  );
}

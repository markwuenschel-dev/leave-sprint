import type { ReactNode } from "react";

export const card =
  "rounded-2xl border border-[var(--hairline)] bg-[var(--surface)] p-5";

export const cardGlass =
  "rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface)_78%,transparent)] p-5 backdrop-blur-xl";

export const inputClass =
  "w-full bg-transparent border border-[var(--hairline)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[var(--cyan)]";

export const selectClass =
  "bg-[var(--bg)] border border-[var(--hairline)] rounded-lg px-2 py-1 text-sm";

/** Subtle neon panel used for hero headers */
export function SurfaceHero({
  eyebrow,
  title,
  subtitle,
  accent = "cyan",
  right,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: ReactNode;
  accent?: "cyan" | "magenta" | "green" | "violet";
  right?: ReactNode;
}) {
  const glow =
    accent === "magenta"
      ? "from-[var(--magenta)]/20"
      : accent === "green"
        ? "from-[var(--green)]/20"
        : accent === "violet"
          ? "from-[var(--violet)]/20"
          : "from-[var(--cyan)]/20";

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-[var(--hairline)] bg-[var(--surface)] p-5 sm:p-6`}
    >
      <div
        className={`pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-gradient-to-br ${glow} to-transparent blur-2xl`}
        aria-hidden
      />
      <div
        className={`pointer-events-none absolute -bottom-16 -left-10 h-36 w-36 rounded-full bg-gradient-to-tr ${glow} to-transparent opacity-60 blur-2xl`}
        aria-hidden
      />
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          {eyebrow ? (
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-dim)]">
              {eyebrow}
            </div>
          ) : null}
          <h2 className="text-2xl font-semibold tracking-tight sm:text-[1.65rem]">{title}</h2>
          {subtitle ? (
            <div className="mt-1.5 max-w-xl text-sm leading-relaxed text-[var(--text-mid)]">
              {subtitle}
            </div>
          ) : null}
        </div>
        {right ? <div className="relative shrink-0">{right}</div> : null}
      </div>
    </div>
  );
}

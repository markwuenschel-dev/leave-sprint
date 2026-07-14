"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface FlashcardLayer {
  label: string;
  content: ReactNode;
  tone?: "default" | "accent" | "warn" | "muted";
}

interface FlashcardProps {
  question: ReactNode;
  meta?: ReactNode;
  layers: FlashcardLayer[];
  revealed: boolean[];
  onToggle: (index: number) => void;
  footer?: ReactNode;
}

const toneStyles: Record<NonNullable<FlashcardLayer["tone"]>, string> = {
  default: "border-l-[var(--cyan)] bg-[var(--tint-cyan)]",
  accent: "border-l-[var(--magenta)] bg-[var(--tint-magenta)]",
  warn: "border-l-[var(--orange)] bg-[var(--tint-orange)]",
  muted: "border-l-[var(--text-dim)] bg-[var(--fill-subtle)]",
};

export function Flashcard({
  question,
  meta,
  layers,
  revealed,
  onToggle,
  footer,
}: FlashcardProps) {
  const revealedCount = revealed.filter(Boolean).length;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-[var(--hairline)] bg-[var(--surface)] shadow-[0_0_0_1px_color-mix(in_srgb,var(--cyan)_8%,transparent)]">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--cyan)] to-transparent opacity-60"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-20 top-0 h-40 w-40 rounded-full bg-[var(--cyan)]/10 blur-3xl"
        aria-hidden
      />

      <div className="relative p-5 sm:p-7">
        {meta ? (
          <div className="mb-3 flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-dim)]">
            {meta}
            {layers.length > 0 ? (
              <span className="rounded-full border border-[var(--hairline)] px-2 py-0.5 font-mono normal-case tracking-normal text-[var(--text-mid)]">
                {revealedCount}/{layers.length} revealed
              </span>
            ) : null}
          </div>
        ) : null}

        <div className="mb-6 text-xl font-semibold leading-snug tracking-tight text-[var(--text)] sm:text-2xl">
          {question}
        </div>

        <div className="space-y-2.5">
          {layers.map((layer, i) => (
            <div key={i}>
              {revealed[i] ? (
                <div
                  className={cn(
                    "rounded-2xl border border-[var(--hairline)] border-l-4 p-4 text-sm leading-relaxed text-[var(--text-mid)] animate-in fade-in",
                    toneStyles[layer.tone ?? "default"],
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onToggle(i)}
                    className="group mb-2 flex w-full items-center justify-between gap-3 text-left text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-dim)] hover:text-[var(--text-mid)]"
                    title={`Hide ${layer.label}`}
                  >
                    <span>{layer.label}</span>
                    <span className="font-mono normal-case tracking-normal opacity-0 transition group-hover:opacity-100">
                      hide ×
                    </span>
                  </button>
                  <div className="text-[var(--text)]/90">{layer.content}</div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => onToggle(i)}
                  className="group flex w-full items-center justify-between gap-3 rounded-2xl border border-dashed border-[var(--hairline-strong)] bg-[var(--fill-subtle)] px-4 py-3 text-left text-xs font-medium text-[var(--text-dim)] transition-all hover:border-[var(--cyan)]/50 hover:bg-[var(--tint-cyan)] hover:text-[var(--cyan)]"
                >
                  <span>Reveal {layer.label}</span>
                  <span className="font-mono text-[var(--text-dim)] transition group-hover:text-[var(--cyan)]">
                    →
                  </span>
                </button>
              )}
            </div>
          ))}
        </div>

        {footer ? (
          <div className="mt-6 border-t border-[var(--hairline)] pt-5">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}

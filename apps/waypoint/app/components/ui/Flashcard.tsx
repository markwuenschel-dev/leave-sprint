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
  default: "border-l-[var(--cyan)] bg-[var(--surface)]",
  accent: "border-l-[var(--magenta)] bg-[var(--magenta)]/5",
  warn: "border-l-[var(--orange)] bg-[var(--orange)]/5",
  muted: "border-l-[var(--border)] bg-[var(--bg-elev)]",
};

export function Flashcard({ question, meta, layers, revealed, onToggle, footer }: FlashcardProps) {
  return (
    <div className="card-glass p-6">
      {meta ? (
        <div className="mb-2 text-xs uppercase tracking-widest text-[var(--text-dim)]">{meta}</div>
      ) : null}
      <div className="mb-5 text-lg font-medium leading-snug">{question}</div>

      <div className="space-y-2">
        {layers.map((layer, i) => (
          <div key={i}>
            {revealed[i] ? (
              <div
                className={cn(
                  "rounded-2xl border-l-4 p-4 text-sm leading-relaxed text-[var(--text-mid)]",
                  toneStyles[layer.tone ?? "default"],
                )}
              >
                <div className="mb-1.5 text-[10px] uppercase tracking-widest text-[var(--text-dim)]">
                  {layer.label}
                </div>
                {layer.content}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onToggle(i)}
                className="w-full rounded-2xl border border-dashed border-[var(--hairline)] px-4 py-2.5 text-left text-xs text-[var(--text-dim)] transition-all hover:border-[var(--cyan)]/40 hover:text-[var(--text-mid)]"
              >
                Reveal {layer.label} →
              </button>
            )}
          </div>
        ))}
      </div>

      {footer ? <div className="mt-6">{footer}</div> : null}
    </div>
  );
}

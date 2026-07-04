"use client";

/**
 * Progressive-reveal flashcard. Ported from renderQBCard / the Quiz Mode card.
 * Presentational: the parent owns which layers are revealed (so it can wire
 * keyboard shortcuts) and passes revealed[]/onToggle.
 */

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
      {meta && <div className="text-xs uppercase tracking-widest text-[var(--text-dim)] mb-2">{meta}</div>}
      <div className="text-lg font-medium leading-snug mb-5">{question}</div>

      <div className="space-y-2">
        {layers.map((layer, i) => (
          <div key={i}>
            {revealed[i] ? (
              <div className={cn("rounded-2xl border-l-4 p-4 text-sm text-[var(--text-mid)] leading-relaxed", toneStyles[layer.tone ?? "default"])}>
                <div className="text-[10px] uppercase tracking-widest text-[var(--text-dim)] mb-1.5">{layer.label}</div>
                {layer.content}
              </div>
            ) : (
              <button
                onClick={() => onToggle(i)}
                className="w-full text-left rounded-2xl border border-dashed border-[var(--hairline)] px-4 py-2.5 text-xs text-[var(--text-dim)] hover:border-[var(--cyan)]/40 hover:text-[var(--text-mid)] transition-all"
              >
                Reveal {layer.label} →
              </button>
            )}
          </div>
        ))}
      </div>

      {footer && <div className="mt-6">{footer}</div>}
    </div>
  );
}

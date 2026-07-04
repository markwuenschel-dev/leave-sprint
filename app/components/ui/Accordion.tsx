"use client";

/** Collapsible section. Ported from rAccordion (native <details>). */

import type { ReactNode } from "react";

interface AccordionProps {
  title: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function Accordion({ title, defaultOpen = false, children }: AccordionProps) {
  return (
    <details open={defaultOpen} className="group rounded-2xl border border-[var(--hairline)] bg-[var(--surface)] overflow-hidden">
      <summary className="cursor-pointer list-none px-5 py-3.5 flex items-center justify-between text-sm font-medium hover:bg-[var(--fill-subtle)] transition-colors">
        <span>{title}</span>
        <span className="text-[var(--text-dim)] transition-transform group-open:rotate-90">›</span>
      </summary>
      <div className="px-5 pb-5 pt-1 text-sm text-[var(--text-mid)] leading-relaxed">{children}</div>
    </details>
  );
}

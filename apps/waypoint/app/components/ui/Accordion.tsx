"use client";

import type { ReactNode } from "react";

interface AccordionProps {
  title: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function Accordion({ title, defaultOpen = false, children }: AccordionProps) {
  return (
    <details
      open={defaultOpen}
      className="group overflow-hidden rounded-2xl border border-[var(--hairline)] bg-[var(--surface)]"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-3.5 text-sm font-medium transition-colors hover:bg-[var(--fill-subtle)]">
        <span>{title}</span>
        <span className="text-[var(--text-dim)] transition-transform group-open:rotate-90">›</span>
      </summary>
      <div className="px-5 pb-5 pt-1 text-sm leading-relaxed text-[var(--text-mid)]">{children}</div>
    </details>
  );
}

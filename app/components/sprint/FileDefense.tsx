"use client";

import { useSprintStore } from "@/lib/store";
import { Check, Clock } from "lucide-react";

export function FileDefense() {
  const { fileDefense, markFilePracticed, updateFileNotes } = useSprintStore();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="section-title">FILE DEFENSE — KNOW EVERY FILE COLD</div>
          <div className="text-sm text-[var(--text-mid)]">
            {fileDefense.length} files · practice at interview speed (45–90s each)
          </div>
        </div>
      </div>

      {fileDefense.map((f) => (
        <div key={f.id} className="rounded-3xl border border-[var(--hairline)] bg-[var(--surface)] p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="font-mono font-semibold text-[15px] text-[var(--cyan)]">{f.title}</div>
              <div className="text-sm text-[var(--text-mid)] mt-1">{f.why}</div>
            </div>
            <button
              onClick={() => markFilePracticed(f.id)}
              className="btn text-xs shrink-0"
              title="Mark practiced today"
            >
              <Check size={14} /> Practiced
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <div className="rounded-xl bg-[var(--bg-elev)] border border-[var(--hairline)] p-3">
              <div className="text-[10px] uppercase tracking-widest text-[var(--text-dim)] mb-1">Terminology</div>
              <div className="text-sm text-[var(--text-mid)]">{f.terminology}</div>
            </div>
            <div className="rounded-xl bg-[var(--bg-elev)] border border-[var(--hairline)] p-3">
              <div className="text-[10px] uppercase tracking-widest text-[var(--text-dim)] mb-1">Interview line</div>
              <div className="text-sm text-[var(--text-mid)] italic">“{f.interviewLine}”</div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 mt-3">
            <div className="flex items-center gap-2 text-xs text-[var(--text-dim)] font-mono">
              <Clock size={13} />
              {f.practicedDates.length ? `Practiced ${f.practicedDates.length}× · last ${f.practicedDates[f.practicedDates.length - 1]}` : "Not practiced yet"}
            </div>
          </div>

          <input
            value={f.notes ?? ""}
            onChange={(e) => updateFileNotes(f.id, e.target.value)}
            placeholder="Notes…"
            className="w-full mt-3 rounded-xl bg-[var(--bg-elev)] border border-[var(--hairline)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--cyan)]"
          />
        </div>
      ))}
    </div>
  );
}

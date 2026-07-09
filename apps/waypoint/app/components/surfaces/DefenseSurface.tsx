"use client";

import { useMemo } from "react";
import { Check, Clock } from "lucide-react";
import { useWaypointStore } from "@/lib/store";
import { ProgressRing } from "../ui/ProgressRing";
import { card } from "./shared";

export function DefenseSurface() {
  const items = useWaypointStore((s) => s.fileDefense);
  const filter = useWaypointStore((s) => s.roleFilter);
  const mark = useWaypointStore((s) => s.markDefensePracticed);
  const setNotes = useWaypointStore((s) => s.setDefenseNotes);

  const list = useMemo(
    () =>
      items.filter((p) => {
        if (filter === "ALL") return true;
        if (!p.roleTrack || p.roleTrack === "BOTH") return true;
        return p.roleTrack === filter;
      }),
    [items, filter],
  );

  const practiced = list.filter((f) => (f.practicedDates?.length ?? 0) > 0).length;
  const core = list.filter((f) => f.core);
  const coreDone = core.filter((f) => (f.practicedDates?.length ?? 0) > 0).length;
  const pct = list.length ? Math.round((practiced / list.length) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Defense</h2>
          <p className="mt-1 text-sm text-[var(--text-dim)]">
            {list.length} files · practice at interview speed (45–90s each) · core{" "}
            {coreDone}/{core.length}
          </p>
        </div>
        <div className={`${card} flex items-center gap-3 py-3`}>
          <ProgressRing value={pct} size={56} color="var(--magenta)">
            <span className="text-[11px] font-semibold">{practiced}</span>
          </ProgressRing>
          <div className="text-xs text-[var(--text-dim)]">practiced ≥1×</div>
        </div>
      </div>

      {list.map((f) => {
        const n = f.practicedDates?.length ?? 0;
        const last = n ? f.practicedDates[n - 1] : null;
        return (
          <div key={f.id} className={card}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-mono text-[15px] font-semibold text-[var(--cyan)]">
                  {f.title}{" "}
                  {f.core ? <span className="font-sans text-xs text-[var(--cyan)]">core</span> : null}
                </div>
                <div className="mt-1 text-sm text-[var(--text-mid)]">{f.why}</div>
              </div>
              <button
                type="button"
                onClick={() => mark(f.id)}
                className="btn shrink-0 text-xs"
                title="Mark practiced today"
              >
                <Check size={14} /> Practiced
              </button>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-[var(--hairline)] bg-[var(--bg-elev)] p-3">
                <div className="mb-1 text-[10px] uppercase tracking-widest text-[var(--text-dim)]">
                  Terminology
                </div>
                <div className="text-sm text-[var(--text-mid)]">{f.terminology}</div>
              </div>
              <div className="rounded-xl border border-[var(--hairline)] bg-[var(--bg-elev)] p-3">
                <div className="mb-1 text-[10px] uppercase tracking-widest text-[var(--text-dim)]">
                  Interview line
                </div>
                <div className="text-sm italic text-[var(--text-mid)]">“{f.interviewLine}”</div>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2 font-mono text-xs text-[var(--text-dim)]">
              <Clock size={13} />
              {last ? `Practiced ${n}× · last ${last}` : "Not practiced yet"}
              {f.roleTrack ? ` · ${f.roleTrack}` : ""}
            </div>

            <input
              value={f.notes ?? ""}
              onChange={(e) => setNotes(f.id, e.target.value)}
              placeholder="Notes…"
              className="mt-3 w-full rounded-xl border border-[var(--hairline)] bg-[var(--bg-elev)] px-3 py-2 text-sm focus:border-[var(--cyan)] focus:outline-none"
            />
          </div>
        );
      })}
    </div>
  );
}

"use client";

/**
 * Sprint Calendar + Day Detail
 *
 * Color-coded July 2026 grid driven by live store data.
 * Status derived from rhythm completion %:
 *   full    → green
 *   partial → cyan
 *   none    → yellow / at-risk
 */

import { useSprintStore, getDayCompletion } from "@/lib/store";
import { getDateForDay, formatDayDate } from "@/lib/types";
import { DAY_PLANS } from "@/data/day-plans";
import { useState } from "react";

export function Calendar() {
  const { days } = useSprintStore();
  const [selectedDay, setSelectedDay] = useState<number | null>(17); // July 3-ish

  const daysInSprint = Array.from({ length: 29 }, (_, i) => i + 1);

  function getStatus(day: number) {
    const pct = getDayCompletion(days[day]);
    if (pct === 100) return "full";
    if (pct > 0) return "partial";
    return "at-risk";
  }

  const selected = selectedDay ? days[selectedDay] : null;
  const plan = selectedDay ? (DAY_PLANS[selectedDay] || { focus: "Prep" }) : null;

  return (
    <div>
      <div className="section-title mb-3">JULY 2026 — SPRINT CALENDAR</div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] mb-3">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i} className="text-[var(--text-dim)] py-1">{d}</div>
        ))}
      </div>

      {/* Simple grid - start on Wed for Jun 17 but we render all sprint days in rows */}
      <div className="grid grid-cols-7 gap-1.5">
        {daysInSprint.map((d) => {
          const status = getStatus(d);
          const isSel = d === selectedDay;
          return (
            <button
              key={d}
              onClick={() => setSelectedDay(d)}
              className={`cal-day text-left ${status} ${isSel ? "ring-1 ring-[var(--cyan)]" : ""}`}
            >
              <div className="flex justify-between">
                <span className="font-mono text-[10px] opacity-60">D{d}</span>
                <span className="font-mono tabular-nums">{formatDayDate(d).split(" ")[1]}</span>
              </div>
              <div className="mt-auto text-[9px] text-[var(--text-dim)] truncate">
                {DAY_PLANS[d]?.focus?.slice(0, 18) || "—"}
              </div>
              <div className="mt-1 flex gap-px">
                <span className={`status-dot ${status === "full" ? "green" : status === "partial" ? "cyan" : "yellow"}`} />
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected day detail */}
      {selectedDay && (
        <div className="mt-5 card-glass text-sm">
          <div className="font-semibold mb-1 flex items-center gap-2">
            DAY {selectedDay} — {formatDayDate(selectedDay)} <span className="text-xs font-normal text-[var(--text-mid)]">({plan?.focus})</span>
          </div>

          {selected && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-[var(--text-mid)]">
              {(["coding", "file", "qa", "build"] as const).map((k) => (
                <div key={k} className="flex justify-between border-b border-white/10 py-px">
                  <span className="capitalize">{k}</span>
                  <span className={selected.rhythm[k] ? "text-[var(--done)]" : "text-[var(--text-dim)]"}>
                    {selected.rhythm[k] ? "✓" : "○"}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="text-[10px] mt-3 text-[var(--cyan)] cursor-pointer" onClick={() => alert("Full day block view will link here in next iteration.")}>
            Go to full day block →
          </div>
        </div>
      )}

      <div className="mt-3 text-[10px] text-[var(--text-dim)]">Green = full rhythm • Cyan = partial • Yellow = nothing done</div>
    </div>
  );
}

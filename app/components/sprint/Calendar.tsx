"use client";

import { useSprintStore, getDayCompletion } from "@/lib/store";
import { getDateForDay, formatDayDate } from "@/lib/types";
import { DAY_PLANS } from "@/data/day-plans";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X } from "lucide-react";

export function Calendar() {
  const { days, updateDayRhythm } = useSprintStore();
  const [selectedDay, setSelectedDay] = useState<number | null>(17);

  const daysInSprint = Array.from({ length: 29 }, (_, i) => i + 1);

  function getStatus(day: number) {
    const pct = getDayCompletion(days[day]);
    if (pct === 100) return "full";
    if (pct > 0) return "partial";
    return "at-risk";
  }

  const selected = selectedDay ? days[selectedDay] : null;
  const plan = selectedDay ? (DAY_PLANS[selectedDay] || { focus: "Prep" }) : null;

  const handleToggleRhythm = (key: "coding" | "file" | "qa" | "build") => {
    if (!selectedDay) return;
    const current = selected?.rhythm[key] ?? false;
    updateDayRhythm(selectedDay, key, !current);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="section-title">JULY 2026 — SPRINT CALENDAR</div>
          <div className="text-sm text-[var(--text-mid)]">Click any day to view or edit details</div>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2"><div className="status-dot green" /> Full rhythm</div>
          <div className="flex items-center gap-2"><div className="status-dot cyan" /> Partial</div>
          <div className="flex items-center gap-2"><div className="status-dot yellow" /> At risk</div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i} className="text-center text-[10px] font-mono text-[var(--text-dim)] py-1">{d}</div>
        ))}

        {daysInSprint.map((day) => {
          const status = getStatus(day);
          const isSelected = day === selectedDay;
          const dayData = days[day];

          return (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`
                group relative flex flex-col rounded-2xl border p-3 text-left transition-all min-h-[92px]
                ${isSelected ? "ring-1 ring-[var(--cyan)] border-[var(--cyan)]/50" : "border-white/10 hover:border-white/30"}
                ${status === "full" ? "bg-[var(--done)]/5 border-[var(--done)]/30" : ""}
                ${status === "partial" ? "bg-[var(--cyan)]/5 border-[var(--cyan)]/30" : ""}
                ${status === "at-risk" ? "bg-[var(--yellow)]/5 border-[var(--yellow)]/30" : ""}
              `}
            >
              <div className="flex justify-between items-start">
                <div className="font-mono text-xs text-[var(--text-dim)]">D{day}</div>
                <div className="text-[10px] font-mono text-[var(--text-mid)]">
                  {formatDayDate(day).split(" ")[1]}
                </div>
              </div>

              <div className="mt-auto">
                <div className="text-xs text-[var(--text-mid)] truncate">
                  {DAY_PLANS[day]?.focus?.slice(0, 22) || "—"}
                </div>
                
                {/* Rhythm dots */}
                <div className="flex gap-1 mt-2">
                  {(["coding", "file", "qa"] as const).map((key) => (
                    <div
                      key={key}
                      className={`h-1.5 w-1.5 rounded-full transition-all ${
                        dayData?.rhythm[key] 
                          ? "bg-[var(--done)]" 
                          : "bg-white/20 group-hover:bg-white/40"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Day Detail Panel */}
      <AnimatePresence>
        {selectedDay && selected && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            className="mt-6 card-glass"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-3">
                  <div className="text-2xl font-semibold tracking-tight">Day {selectedDay}</div>
                  <div className="text-sm text-[var(--text-mid)]">{formatDayDate(selectedDay)}</div>
                </div>
                <div className="text-[var(--text-mid)] mt-0.5">{plan?.focus}</div>
              </div>

              <button
                onClick={() => setSelectedDay(null)}
                className="text-[var(--text-dim)] hover:text-white p-1"
              >
                <X size={18} />
              </button>
            </div>

            {/* Rhythm Status */}
            <div className="mb-6">
              <div className="text-xs uppercase tracking-widest text-[var(--text-dim)] mb-3">RHYTHM STATUS</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {(["coding", "file", "qa", "build"] as const).map((key) => {
                  const checked = selected.rhythm[key];
                  return (
                    <button
                      key={key}
                      onClick={() => handleToggleRhythm(key)}
                      className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm transition-all ${
                        checked 
                          ? "border-[var(--done)]/40 bg-[var(--done)]/5" 
                          : "border-white/10 hover:border-white/30"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="capitalize">{key}</span>
                      </div>
                      {checked ? (
                        <Check className="h-4 w-4 text-[var(--done)]" />
                      ) : (
                        <div className="h-4 w-4 rounded border border-white/30" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Focus Note Summary */}
            {selected.focusNote && (
              <div className="mb-6">
                <div className="text-xs uppercase tracking-widest text-[var(--text-dim)] mb-2">FOCUS NOTE</div>
                <div className="text-sm text-[var(--text-mid)] bg-white/5 rounded-2xl p-4">
                  {selected.focusNote}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="flex gap-3">
              <button 
                onClick={() => {
                  // Future: navigate to full day view
                  alert("Full day block view coming soon");
                }}
                className="btn flex-1 justify-center"
              >
                View Full Day Block
              </button>
              <button 
                onClick={() => setSelectedDay(null)}
                className="btn flex-1 justify-center"
              >
                Close
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-4 text-[10px] text-[var(--text-dim)]">
        Green = Full rhythm complete • Cyan = Partial progress • Yellow = No rhythm items done
      </div>
    </div>
  );
}
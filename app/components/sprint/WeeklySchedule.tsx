"use client";

import { useState } from "react";
import { useSprintStore } from "@/lib/store";
import { getDayPlan, MILESTONES } from "@/data/day-plans";
import type { RhythmKey } from "@/lib/types";
import { getDateForDay } from "@/lib/types";
import { Check, ChevronDown } from "lucide-react";

const DISCIPLINES: { key: RhythmKey; icon: string; label: string }[] = [
  { key: "coding", icon: "🔢", label: "Coding" },
  { key: "file", icon: "📁", label: "File Defense" },
  { key: "qa", icon: "🎤", label: "Q&A" },
  { key: "build", icon: "🔨", label: "Build" },
];

const WEEKS: { label: string; days: number[] }[] = [
  { label: "Week 1", days: [1, 2, 3, 4, 5, 6, 7] },
  { label: "Week 2", days: [8, 9, 10, 11, 12, 13, 14] },
  { label: "Week 3", days: [15, 16, 17, 18, 19, 20, 21] },
  { label: "Week 4", days: [22, 23, 24, 25, 26, 27, 28, 29] },
];

function currentSprintDay(): number {
  const start = getDateForDay(1).getTime();
  const d = Math.floor((Date.now() - start) / 86_400_000) + 1;
  return Math.min(29, Math.max(1, d));
}

export function WeeklySchedule() {
  const { days, updateDayRhythm } = useSprintStore();
  const today = currentSprintDay();
  const [openWeeks, setOpenWeeks] = useState<Set<string>>(() => new Set(WEEKS.filter((w) => w.days.includes(today)).map((w) => w.label)));

  const toggleWeek = (label: string) =>
    setOpenWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });

  const dayTaskDone = (day: number, key: RhythmKey) => Boolean(days[day]?.rhythm?.[key]);

  return (
    <div className="space-y-6">
      {/* Milestones */}
      <div className="card-glass p-5">
        <div className="section-title">MILESTONES</div>
        <div className="flex flex-wrap gap-3">
          {MILESTONES.map((m) => {
            const state = today > m.day ? "past" : today === m.day ? "current" : "future";
            return (
              <div
                key={m.day}
                className={`px-3 py-1.5 rounded-2xl text-sm border ${
                  state === "current"
                    ? "border-[var(--cyan)] text-[var(--cyan)] bg-[var(--cyan)]/10"
                    : state === "past"
                      ? "border-[var(--done)]/40 text-[var(--done)]"
                      : "border-[var(--hairline)] text-[var(--text-dim)]"
                }`}
              >
                <span className="font-mono text-xs mr-1.5">D{m.day}</span>
                {m.label}
              </div>
            );
          })}
        </div>
      </div>

      {/* Weeks */}
      {WEEKS.map((week) => {
        const open = openWeeks.has(week.label);
        const fullDays = week.days.filter((d) => {
          const r = days[d]?.rhythm;
          return r && r.coding && r.file && r.qa;
        }).length;
        return (
          <div key={week.label} className="rounded-3xl border border-[var(--hairline)] bg-[var(--surface-2)] overflow-hidden">
            <button onClick={() => toggleWeek(week.label)} className="w-full flex items-center justify-between px-5 py-4 hover:bg-[var(--fill-subtle)] transition-colors">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-lg">{week.label}</span>
                <span className="text-xs text-[var(--text-dim)] font-mono">
                  Day {week.days[0]}–{week.days[week.days.length - 1]}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--fill-subtle)] border border-[var(--hairline)] text-[var(--text-dim)]">{fullDays} full days</span>
              </div>
              <ChevronDown size={18} className={`text-[var(--text-dim)] transition-transform ${open ? "rotate-180" : ""}`} />
            </button>

            {open && (
              <div className="px-4 pb-4 space-y-3">
                {week.days.map((day) => {
                  const plan = getDayPlan(day);
                  const isToday = day === today;
                  return (
                    <div key={day} className={`rounded-2xl border p-4 ${isToday ? "border-[var(--cyan)]/40 bg-[var(--cyan)]/5" : "border-[var(--hairline)] bg-[var(--surface)]"}`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-baseline gap-2">
                          <span className="font-semibold">Day {day}</span>
                          <span className="text-xs text-[var(--text-dim)]">{plan.date}</span>
                          {isToday && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--cyan)] text-[var(--bg)] font-semibold">TODAY</span>}
                        </div>
                        <span className="text-xs text-[var(--text-mid)]">{plan.focus}</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {DISCIPLINES.map((disc) => {
                          const done = dayTaskDone(day, disc.key);
                          const item = plan[disc.key] as { title: string; time: string };
                          return (
                            <button
                              key={disc.key}
                              onClick={() => updateDayRhythm(day, disc.key, !done)}
                              className={`flex items-start gap-2.5 rounded-xl border p-2.5 text-left transition-all ${
                                done ? "border-[var(--done)]/40 bg-[var(--done)]/5" : "border-[var(--hairline)] hover:border-[var(--hairline-strong)]"
                              }`}
                            >
                              <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs ${done ? "bg-[var(--done)] border-[var(--done)] text-[var(--bg)]" : "border-[var(--hairline-strong)]"}`}>
                                {done ? <Check size={12} /> : disc.icon}
                              </span>
                              <span className="min-w-0">
                                <span className={`block text-sm leading-tight ${done ? "line-through text-[var(--text-dim)]" : "text-[var(--text)]"}`}>{item.title}</span>
                                <span className="block text-[10px] text-[var(--text-dim)] font-mono mt-0.5">
                                  {disc.label} · {item.time}
                                </span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

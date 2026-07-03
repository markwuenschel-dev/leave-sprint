"use client";

/**
 * Today / Daily Rhythm Card
 *
 * Highest daily-value component.
 * - Calculates current sprint day relative to June 17 2026
 * - Shows animated progress ring
 * - 4 synced rhythm checkboxes backed by Zustand
 * - Focus note, energy selector, journal
 */

import { useSprintStore, getDayCompletion } from "@/lib/store";
import { getDayPlan, MILESTONES } from "@/data/day-plans";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { Check, Target, Zap } from "lucide-react";
import type { RhythmKey } from "@/lib/types";

const RHYTHM_LABELS: Record<RhythmKey, { label: string; icon: React.ReactNode; desc: string }> = {
  coding: {
    label: "Coding Drill",
    icon: <span className="text-lg">🔢</span>,
    desc: "30m — solve + explain pattern aloud",
  },
  file: {
    label: "File Defense",
    icon: <span className="text-lg">📁</span>,
    desc: "20m — why it exists + terminology",
  },
  qa: {
    label: "Q&A Bank",
    icon: <span className="text-lg">🎤</span>,
    desc: "15m — answer aloud without notes",
  },
  build: {
    label: "Build Block",
    icon: <span className="text-lg">🔨</span>,
    desc: "Catch-up / project walkthrough prep",
  },
};

const KEYS: RhythmKey[] = ["coding", "file", "qa", "build"];

export function TodayRhythm() {
  const {
    days,
    updateDayRhythm,
    updateFocusNote,
    setEnergy,
    updateDayJournal,
  } = useSprintStore();

  // Determine current sprint day (July 3 2026 context → ~Day 17)
  // For demo robustness we compute relative to SPRINT_START
  const today = new Date(2026, 5, 17); // seed start
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - today.getTime()) / (1000 * 3600 * 24));
  const currentDay = Math.min(Math.max(diffDays + 1, 1), 29);

  const plan = getDayPlan(currentDay);
  const dayState = days[currentDay] || { rhythm: { coding: false, file: false, qa: false, build: false } };
  const completion = getDayCompletion(dayState);

  // Next milestone
  const nextMilestone = MILESTONES.find((m) => m.day >= currentDay) || MILESTONES[MILESTONES.length - 1];
  const daysToMs = Math.max(0, nextMilestone.day - currentDay);

  const progress = completion;
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const handleToggle = (key: RhythmKey) => {
    const current = dayState.rhythm[key];
    updateDayRhythm(currentDay, key, !current);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="text-4xl font-semibold tracking-tighter">DAY {currentDay}</div>
            <div className="rounded-full bg-white/5 px-3 py-0.5 text-xs font-mono text-[var(--text-mid)] border border-white/10">
              {plan.date} · 29
            </div>
          </div>
          <div className="text-[var(--text-mid)] mt-0.5">{plan.focus}</div>
        </div>

        {/* Progress Ring */}
        <div className="relative flex h-[108px] w-[108px] items-center justify-center">
          <svg className="h-[108px] w-[108px] -rotate-90" viewBox="0 0 110 110">
            <circle
              cx="55"
              cy="55"
              r={radius}
              fill="none"
              stroke="var(--border)"
              strokeWidth="7"
            />
            <motion.circle
              cx="55"
              cy="55"
              r={radius}
              fill="none"
              stroke="var(--cyan)"
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ type: "spring", stiffness: 80, damping: 18 }}
            />
          </svg>
          <div className="absolute text-center">
            <div className="text-3xl font-semibold tabular-nums">{progress}</div>
            <div className="text-[10px] tracking-[1px] text-[var(--text-dim)] -mt-1">COMPLETE</div>
          </div>
        </div>
      </div>

      {/* Next Milestone */}
      <div className="glass rounded-2xl border border-white/10 px-4 py-3 flex items-center gap-3 text-sm">
        <Target className="h-4 w-4 text-[var(--cyan)]" />
        <span className="font-medium text-[var(--cyan)]">{nextMilestone.label}</span>
        <span className="text-[var(--text-mid)]">
          {daysToMs === 0 ? "TODAY" : `in ${daysToMs}d`}
        </span>
      </div>

      {/* Rhythm Checklist */}
      <div>
        <div className="section-title mb-2">DAILY RHYTHM — TODAY</div>
        <div className="space-y-2">
          {KEYS.map((key) => {
            const item = RHYTHM_LABELS[key];
            const checked = dayState.rhythm[key];
            const title = key === "coding" ? plan.coding.title : key === "file" ? plan.file.title : key === "qa" ? plan.qa.title : plan.build.title;

            return (
              <motion.div
                whileTap={{ scale: 0.985 }}
                key={key}
                onClick={() => handleToggle(key)}
                className={`rhythm-item flex cursor-pointer items-start gap-3 ${checked ? "done" : ""}`}
              >
                <div className="pt-0.5">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => handleToggle(key)}
                    onClick={(e) => e.stopPropagation()}
                    className="h-[18px] w-[18px] accent-[var(--cyan)]"
                    aria-label={`Toggle ${item.label}`}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {item.icon}
                    <div className="font-medium">{item.label}</div>
                    <div className="ml-auto text-[10px] font-mono px-2 py-px rounded bg-white/5 text-[var(--text-dim)]">{key === "coding" ? plan.coding.time : key === "file" ? plan.file.time : key === "qa" ? plan.qa.time : plan.build.time}</div>
                  </div>
                  <div className="text-sm text-[var(--text-mid)] leading-snug mt-0.5 pr-2">
                    {title}
                  </div>
                  <div className="text-[10px] text-[var(--text-dim)] mt-px">{item.desc}</div>
                </div>

                {checked && (
                  <Check className="mt-1 h-4 w-4 text-[var(--done)]" />
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Focus + Energy + Journal */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Focus note */}
        <div className="card-glass">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest mb-2 text-[var(--text-dim)]">
            <Zap className="h-3.5 w-3.5" /> FOCUS NOTE
          </div>
          <textarea
            value={dayState.focusNote || ""}
            onChange={(e) => updateFocusNote(currentDay, e.target.value)}
            placeholder="One sentence intention for today's session..."
            className="w-full bg-transparent text-sm resize-y min-h-[60px] placeholder:text-[var(--text-dim)] focus:outline-none"
          />
        </div>

        {/* Energy selector */}
        <div className="card-glass">
          <div className="text-xs uppercase tracking-widest mb-2 text-[var(--text-dim)]">ENERGY</div>
          <div className="flex gap-2">
            {(["low", "medium", "high"] as const).map((e) => (
              <button
                key={e}
                onClick={() => setEnergy(currentDay, e)}
                className={`energy-btn flex-1 capitalize ${dayState.energy === e ? "active" : ""}`}
              >
                {e}
              </button>
            ))}
          </div>
          <div className="text-[10px] text-[var(--text-dim)] mt-2">
            Track honestly. Helps surface patterns over the remaining days.
          </div>
        </div>
      </div>

      {/* Journal */}
      <div className="card">
        <div className="flex justify-between items-center mb-2">
          <div className="text-xs uppercase tracking-[1.5px] text-[var(--text-dim)]">JOURNAL — DAY {currentDay}</div>
          <div className="text-[10px] text-[var(--text-dim)]">autosaves</div>
        </div>
        <textarea
          value={dayState.journal || ""}
          onChange={(e) => updateDayJournal(currentDay, e.target.value)}
          placeholder="What went well? What blocked you? Key realizations..."
          className="w-full min-h-[92px] bg-[#0f131a] border border-white/10 rounded-xl p-3 text-sm focus:outline-none placeholder:text-[var(--text-dim)]"
        />
      </div>
    </div>
  );
}

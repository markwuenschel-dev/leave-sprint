"use client";

import { useSprintStore, getDayCompletion } from "@/lib/store";
import { getDayPlan, MILESTONES } from "@/data/day-plans";
import { motion } from "framer-motion";
import { Check, Target, Zap } from "lucide-react";
import type { RhythmKey } from "@/lib/types";

const RHYTHM_CONFIG: Record<RhythmKey, { 
  label: string; 
  icon: React.ReactNode; 
  time: string;
  description: string;
}> = {
  coding: {
    label: "Coding Drill",
    icon: <span className="text-xl">🔢</span>,
    time: "30m",
    description: "Solve + explain pattern aloud",
  },
  file: {
    label: "File Defense",
    icon: <span className="text-xl">📁</span>,
    time: "20m",
    description: "Why it exists + key terminology",
  },
  qa: {
    label: "Q&A Bank",
    icon: <span className="text-xl">🎤</span>,
    time: "15m",
    description: "Answer aloud without notes",
  },
  build: {
    label: "Build Block",
    icon: <span className="text-xl">🔨</span>,
    time: "45m",
    description: "Project work or walkthrough prep",
  },
};

const RHYTHM_KEYS: RhythmKey[] = ["coding", "file", "qa", "build"];

export function TodayRhythm() {
  const {
    days,
    selectedDay,
    setSelectedDay,
    updateDayRhythm,
    updateFocusNote,
    setEnergy,
    updateDayJournal,
  } = useSprintStore();

  const getLiveDay = () => {
    const start = new Date(2026, 5, 17);
    const now = new Date();
    const diff = Math.floor((now.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1;
    return Math.min(Math.max(diff, 1), 29);
  };

  const plan = getDayPlan(selectedDay);
  const dayState = days[selectedDay] || {
    rhythm: { coding: false, file: false, qa: false, build: false },
  };
  const completion = getDayCompletion(dayState);

  const nextMilestone = MILESTONES.find((m) => m.day >= selectedDay) || MILESTONES[MILESTONES.length - 1];
  const daysToMs = Math.max(0, nextMilestone.day - selectedDay);

  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (completion / 100) * circumference;

  const handleToggle = (key: RhythmKey) => {
    const current = dayState.rhythm[key];
    updateDayRhythm(selectedDay, key, !current);
  };

  const isLiveDay = selectedDay === getLiveDay();

  // Safe display text getter (handles both title and prompt)
  const getDisplayText = (key: RhythmKey): string => {
    const item = plan[key as keyof typeof plan];
    if (!item || typeof item !== "object") return "—";

    if ("title" in item && typeof item.title === "string") return item.title;
    if ("prompt" in item && typeof item.prompt === "string") return item.prompt;

    return "—";
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-4">
            <div className="text-6xl font-semibold tracking-[-3px] tabular-nums">
              DAY {selectedDay}
            </div>
            <div className="rounded-2xl bg-[var(--fill-subtle)] px-4 py-1.5 text-sm font-mono border border-[var(--hairline)]">
              {plan.date}
            </div>
            {!isLiveDay && (
              <button
                onClick={() => setSelectedDay(getLiveDay())}
                className="flex items-center gap-2 rounded-2xl border border-[var(--cyan)] px-4 py-1.5 text-sm text-[var(--cyan)] hover:bg-[var(--cyan)]/10 active:scale-[0.985] transition-all"
              >
                <Target size={16} /> Go to Today
              </button>
            )}
          </div>
          <div className="mt-1 text-xl text-[var(--text-mid)]">{plan.focus}</div>
        </div>

        {/* Progress Ring */}
        <div className="relative flex h-[130px] w-[130px] items-center justify-center">
          <svg className="h-[130px] w-[130px] -rotate-90" viewBox="0 0 130 130">
            <circle
              cx="65"
              cy="65"
              r={radius}
              fill="none"
              stroke="var(--border)"
              strokeWidth="10"
            />
            <motion.circle
              cx="65"
              cy="65"
              r={radius}
              fill="none"
              stroke="var(--cyan)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ type: "spring", stiffness: 80, damping: 18 }}
            />
          </svg>
          <div className="absolute text-center">
            <div className="text-5xl font-semibold tabular-nums tracking-tighter">{completion}</div>
            <div className="text-[11px] font-mono tracking-[3px] text-[var(--text-dim)] -mt-1">COMPLETE</div>
          </div>
        </div>
      </div>

      {/* Next Milestone */}
      <div className="flex items-center gap-3 rounded-3xl border border-[var(--hairline)] bg-[var(--fill-subtle)] px-5 py-3 text-sm">
        <Target className="h-4 w-4 text-[var(--cyan)]" />
        <span className="font-medium text-[var(--cyan)]">{nextMilestone.label}</span>
        <span className="text-[var(--text-mid)]">
          {daysToMs === 0 ? "• TODAY" : `in ${daysToMs} day${daysToMs > 1 ? "s" : ""}`}
        </span>
      </div>

      {/* Daily Rhythm */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div className="section-title">DAILY RHYTHM</div>
          <div className="text-xs text-[var(--text-dim)] font-mono">
            {Object.values(dayState.rhythm).filter(Boolean).length}/4 complete
          </div>
        </div>

        <div className="space-y-2">
          {RHYTHM_KEYS.map((key) => {
            const config = RHYTHM_CONFIG[key];
            const checked = dayState.rhythm[key];
            const displayText = getDisplayText(key);

            return (
              <div
                key={key}
                onClick={() => handleToggle(key)}
                className={`group flex cursor-pointer items-start gap-4 rounded-3xl border p-5 transition-all active:scale-[0.985] ${
                  checked 
                    ? "border-[var(--done)]/40 bg-[var(--done)]/5" 
                    : "border-[var(--hairline)] hover:border-[var(--hairline-strong)] bg-[var(--surface)]"
                }`}
              >
                <div className="pt-0.5">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => handleToggle(key)}
                    onClick={(e) => e.stopPropagation()}
                    className="h-5 w-5 accent-[var(--cyan)] cursor-pointer"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    {config.icon}
                    <div className="font-semibold text-lg tracking-tight">{config.label}</div>
                    <div className="ml-auto rounded-full bg-[var(--fill-subtle)] px-3 py-0.5 text-xs font-mono text-[var(--text-dim)]">
                      {config.time}
                    </div>
                  </div>

                  <div className="mt-1 text-[15px] text-[var(--text-mid)] leading-snug pr-4">
                    {displayText}
                  </div>

                  <div className="mt-0.5 text-xs text-[var(--text-dim)]">
                    {config.description}
                  </div>
                </div>

                {checked && (
                  <Check className="mt-1 h-5 w-5 text-[var(--done)]" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Focus + Energy */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Focus Note */}
        <div className="card-glass">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[2px] mb-3 text-[var(--text-dim)]">
            <Zap className="h-3.5 w-3.5" /> FOCUS NOTE
          </div>
          <textarea
            value={dayState.focusNote || ""}
            onChange={(e) => updateFocusNote(selectedDay, e.target.value)}
            placeholder="What's the single most important thing today?"
            className="w-full bg-transparent text-[15px] resize-y min-h-[72px] placeholder:text-[var(--text-dim)] focus:outline-none leading-relaxed"
          />
        </div>

        {/* Energy */}
        <div className="card-glass">
          <div className="text-xs uppercase tracking-[2px] mb-3 text-[var(--text-dim)]">ENERGY LEVEL</div>
          <div className="flex gap-2">
            {(["low", "medium", "high"] as const).map((level) => (
              <button
                key={level}
                onClick={() => setEnergy(selectedDay, level)}
                className={`flex-1 rounded-2xl border py-3 text-sm font-medium capitalize transition-all ${
                  dayState.energy === level 
                    ? "border-[var(--cyan)] bg-[var(--cyan)]/10 text-[var(--cyan)]" 
                    : "border-[var(--hairline)] hover:bg-[var(--fill-subtle)]"
                }`}
              >
                {level}
              </button>
            ))}
          </div>
          <div className="text-[10px] text-[var(--text-dim)] mt-3">
            Honest tracking helps surface patterns over the remaining days.
          </div>
        </div>
      </div>

      {/* Journal */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs uppercase tracking-[2px] text-[var(--text-dim)]">JOURNAL</div>
          <div className="text-[10px] text-[var(--text-dim)]">Autosaves locally</div>
        </div>
        <textarea
          value={dayState.journal || ""}
          onChange={(e) => updateDayJournal(selectedDay, e.target.value)}
          placeholder="What went well? What blocked you? Key realizations or decisions..."
          className="w-full min-h-[110px] bg-[var(--bg-elev)] border border-[var(--hairline)] rounded-2xl p-4 text-[15px] focus:outline-none placeholder:text-[var(--text-dim)] leading-relaxed"
        />
      </div>
    </div>
  );
}
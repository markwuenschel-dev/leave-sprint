"use client";

import { useState } from "react";
import { TodayRhythm } from "./components/sprint/TodayRhythm";
import { StageProgression } from "./components/sprint/StageProgression";
import { Calendar } from "./components/sprint/Calendar";
import { ProblemBank } from "./components/sprint/ProblemBank";
import { SprintVelocityChart } from "./components/sprint/SprintVelocityChart";
import { useSprintStore } from "@/lib/store";
import { Target, TrendingUp, Calendar as CalendarIcon, BookOpen, BarChart3 } from "lucide-react";

export default function LeaveSprintTwin() {
  const [activeTab, setActiveTab] = useState<"today" | "stages" | "analytics" | "calendar" | "bank">("today");

  const { days, selectedDay } = useSprintStore();
  const daysDone = Object.values(days).filter(d => 
    d.rhythm.coding && d.rhythm.file && d.rhythm.qa
  ).length;

  const overallProgress = Math.round((daysDone / 29) * 100);

  const tabs = [
    { id: "today", label: "Today", icon: Target },
    { id: "stages", label: "Stages", icon: TrendingUp },
    { id: "analytics", label: "Velocity", icon: BarChart3 },
    { id: "calendar", label: "Calendar", icon: CalendarIcon },
    { id: "bank", label: "Problem Bank", icon: BookOpen },
  ] as const;

  return (
    <div className="min-h-screen bg-[#0a0c10] text-[#e6e8eb]">
      {/* Header */}
      <div className="border-b border-white/10 bg-[#0a0c10]/95 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div>
            <div className="font-semibold text-3xl tracking-[-2px]">Leave Sprint Twin</div>
            <div className="text-xs text-[var(--text-dim)] -mt-1">Day {selectedDay} of 29 • Local-first</div>
          </div>

          <div className="flex items-center gap-8">
            <div className="flex items-center gap-6 text-sm">
              <div>
                <div className="text-[10px] text-[var(--text-dim)]">OVERALL</div>
                <div className="font-mono text-2xl font-semibold text-[var(--cyan)] tabular-nums">{overallProgress}%</div>
              </div>
              <div>
                <div className="text-[10px] text-[var(--text-dim)]">FULL DAYS</div>
                <div className="font-mono text-2xl font-semibold tabular-nums flex items-center gap-1">
                  {daysDone}<span className="text-base text-[var(--magenta)]">/29</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-t border-white/10">
          <div className="max-w-7xl mx-auto px-6 flex items-center gap-1 h-12">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-2 rounded-2xl text-sm font-medium transition-all ${
                    isActive 
                      ? "bg-white/5 text-white border border-white/10" 
                      : "text-[var(--text-mid)] hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === "today" && (
          <div className="max-w-4xl space-y-8">
            <TodayRhythm />
          </div>
        )}

        {activeTab === "stages" && (
          <div className="max-w-4xl">
            <StageProgression />
          </div>
        )}

        {activeTab === "analytics" && (
          <div className="max-w-3xl space-y-6">
            <SprintVelocityChart />
            <div className="text-sm text-[var(--text-mid)]">
              Velocity is calculated from actual stage completion timestamps. Ideal line assumes linear progress.
            </div>
          </div>
        )}

        {activeTab === "calendar" && <Calendar />}
        {activeTab === "bank" && <ProblemBank />}
      </div>
    </div>
  );
}
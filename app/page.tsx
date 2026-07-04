"use client";

import { useState, useEffect } from "react";
import { TodayRhythm } from "./components/sprint/TodayRhythm";
import { StageProgression } from "./components/sprint/StageProgression";
import { Calendar } from "./components/sprint/Calendar";
import { ProblemBank } from "./components/sprint/ProblemBank";
import { SprintVelocityChart } from "./components/sprint/SprintVelocityChart";
import { Rubric } from "./components/sprint/Rubric";
import { RubricAnalytics } from "./components/sprint/RubricAnalytics";
import { WeeklySchedule } from "./components/sprint/WeeklySchedule";
import { WorkbenchModules } from "./components/sprint/WorkbenchModules";
import { CodingBankTiers } from "./components/sprint/CodingBankTiers";
import { FileDefense } from "./components/sprint/FileDefense";
import { DataExport } from "./components/sprint/DataExport";
import { QBank } from "./components/sprint/QBank";
import { useSprintStore } from "@/lib/store";
import { Target, TrendingUp, Calendar as CalendarIcon, BookOpen, BarChart3, SquareEqual, Gauge, CalendarRange, Wrench } from "lucide-react";

function getCurrentStreak(days: Record<number, any>): number {
  const today = new Date();
  const start = new Date(2026, 5, 17); // Sprint start
  const currentDay = Math.min(
    Math.max(Math.floor((today.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1, 1),
    29
  );

  let streak = 0;
  for (let d = currentDay; d >= 1; d--) {
    const dayData = days[d];
    if (dayData?.rhythm?.coding && dayData?.rhythm?.file && dayData?.rhythm?.qa) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

export default function LeaveSprintTwin() {
  const [activeTab, setActiveTab] = useState<"today" | "schedule" | "stages" | "analytics" | "competency" | "rubric" | "qbank" | "calendar" | "bank" | "workbench">("today");

  const { days, selectedDay } = useSprintStore();
  const daysDone = Object.values(days).filter(d => 
    d.rhythm.coding && d.rhythm.file && d.rhythm.qa
  ).length;
  const overallProgress = Math.round((daysDone / 29) * 100);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key.toLowerCase() === "t") setActiveTab("today");
      if (e.key.toLowerCase() === "s") setActiveTab("stages");
      if (e.key.toLowerCase() === "v") setActiveTab("analytics");
      if (e.key.toLowerCase() === "g") setActiveTab("competency");
      if (e.key.toLowerCase() === "r") setActiveTab("rubric");
      if (e.key.toLowerCase() === "q") setActiveTab("qbank");
      if (e.key.toLowerCase() === "w") setActiveTab("workbench");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const tabs = [
    { id: "today", label: "Today", icon: Target },
    { id: "schedule", label: "Schedule", icon: CalendarRange },
    { id: "stages", label: "Stages", icon: TrendingUp },
    { id: "analytics", label: "Velocity", icon: BarChart3 },
    { id: "competency", label: "Competency", icon: Gauge },
    { id: "rubric", label: "Rubric", icon: SquareEqual },
    { id: "qbank", label: "Q Bank", icon: BookOpen },
    { id: "calendar", label: "Calendar", icon: CalendarIcon },
    { id: "bank", label: "Problem Bank", icon: BookOpen },
    { id: "workbench", label: "Workbench", icon: Wrench },
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
            <div className="flex items-center gap-8 text-sm">
        {/* Overall Progress */}
        <div>
          <div className="text-[10px] text-[var(--text-dim)]">OVERALL</div>
          <div className="font-mono text-2xl font-semibold text-[var(--cyan)] tabular-nums">{overallProgress}%</div>
        </div>

        {/* Full Days */}
        <div>
          <div className="text-[10px] text-[var(--text-dim)]">FULL DAYS</div>
          <div className="font-mono text-2xl font-semibold tabular-nums flex items-center gap-1">
            {daysDone}<span className="text-base text-[var(--magenta)]">/29</span>
          </div>
        </div>

        {/* Streak */}
        <div>
          <div className="text-[10px] text-[var(--text-dim)]">STREAK</div>
          <div className="font-mono text-2xl font-semibold tabular-nums flex items-center gap-1 text-[var(--orange)]">
            {getCurrentStreak(days)}<span className="text-base">🔥</span>
          </div>
        </div>

        {/* Velocity Summary */}
        <div>
          <div className="text-[10px] text-[var(--text-dim)]">VELOCITY</div>
          <div className="font-mono text-xl font-semibold tabular-nums text-[var(--cyan)]">
            {(daysDone / Math.max(1, new Date().getDate() - 16)).toFixed(1)} <span className="text-xs text-[var(--text-dim)]">/day</span>
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
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-10">
        {activeTab === "today" && <TodayRhythm />}
        {activeTab === "schedule" && <WeeklySchedule />}
        {activeTab === "stages" && <StageProgression />}
        {activeTab === "analytics" && <SprintVelocityChart />}
        {activeTab === "competency" && <RubricAnalytics />}
        {activeTab === "rubric" && <Rubric />}
        {activeTab === "qbank" && <QBank />}
        {activeTab === "calendar" && <Calendar />}
        {activeTab === "bank" && <ProblemBank />}
        {activeTab === "workbench" && (
          <div className="space-y-10">
            <WorkbenchModules />
            <FileDefense />
            <CodingBankTiers />
          </div>
        )}
        <DataExport />
      </div>
    </div>
  );
}
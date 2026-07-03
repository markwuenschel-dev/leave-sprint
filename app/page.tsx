"use client";

/**
 * Leave Sprint Twin — Main Dashboard
 *
 * Top-level tabbed interface.
 * Primary daily value screens are implemented first:
 *   - TodayRhythm (highest priority)
 *   - StageProgression
 *
 * Additional tabs (Calendar, ProblemBank) are present and functional
 * but will receive more polish (detail panels, File Defense modals, etc.).
 */

import { useEffect, useState } from "react";
import { TodayRhythm } from "./components/sprint/TodayRhythm";
import { StageProgression } from "./components/sprint/StageProgression";
import { Calendar } from "./components/sprint/Calendar";
import { ProblemBank } from "./components/sprint/ProblemBank";
import { motion } from "framer-motion";
import { Calendar, Target, TrendingUp } from "lucide-react";

export default function LeaveSprintTwin() {
  const [activeTab, setActiveTab] = useState<"today" | "stages" | "calendar" | "bank">("today");

  // Basic keyboard: 't' for today, 's' for stages
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "t") setActiveTab("today");
      if (e.key.toLowerCase() === "s") setActiveTab("stages");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0c10] text-[#e6e8eb]">
      {/* Top bar */}
      <div className="sticky top-0 z-40 border-b border-white/10 bg-[#0a0c10]/95 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="font-semibold tracking-[-0.4px] text-lg">Leave Sprint Twin</div>
            <div className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-[var(--text-dim)] border border-white/10 font-mono">JUN 17 — JUL 15 2026</div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <div className="hidden md:flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
              <div className="h-1.5 w-1.5 rounded-full bg-[var(--cyan)] animate-pulse" />
              LOCAL-FIRST · PERSISTED
            </div>
            <button
              onClick={() => {
                if (confirm("Reset all progress to seed?")) {
                  // Access store via import in real usage; simple full reload for v1
                  localStorage.removeItem("leave-sprint-twin-v1");
                  window.location.reload();
                }
              }}
              className="btn-ghost text-xs px-3 py-1"
            >
              RESET
            </button>
          </div>
        </div>

        {/* Nav */}
        <div className="max-w-6xl mx-auto px-4 md:px-6 border-t border-white/10 flex items-center gap-1 overflow-x-auto pb-1 pt-1 text-sm desktop-nav">
          {[
            { id: "today", label: "Today", icon: <Target size={15} /> },
            { id: "stages", label: "20-Stage", icon: <TrendingUp size={15} /> },
            { id: "calendar", label: "Calendar", icon: <Calendar size={15} /> },
            { id: "bank", label: "Problem Bank + Files", icon: <span className="text-xs">📚</span> },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`nav-link ${activeTab === t.id ? "active" : ""}`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
          <div className="ml-auto text-[10px] text-[var(--text-dim)] pr-1 hidden lg:block">
            Press <span className="font-mono">T</span> / <span className="font-mono">S</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* TODAY VIEW (highest priority) */}
        {activeTab === "today" && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3">
              <TodayRhythm />
            </div>

            {/* Side insight panel */}
            <div className="lg:col-span-2 space-y-4">
              <div className="card-glass">
                <div className="section-title">AT A GLANCE</div>
                <ul className="text-sm space-y-2 text-[var(--text-mid)]">
                  <li>• Full rhythm = green day. Partial = cyan. Skipped 2+ = yellow.</li>
                  <li>• Stages 0-13 shipped. 15–18 now primary (retrieval + SWE).</li>
                  <li>• Mock #1 is July 7 (Day 21). 14 days of prep remain as of July 3.</li>
                </ul>
              </div>

              <div className="card">
                <div className="section-title mb-1">NEXT ACTIONS</div>
                <div className="text-sm leading-snug">
                  Today: LRU Cache + File Defense (RagEngineClient + PythonProcess) + one Q aloud.
                  <div className="mt-3 text-xs text-[var(--text-dim)]">Use the checklist above — everything saves instantly.</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STAGE PROGRESSION */}
        {activeTab === "stages" && (
          <div className="max-w-3xl">
            <StageProgression />
          </div>
        )}

        {/* PLACEHOLDERS FOR CALENDAR + BANK (v1 scope: today + stages first) */}
        {activeTab === "calendar" && (
          <div className="max-w-2xl">
            <Calendar />
          </div>
        )}

        {activeTab === "bank" && (
          <div className="max-w-3xl">
            <div className="mb-4">
              <div className="section-title">PROBLEM BANK (TIER A–D)</div>
              <ProblemBank />
            </div>
            <div className="text-xs text-[var(--text-mid)] mt-2">File Defense detail + practice tracker will be added in the next pass (modals + "Mark Practiced Today").</div>
          </div>
        )}
      </div>

      {/* Mobile bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[#0a0c10]/95 backdrop-blur-xl md:hidden mobile-nav">
        <div className="flex">
          {[
            { id: "today", label: "Today" },
            { id: "stages", label: "Stages" },
            { id: "calendar", label: "Calendar" },
            { id: "bank", label: "Bank" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex-1 py-3 text-xs font-medium ${activeTab === t.id ? "text-[var(--cyan)]" : "text-[var(--text-mid)]"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Footer hint */}
      <div className="max-w-6xl mx-auto px-4 pb-20 md:pb-8 text-[10px] text-center text-[var(--text-dim)]">
        All data local. Persisted with Zustand + localStorage. Edit <span className="font-mono">data/app-state.json</span> to update baseline content.
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useSprintStore } from "@/lib/store";
import { LogEntry } from "./rubric/LogEntry";
import { History } from "./rubric/History";
import { Reference } from "./rubric/Reference";
import { FilePlus2, ListChecks, BookOpen } from "lucide-react";

type SubTab = "log" | "history" | "reference";

const SUBTABS = [
  { id: "log", label: "Log Entry", icon: FilePlus2 },
  { id: "history", label: "History", icon: ListChecks },
  { id: "reference", label: "Reference", icon: BookOpen },
] as const;

export function Rubric() {
  const [sub, setSub] = useState<SubTab>("log");
  const count = useSprintStore((s) => s.rubricEntries.length);
  const passes = useSprintStore((s) => s.rubricEntries.filter((e) => e.finalScore >= 70).length);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="section-title !mb-1">TECHNICAL COMPETENCY RUBRIC</div>
          <div className="text-sm text-[var(--text-mid)]">
            {count} assessment{count === 1 ? "" : "s"} logged · {passes} passing (≥70)
          </div>
        </div>
        <div className="flex gap-1 bg-[#11141a] rounded-2xl p-1 border border-white/10">
          {SUBTABS.map((t) => {
            const Icon = t.icon;
            const active = sub === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setSub(t.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  active ? "bg-white/5 text-white" : "text-[var(--text-dim)] hover:text-white"
                }`}
              >
                <Icon size={15} />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {sub === "log" && <LogEntry />}
      {sub === "history" && <History />}
      {sub === "reference" && <Reference />}
    </div>
  );
}

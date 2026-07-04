"use client";

import { useSprintStore } from "@/lib/store";
import { Check, Clock } from "lucide-react";
import { STAGES, PHASE_ORDER, type StageDef } from "@/data/stages";

export function StageProgression() {
  const { stages, markStageDone, unmarkStage } = useSprintStore();

  const doneCount = Object.values(stages).filter((s) => s.done).length;
  const total = STAGES.length;
  const progress = Math.round((doneCount / total) * 100);

  // Group stages by phase
  const grouped = STAGES.reduce((acc, stage) => {
    if (!acc[stage.phase]) acc[stage.phase] = [];
    acc[stage.phase].push(stage);
    return acc;
  }, {} as Record<string, StageDef[]>);

  const phaseOrder = PHASE_ORDER;

  return (
    <div>
      {/* Header */}
      <div className="flex items-baseline justify-between mb-6">
        <div>
          <div className="section-title">20-STAGE PROGRESSION</div>
          <div className="flex items-baseline gap-3">
            <div className="text-4xl font-semibold tracking-[-2px] tabular-nums">
              {doneCount} <span className="text-2xl text-[var(--text-dim)]">/ {total}</span>
            </div>
            <div className="text-sm text-[var(--cyan)] font-mono">{progress}%</div>
          </div>
        </div>
        <div className="text-right text-xs text-[var(--text-dim)]">
          One-click to mark done.<br />Timestamps are saved.
        </div>
      </div>

      {/* Grouped Stages */}
      <div className="space-y-8">
        {phaseOrder.map((phase) => {
          const phaseStages = grouped[phase];
          if (!phaseStages) return null;

          const phaseDone = phaseStages.filter((s) => stages[s.id]?.done).length;

          return (
            <div key={phase}>
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-3">
                  <div className="font-semibold text-lg tracking-tight">{phase}</div>
                  <div className="text-xs px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[var(--text-dim)]">
                    {phaseDone} / {phaseStages.length}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {phaseStages.map((stage) => {
                  const st = stages[stage.id] || { done: false };
                  const isDone = st.done;

                  return (
                    <div
                      key={stage.id}
                      className={`group flex items-center justify-between gap-4 rounded-3xl border p-5 transition-all ${
                        isDone 
                          ? "border-[var(--done)]/30 bg-[var(--done)]/5" 
                          : "border-white/10 hover:border-white/20 bg-[#161a22]"
                      }`}
                    >
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <button
                          onClick={() => (isDone ? unmarkStage(stage.id) : markStageDone(stage.id))}
                          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-sm transition-all ${
                            isDone 
                              ? "bg-[var(--done)] text-[#0a0c10] border-[var(--done)]" 
                              : "border-white/20 hover:border-[var(--cyan)] hover:text-[var(--cyan)]"
                          }`}
                        >
                          {isDone ? <Check size={14} /> : <span className="font-mono text-xs">{stage.id}</span>}
                        </button>

                        <div className="flex-1 min-w-0 pr-4">
                          <div className={`text-[15px] leading-tight ${isDone ? "line-through text-[var(--text-mid)]" : ""}`}>
                            {stage.name}
                          </div>
                          {stage.tags && stage.tags.length > 0 && (
                            <div className="flex gap-1.5 mt-2">
                              {stage.tags.map((tag) => (
                                <span 
                                  key={tag} 
                                  className="text-[10px] px-2 py-px rounded bg-white/5 text-[var(--text-dim)] border border-white/10"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {isDone && st.doneAt && (
                          <div className="flex items-center gap-1.5 text-xs text-[var(--text-dim)] font-mono">
                            <Clock size={13} />
                            {new Date(st.doneAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                          </div>
                        )}

                        <button
                          onClick={() => (isDone ? unmarkStage(stage.id) : markStageDone(stage.id))}
                          className={`rounded-2xl px-4 py-2 text-xs font-medium border transition-all ${
                            isDone 
                              ? "border-[var(--done)] text-[var(--done)] hover:bg-[var(--done)]/10" 
                              : "border-white/10 hover:border-[var(--cyan)] hover:text-[var(--cyan)]"
                          }`}
                        >
                          {isDone ? "DONE" : "MARK DONE"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 text-[10px] text-[var(--text-dim)] pl-1">
        Progress is saved locally. Edit <span className="font-mono">data/app-state.json</span> to change baseline content.
      </div>
    </div>
  );
}
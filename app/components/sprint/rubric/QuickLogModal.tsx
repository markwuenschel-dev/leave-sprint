"use client";

/**
 * Quick-log modal — the Q-Bank "mastered" → rubric bridge (ported from
 * qbShowMasteredPrompt). Collects a 0–100 score + assistance level and writes a
 * rubric entry classified via QB_TRACK_MAP. Also reusable as a standalone quick log.
 */

import { useState } from "react";
import { useSprintStore } from "@/lib/store";
import { QB_TRACK_MAP } from "@/lib/qbank/trackMap";
import type { TrackKey } from "@/lib/qbank/types";
import { RD } from "@/lib/rubric/referenceData";
import { scoreBand } from "@/lib/rubric/scoring";
import { X } from "lucide-react";

interface QuickLogModalProps {
  task: string;
  track: TrackKey;
  onClose: () => void;
  onLogged?: () => void;
}

export function QuickLogModal({ task, track, onClose, onLogged }: QuickLogModalProps) {
  const logRubricEntry = useSprintStore((s) => s.logRubricEntry);
  const map = QB_TRACK_MAP[track];
  const [score, setScore] = useState(80);
  const [assist, setAssist] = useState(0);

  const band = scoreBand(score);

  const save = () => {
    logRubricEntry({
      task: task.length > 100 ? task.slice(0, 97) + "…" : task,
      taskType: map.taskType,
      domain: map.domain,
      primaryDomain: map.domain,
      primaryRole: map.role,
      difficulty: 2,
      assistanceLevel: assist as 0 | 1 | 2 | 3 | 4 | 5,
      finalScore: score,
      evidenceClass: "classB",
      quickLog: true,
    });
    onLogged?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="card-glass p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div className="section-title !mb-0">⚖️ Log to Rubric</div>
          <button onClick={onClose} className="text-[var(--text-dim)] hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="text-sm text-[var(--text-mid)] mb-1">{task.length > 90 ? task.slice(0, 87) + "…" : task}</div>
        <div className="text-xs text-[var(--text-dim)] mb-5 font-mono">
          {map.taskType} · {map.domain} · {map.role}
        </div>

        {/* Score */}
        <label className="block text-xs text-[var(--text-dim)] mb-1">SELF-SCORE (0–100)</label>
        <div className="flex items-center gap-3 mb-4">
          <input type="range" min={0} max={100} value={score} onChange={(e) => setScore(Number(e.target.value))} className="flex-1 accent-[#00f9ff]" />
          <span className={`font-mono text-2xl font-semibold tabular-nums ${band.cls}`}>{score}</span>
        </div>
        <div className={`text-xs mb-5 ${band.cls}`}>{band.verdict}</div>

        {/* Assistance */}
        <label className="block text-xs text-[var(--text-dim)] mb-2">ASSISTANCE LEVEL</label>
        <div className="flex flex-wrap gap-2 mb-6">
          {RD.assistance.map((a) => (
            <button
              key={a.lvl}
              onClick={() => setAssist(a.lvl)}
              title={a.desc}
              className={`px-3 py-1.5 rounded-xl text-xs border transition-all ${
                assist === a.lvl ? "border-[var(--cyan)] text-[var(--cyan)] bg-[var(--cyan)]/10" : "border-white/10 text-[var(--text-dim)] hover:border-white/30"
              }`}
            >
              A{a.lvl}
            </button>
          ))}
        </div>
        <div className="text-xs text-[var(--text-dim)] mb-6 -mt-3">{RD.assistance[assist]?.desc}</div>

        <div className="flex gap-3">
          <button onClick={onClose} className="btn flex-1">
            Skip
          </button>
          <button onClick={save} className="btn-primary flex-1">
            Log Entry
          </button>
        </div>
      </div>
    </div>
  );
}

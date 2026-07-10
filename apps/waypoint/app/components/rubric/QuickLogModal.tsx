"use client";

/**
 * Quick-log modal — Q-Bank "mastered" → rubric bridge.
 * Collects score + assistance and writes via store (normaliseEntry path).
 */

import { useState } from "react";
import { QB_TRACK_MAP, type TrackKey } from "@waypoint/qbank";
import { RD, scoreBand } from "@waypoint/rubric";
import { useWaypointStore } from "@/lib/store";
import { X } from "lucide-react";

interface QuickLogModalProps {
  task: string;
  track: TrackKey;
  onClose: () => void;
  onLogged?: () => void;
}

export function QuickLogModal({ task, track, onClose, onLogged }: QuickLogModalProps) {
  const addEntry = useWaypointStore((s) => s.addRubricEntry);
  const map = QB_TRACK_MAP[track];
  const [score, setScore] = useState(80);
  const [assist, setAssist] = useState(0);
  const band = scoreBand(score);

  const save = () => {
    if (score < 70) {
      const proceed = window.confirm(
        "Score looks weak (<70). Prefer a full Grade with a gap type for the Gaps board.\n\nOK = quick-log anyway · Cancel = go back.",
      );
      if (!proceed) return;
    }
    addEntry({
      task: task.length > 100 ? task.slice(0, 97) + "…" : task,
      taskType: map.taskType,
      domain: map.domain,
      primaryDomain: map.domain,
      primaryRole: map.role,
      difficulty: 2,
      assistanceLevel: assist as 0 | 1 | 2 | 3 | 4 | 5,
      finalScore: score,
      evidenceClass: "classB",
      loggingMode: "fast",
      quickLog: true,
    });
    onLogged?.();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div className="card-glass w-full max-w-md p-6" onClick={(e) => e.stopPropagation()} role="dialog">
        <div className="mb-4 flex items-start justify-between">
          <div className="section-title !mb-0">Log to Rubric</div>
          <button type="button" onClick={onClose} className="text-[var(--text-dim)] hover:text-[var(--text)]">
            <X size={18} />
          </button>
        </div>

        <div className="mb-1 text-sm text-[var(--text-mid)]">
          {task.length > 90 ? task.slice(0, 87) + "…" : task}
        </div>
        <div className="mb-5 font-mono text-xs text-[var(--text-dim)]">
          {map.taskType} · {map.domain} · {map.role}
        </div>

        <label className="mb-1 block text-xs text-[var(--text-dim)]">SELF-SCORE (0–100)</label>
        <div className="mb-4 flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={100}
            value={score}
            onChange={(e) => setScore(Number(e.target.value))}
            className="flex-1 accent-[var(--cyan)]"
          />
          <span className={`font-mono text-2xl font-semibold tabular-nums ${band.cls}`}>{score}</span>
        </div>
        <div className={`mb-5 text-xs ${band.cls}`}>{band.verdict}</div>

        <label className="mb-2 block text-xs text-[var(--text-dim)]">ASSISTANCE LEVEL</label>
        <div className="mb-2 flex flex-wrap gap-2">
          {RD.assistance.map((a) => (
            <button
              key={a.lvl}
              type="button"
              onClick={() => setAssist(a.lvl)}
              title={a.desc}
              className={`rounded-xl border px-3 py-1.5 text-xs transition-all ${
                assist === a.lvl
                  ? "border-[var(--cyan)] bg-[var(--cyan)]/10 text-[var(--cyan)]"
                  : "border-[var(--hairline)] text-[var(--text-dim)] hover:border-[var(--hairline-strong)]"
              }`}
            >
              A{a.lvl}
            </button>
          ))}
        </div>
        <div className="mb-6 text-xs text-[var(--text-dim)]">{RD.assistance[assist]?.desc}</div>

        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="btn flex-1">
            Skip
          </button>
          <button type="button" onClick={save} className="btn-primary flex-1">
            Log Entry
          </button>
        </div>
      </div>
    </div>
  );
}

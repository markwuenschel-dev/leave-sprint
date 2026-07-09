"use client";

import { useMemo } from "react";
import { useWaypointStore, todayIso } from "@/lib/store";
import { computeReadiness } from "@/lib/readiness";
import { ProgressRing } from "../ui/ProgressRing";
import { card } from "./shared";

export function TodaySurface() {
  const phase = useWaypointStore((s) => s.phase);
  const toggle = useWaypointStore((s) => s.toggleRhythm);
  const setNote = useWaypointStore((s) => s.setRhythmNote);
  const day = useWaypointStore((s) => s.rhythmDays[todayIso()] || null);
  const state = useWaypointStore();
  const readiness = useMemo(() => computeReadiness(state), [state]);
  const slots = day?.slots || {
    practice: false,
    defense: false,
    interview: false,
    admin: false,
  };
  const date = todayIso();

  const items: { key: keyof typeof slots; label: string; hint: string }[] = [
    { key: "practice", label: "Practice", hint: "Coding / patterns · mark solid when cold" },
    { key: "defense", label: "Defense", hint: "Stories / file defense · 45–90s each" },
    { key: "interview", label: "Interview reps", hint: "Q bank · mock · rubric log" },
    {
      key: "admin",
      label: "Admin light",
      hint: phase === "A" ? "Apps touch + plan" : "Plan, log, gate glance",
    },
  ];

  const doneCount = items.filter((i) => slots[i.key]).length;
  const rhythmPct = Math.round((doneCount / items.length) * 100);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-2xl font-semibold tracking-tight">Today</h2>
        <span className="text-sm text-[var(--text-dim)]">{date}</span>
        <span
          className="rounded-full border px-2 py-0.5 text-xs"
          style={{
            borderColor: readiness.evidenceGreen ? "var(--green)" : "var(--hairline)",
            color: readiness.evidenceGreen ? "var(--green)" : "var(--text-mid)",
          }}
        >
          Evidence: {readiness.evidenceGreen ? "green" : "building"} · Phase {phase}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
        <div className={`${card} flex items-center gap-4`}>
          <ProgressRing value={rhythmPct} size={72} color="var(--cyan)">
            <span className="text-sm font-semibold tabular-nums">{doneCount}/4</span>
          </ProgressRing>
          <div>
            <div className="text-sm font-medium">Daily rhythm</div>
            <div className="text-xs text-[var(--text-dim)]">Checkboxes ≠ evidence floor</div>
          </div>
        </div>
        <div className={`${card} grid gap-2 sm:grid-cols-2`}>
          {readiness.roles.map((r) => (
            <div key={r.role} className="text-sm">
              <div className="mb-1 flex justify-between font-medium">
                <span>{r.role === "SWE_FS_II" ? "SWE FS II" : "MLE II"}</span>
                <span style={{ color: r.green ? "var(--green)" : "var(--text-dim)" }}>
                  {r.green ? "GREEN" : "open"}
                </span>
              </div>
              <div className="space-y-0.5 text-xs text-[var(--text-dim)]">
                <div>
                  {r.practice.met ? "✓" : "○"} Practice {r.practice.detail.split(" ")[0]}
                </div>
                <div>
                  {r.interview.met ? "✓" : "○"} Interview {r.interview.count ?? 0}/
                  {r.interview.need ?? 2}
                </div>
                <div>
                  {r.defense.met ? "✓" : "○"} Defense {r.defense.count ?? 0}/
                  {r.defense.need ?? "—"}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((it) => (
          <button
            key={it.key}
            type="button"
            onClick={() => toggle(date, it.key)}
            className={`${card} text-left transition ${slots[it.key] ? "ring-1 ring-[var(--cyan)]" : ""}`}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">{it.label}</span>
              <span className="text-lg">{slots[it.key] ? "✓" : "○"}</span>
            </div>
            <p className="mt-1 text-sm text-[var(--text-dim)]">{it.hint}</p>
          </button>
        ))}
      </div>

      <div className={card}>
        <label className="text-xs text-[var(--text-dim)]">Focus note</label>
        <textarea
          className="mt-2 min-h-[80px] w-full rounded-xl border border-[var(--hairline)] bg-transparent p-3 text-sm"
          value={day?.focusNote || ""}
          onChange={(e) => setNote(date, "focusNote", e.target.value)}
          placeholder="What matters today?"
        />
      </div>
    </div>
  );
}

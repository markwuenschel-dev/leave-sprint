"use client";

import { scoreBand, taskLabel } from "@waypoint/rubric";
import { useWaypointStore } from "@/lib/store";

export function RubricHistory() {
  const entries = useWaypointStore((s) => s.rubricEntries);
  const del = useWaypointStore((s) => s.deleteRubricEntry);

  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--hairline)] bg-[var(--surface)] p-5 text-sm text-[var(--text-dim)]">
        No assessments logged yet. Use Grade or the Q-bank mastered prompt.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-[var(--text-dim)]">{entries.length} assessments · newest first</p>
      {entries.map((e) => {
        const score = e.finalScore ?? e.levelScores?.L2 ?? e.levelScores?.L1 ?? null;
        const band = score != null ? scoreBand(score) : null;
        return (
          <div
            key={e.id}
            className="rounded-2xl border border-[var(--hairline)] bg-[var(--surface)] p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-medium">{e.task || "—"}</div>
                <div className="mt-0.5 text-xs text-[var(--text-dim)]">
                  {e.date}
                  {e.taskType ? ` · ${taskLabel(e.taskType)}` : ""}
                  {e.primaryRole ? ` · ${e.primaryRole}` : ""}
                  {e.loggingMode ? ` · ${e.loggingMode}` : e.quickLog ? " · fast" : ""}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="font-mono text-sm text-[var(--cyan)]">
                    {e.qualifyingDemonstratedLevel || e.demonstratedLevel || "—"}
                  </div>
                  {score != null ? (
                    <div className={`text-xs ${band?.cls ?? ""}`}>
                      {score} · {band?.verdict}
                    </div>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="text-xs text-[var(--orange)]"
                  onClick={() => {
                    if (window.confirm("Delete this assessment?")) del(e.id);
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
            {(e.weaknessTags?.length || e.nextTarget) && (
              <div className="mt-2 text-xs text-[var(--text-mid)]">
                {e.weaknessTags?.length ? (
                  <span className="mr-2">{e.weaknessTags.slice(0, 4).join(" · ")}</span>
                ) : null}
                {e.nextTarget ? <span className="text-[var(--text-dim)]">→ {e.nextTarget}</span> : null}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

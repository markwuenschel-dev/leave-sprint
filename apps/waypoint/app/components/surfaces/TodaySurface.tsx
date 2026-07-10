"use client";

import { useMemo } from "react";
import { useWaypointStore, todayIso } from "@/lib/store";
import { computeReadiness } from "@/lib/readiness";
import { activeRetestQueue } from "@/lib/gaps";
import { pickNextMove } from "@/lib/nextMove";
import { requestNav } from "@/lib/nav";
import { ProgressRing } from "../ui/ProgressRing";
import { card } from "./shared";

export function TodaySurface() {
  const phase = useWaypointStore((s) => s.phase);
  const toggle = useWaypointStore((s) => s.toggleRhythm);
  const setNote = useWaypointStore((s) => s.setRhythmNote);
  const day = useWaypointStore((s) => s.rhythmDays[todayIso()] || null);
  const problems = useWaypointStore((s) => s.problems);
  const fileDefense = useWaypointStore((s) => s.fileDefense);
  const rubricEntries = useWaypointStore((s) => s.rubricEntries);
  const solidInterviewLogs = useWaypointStore((s) => s.solidInterviewLogs);
  const roleFilter = useWaypointStore((s) => s.roleFilter);

  const readiness = useMemo(
    () =>
      computeReadiness({
        problems,
        fileDefense,
        rubricEntries,
        solidInterviewLogs,
      } as Parameters<typeof computeReadiness>[0]),
    [problems, fileDefense, rubricEntries, solidInterviewLogs],
  );

  const queue = useMemo(
    () => activeRetestQueue(rubricEntries, roleFilter),
    [rubricEntries, roleFilter],
  );
  const top = queue.slice(0, 5);
  const more = Math.max(0, queue.length - top.length);

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

  const nextMove = useMemo(
    () =>
      pickNextMove({
        problems,
        fileDefense,
        rubricEntries,
        solidInterviewLogs,
        roleFilter,
        rhythmDone: slots,
        phase,
      }),
    [problems, fileDefense, rubricEntries, solidInterviewLogs, roleFilter, slots, phase],
  );

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

      {/* Compact “do this next” — full width but short, CTA on the right on large screens */}
      <button
        type="button"
        onClick={() => requestNav(nextMove.tab, nextMove.interviewTab)}
        className="relative w-full overflow-hidden rounded-2xl border border-[var(--cyan)]/35 bg-[var(--surface)] px-4 py-3.5 text-left transition hover:border-[var(--cyan)]/55 sm:px-5"
      >
        <div
          className="pointer-events-none absolute -right-6 -top-10 h-24 w-24 rounded-full bg-[var(--cyan)]/12 blur-2xl"
          aria-hidden
        />
        <div className="relative flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--cyan)]">
              Do this next
            </div>
            <div className="mt-0.5 truncate text-base font-semibold tracking-tight text-[var(--text)] sm:text-lg">
              {nextMove.title}
            </div>
            <p className="mt-0.5 line-clamp-2 text-sm text-[var(--text-mid)]">{nextMove.why}</p>
          </div>
          <div className="shrink-0 self-start rounded-lg border border-[var(--cyan)]/40 bg-[var(--tint-cyan)] px-3 py-1.5 text-sm font-medium text-[var(--cyan)] sm:self-center">
            {nextMove.cta} →
          </div>
        </div>
      </button>

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

      <div className={card}>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-medium">Re-practice queue</div>
          <button
            type="button"
            className="text-xs text-[var(--cyan)]"
            onClick={() => requestNav("interview", "gaps")}
          >
            Open Gaps board
          </button>
        </div>
        {top.length === 0 ? (
          <p className="text-sm text-[var(--text-dim)]">
            No due gaps yet. Log a grade with gap tags (or a weak score + gap type) — items show up
            here.
          </p>
        ) : (
          <ul className="space-y-2">
            {top.map((i) => (
              <li key={i.id}>
                <button
                  type="button"
                  className="flex w-full items-start gap-2 rounded-xl border border-[var(--hairline)] bg-[var(--bg-elev)] px-3 py-2 text-left text-sm hover:border-[var(--cyan)]/40"
                  onClick={() => requestNav("interview", "gaps")}
                >
                  <span
                    className="mt-0.5 shrink-0 rounded-full border px-1.5 py-0.5 text-[9px]"
                    style={{
                      borderColor:
                        i.bucket === "due-now"
                          ? "var(--orange)"
                          : i.bucket === "blocked"
                            ? "var(--text-dim)"
                            : "var(--yellow)",
                      color:
                        i.bucket === "due-now"
                          ? "var(--orange)"
                          : i.bucket === "blocked"
                            ? "var(--text-dim)"
                            : "var(--yellow)",
                    }}
                  >
                    {i.bucket === "due-now" ? "now" : i.bucket === "blocked" ? "block" : "soon"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{i.task}</span>
                    <span className="block truncate text-xs text-[var(--text-dim)]">
                      {i.action}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {more > 0 ? (
          <button
            type="button"
            className="mt-3 text-xs text-[var(--cyan)]"
            onClick={() => requestNav("interview", "retest")}
          >
            +{more} more on Retest →
          </button>
        ) : null}
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

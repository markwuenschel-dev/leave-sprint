"use client";

import { useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Clock, ClipboardCheck } from "lucide-react";
import { useWaypointStore } from "@/lib/store";
import { ProgressRing } from "../ui/ProgressRing";
import { QuickLogModal, type QuickLogClassification } from "../rubric/QuickLogModal";
import { SurfaceHero, card } from "./shared";

/** Slugs that read wrong in title case → uppercase (matches ingest humanizer). */
const ACR = new Set(["rag", "api", "http", "sql", "ui", "llm", "cli", "dto", "json", "id", "ci", "cd"]);
function projectLabel(key: string): string {
  return key
    .split("-")
    .map((w) => (ACR.has(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}

/** Rubric classification for grading a defense rep as a project walkthrough. */
function defenseClassification(f: {
  project?: string;
  roleTrack?: string;
}): QuickLogClassification {
  return {
    taskType: "walkthrough",
    domain: f.project ? projectLabel(f.project) : "Project story",
    role: f.roleTrack === "MLE" ? "MLE" : "SWE",
  };
}

/**
 * Defense = file/story cold walkthroughs for the hybrid evidence floor.
 * Green needs core stories practiced ≥1× cold (per primary). Not a second problem bank.
 */
export function DefenseSurface() {
  const items = useWaypointStore((s) => s.fileDefense);
  const filter = useWaypointStore((s) => s.roleFilter);
  const mark = useWaypointStore((s) => s.markDefensePracticed);
  const unmark = useWaypointStore((s) => s.unmarkDefensePracticed);
  const setNotes = useWaypointStore((s) => s.setDefenseNotes);
  const [mode, setMode] = useState<"drill" | "list">("drill");
  const [idx, setIdx] = useState(0);
  const [showHints, setShowHints] = useState(false);
  const [projectFilter, setProjectFilter] = useState<string>("ALL");
  const [gradeTarget, setGradeTarget] = useState<{
    task: string;
    classification: QuickLogClassification;
  } | null>(null);

  const projects = useMemo(
    () => Array.from(new Set(items.map((i) => i.project).filter(Boolean) as string[])).sort(),
    [items],
  );

  const list = useMemo(
    () =>
      items.filter((p) => {
        const roleOk =
          filter === "ALL" || !p.roleTrack || p.roleTrack === "BOTH" || p.roleTrack === filter;
        const projOk = projectFilter === "ALL" || p.project === projectFilter;
        return roleOk && projOk;
      }),
    [items, filter, projectFilter],
  );

  // Drill prefers unpracticed core, then unpracticed, then rest
  const drillOrder = useMemo(() => {
    return [...list].sort((a, b) => {
      const score = (f: (typeof list)[0]) => {
        const n = f.practicedDates?.length ?? 0;
        if (f.core && n === 0) return 0;
        if (n === 0) return 1;
        return 2;
      };
      return score(a) - score(b);
    });
  }, [list]);

  const safeIdx = drillOrder.length ? Math.min(idx, drillOrder.length - 1) : 0;
  const current = drillOrder[safeIdx];

  const practiced = list.filter((f) => (f.practicedDates?.length ?? 0) > 0).length;
  const core = list.filter((f) => f.core);
  const coreDone = core.filter((f) => (f.practicedDates?.length ?? 0) > 0).length;
  const corePct = core.length ? Math.round((coreDone / core.length) * 100) : 0;
  const floorMet = core.length > 0 && coreDone >= core.length;

  function prev() {
    setShowHints(false);
    setIdx((i) => (drillOrder.length ? (i - 1 + drillOrder.length) % drillOrder.length : 0));
  }
  function next() {
    setShowHints(false);
    setIdx((i) => (drillOrder.length ? (i + 1) % drillOrder.length : 0));
  }

  return (
    <div className="space-y-5">
      <SurfaceHero
        eyebrow="Evidence floor · stories"
        title="Defense"
        accent="magenta"
        subtitle={
          <>
            Speak each file/story in <strong className="text-[var(--text)]">45–90s cold</strong>.
            Readiness wants core items practiced at least once — not essay notes.
          </>
        }
        right={
          <div className="flex items-center gap-3 rounded-2xl border border-[var(--hairline)] bg-[var(--bg-elev)] px-4 py-3">
            <ProgressRing
              value={corePct}
              size={64}
              color={floorMet ? "var(--green)" : "var(--magenta)"}
            >
              <span className="text-xs font-bold">{coreDone}</span>
            </ProgressRing>
            <div className="text-xs leading-snug">
              <div className="font-medium text-[var(--text)]">
                {coreDone}/{core.length} core cold
              </div>
              <div
                className="mt-0.5"
                style={{ color: floorMet ? "var(--green)" : "var(--text-dim)" }}
              >
                {floorMet ? "Floor met" : "Practice each core ≥1×"}
              </div>
            </div>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-xl border border-[var(--hairline)] p-0.5">
          {(
            [
              ["drill", "Drill"],
              ["list", "List"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setMode(id)}
              className={`rounded-lg px-3 py-1.5 text-sm transition ${
                mode === id
                  ? "bg-[var(--tint-magenta)] text-[var(--magenta)]"
                  : "text-[var(--text-dim)] hover:text-[var(--text-mid)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {projects.length > 1 ? (
          <select
            value={projectFilter}
            onChange={(e) => {
              setProjectFilter(e.target.value);
              setIdx(0);
              setShowHints(false);
            }}
            className="rounded-xl border border-[var(--hairline)] bg-[var(--surface)] px-2.5 py-1.5 text-sm text-[var(--text-mid)]"
            aria-label="Filter by project"
          >
            <option value="ALL">All projects</option>
            {projects.map((k) => (
              <option key={k} value={k}>
                {projectLabel(k)}
              </option>
            ))}
          </select>
        ) : null}
        <span className="text-xs text-[var(--text-dim)]">
          {practiced}/{list.length} practiced overall
        </span>
      </div>

      {mode === "drill" && current ? (
        <div className="relative overflow-hidden rounded-3xl border border-[var(--hairline)] bg-[var(--surface)]">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--magenta)] to-transparent opacity-50"
            aria-hidden
          />
          <div className="p-5 sm:p-7">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-dim)]">
              <span>
                Card {safeIdx + 1}/{drillOrder.length}
                {current.core ? " · core" : ""}
                {current.roleTrack ? ` · ${current.roleTrack}` : ""}
                {current.project ? ` · ${projectLabel(current.project)}` : ""}
              </span>
              <span className="font-mono normal-case tracking-normal">
                {(current.practicedDates?.length ?? 0) > 0
                  ? `${current.practicedDates!.length}× done`
                  : "not yet"}
              </span>
            </div>

            <div className="font-mono text-xl font-semibold text-[var(--cyan)] sm:text-2xl">
              {current.title}
            </div>
            <p className="mt-2 text-sm text-[var(--text-mid)]">{current.why}</p>

            <div className="mt-6 rounded-2xl border border-[var(--magenta)]/25 bg-[var(--tint-magenta)] p-5">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--magenta)]">
                Say this cold
              </div>
              <p className="text-lg leading-snug text-[var(--text)] sm:text-xl">
                “{current.interviewLine}”
              </p>
            </div>

            {!showHints ? (
              <button
                type="button"
                onClick={() => setShowHints(true)}
                className="mt-4 text-xs text-[var(--cyan)] hover:underline"
              >
                Reveal terminology hints →
              </button>
            ) : (
              <div className="mt-4 rounded-2xl border border-[var(--hairline)] bg-[var(--bg-elev)] p-4 text-sm text-[var(--text-mid)]">
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-dim)]">
                  Terminology
                </div>
                {current.terminology}
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-[var(--hairline)] pt-5">
              <button
                type="button"
                onClick={prev}
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)]"
              >
                <ChevronLeft size={15} className="shrink-0" aria-hidden />
                Prev
              </button>
              <button
                type="button"
                onClick={() => {
                  mark(current.id);
                  next();
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--cyan)] bg-[var(--cyan)] px-3.5 py-2 text-sm font-semibold text-[var(--bg)]"
              >
                <Check size={15} className="shrink-0" strokeWidth={2.5} aria-hidden />
                Practiced → next
              </button>
              <button
                type="button"
                onClick={() =>
                  setGradeTarget({
                    task: `Defense: ${current.title}`,
                    classification: defenseClassification(current),
                  })
                }
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--magenta)]/50 px-3 py-2 text-sm text-[var(--magenta)] hover:bg-[var(--tint-magenta)]"
                title="Score this cold walkthrough into the rubric (shows in History / Gaps / Performance)"
              >
                <ClipboardCheck size={15} className="shrink-0" aria-hidden />
                Grade…
              </button>
              {(current.practicedDates?.length ?? 0) > 0 ? (
                <button
                  type="button"
                  onClick={() => unmark(current.id)}
                  className="inline-flex items-center rounded-lg border border-[var(--hairline)] px-3 py-2 text-sm text-[var(--text-dim)] hover:border-[var(--orange)]/40 hover:text-[var(--orange)]"
                  title="Undo last practice mark (today if set)"
                >
                  Uncheck
                </button>
              ) : null}
              <button
                type="button"
                onClick={next}
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)]"
              >
                Skip
                <ChevronRight size={15} className="shrink-0" aria-hidden />
              </button>
            </div>

            <input
              value={current.notes ?? ""}
              onChange={(e) => setNotes(current.id, e.target.value)}
              placeholder="Optional note after the rep…"
              className="mt-4 w-full rounded-xl border border-[var(--hairline)] bg-[var(--bg-elev)] px-3 py-2 text-sm focus:border-[var(--cyan)] focus:outline-none"
            />
          </div>
        </div>
      ) : null}

      {mode === "drill" && !current ? (
        <div className={`${card} text-sm text-[var(--text-dim)]`}>No defense items for this filter.</div>
      ) : null}

      {mode === "list" ? (
        <div className="space-y-2">
          {list.map((f) => {
            const n = f.practicedDates?.length ?? 0;
            const last = n ? f.practicedDates[n - 1] : null;
            return (
              <div
                key={f.id}
                className={`rounded-2xl border border-[var(--hairline)] px-4 py-3 ${
                  n > 0 ? "bg-[var(--tint-green)]/30" : "bg-[var(--surface)]"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-mono text-sm font-semibold text-[var(--cyan)]">
                      {f.title}
                      {f.core ? (
                        <span className="ml-2 font-sans text-[10px] text-[var(--magenta)]">
                          core
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[var(--text-dim)]">
                      <Clock size={12} />
                      {last ? `${n}× · last ${last}` : "Not practiced"}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setGradeTarget({
                          task: `Defense: ${f.title}`,
                          classification: defenseClassification(f),
                        })
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--magenta)]/50 px-3 py-1.5 text-xs text-[var(--magenta)] hover:bg-[var(--tint-magenta)]"
                    >
                      <ClipboardCheck size={14} className="shrink-0" aria-hidden />
                      Grade
                    </button>
                    <button
                      type="button"
                      onClick={() => mark(f.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--cyan)] bg-[var(--cyan)] px-3 py-1.5 text-xs font-semibold text-[var(--bg)]"
                    >
                      <Check size={14} className="shrink-0" aria-hidden />
                      Practiced
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {gradeTarget ? (
        <QuickLogModal
          task={gradeTarget.task}
          classification={gradeTarget.classification}
          onClose={() => setGradeTarget(null)}
        />
      ) : null}
    </div>
  );
}

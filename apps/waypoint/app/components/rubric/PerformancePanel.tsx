"use client";

import { useMemo } from "react";
import type { RubricEntry } from "@waypoint/rubric";
import {
  buildRoleLevelMatrix,
  weeklyAssessmentBuckets,
  cumulativeQualifying,
} from "@/lib/gaps";
import { roleFilterLabel, type RoleFilter } from "@/lib/domain";
import { RoleLevelMatrixView } from "./RoleLevelMatrix";
import { ProgressRing } from "../ui/ProgressRing";
import { card } from "../surfaces/shared";

/** Large weekly volume bars — how many assessments you logged each week. */
function WeeklyBars({
  weeks,
}: {
  weeks: { weekStart: string; count: number }[];
}) {
  if (!weeks.length) {
    return (
      <p className="text-sm text-[var(--text-dim)]">
        No graded assessments yet in this filter. Log in Grade or import JSON.
      </p>
    );
  }
  const max = Math.max(...weeks.map((w) => w.count), 1);
  const last = weeks[weeks.length - 1];
  const total = weeks.reduce((s, w) => s + w.count, 0);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-dim)]">
            How hard you graded
          </div>
          <div className="mt-1 text-sm text-[var(--text-mid)]">
            Bars = number of assessments logged that calendar week (not quality — volume).
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-3xl font-bold text-[var(--magenta)]">{total}</div>
          <div className="text-[11px] text-[var(--text-dim)]">all-time in filter</div>
        </div>
      </div>

      {/* Pixel heights — % height inside flex often collapses to 0 */}
      <div className="flex items-end gap-1.5 sm:gap-2" style={{ minHeight: 160 }}>
        {weeks.map((w) => {
          const hPx = Math.max(10, Math.round((w.count / max) * 140));
          const label = w.weekStart.slice(5); // MM-DD
          return (
            <div key={w.weekStart} className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <div className="font-mono text-[10px] tabular-nums text-[var(--text-dim)]">
                {w.count}
              </div>
              <div
                className="w-full max-w-[2.75rem] rounded-t-md"
                style={{
                  height: hPx,
                  background:
                    "linear-gradient(to top, color-mix(in srgb, var(--magenta) 85%, transparent), color-mix(in srgb, var(--cyan) 70%, transparent))",
                }}
                title={`${w.weekStart}: ${w.count} assessments`}
              />
              <div className="truncate font-mono text-[9px] text-[var(--text-dim)]">{label}</div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-[var(--text-dim)]">
        Latest week ({last.weekStart}): <strong className="text-[var(--text)]">{last.count}</strong>{" "}
        log{last.count === 1 ? "" : "s"}
      </p>
    </div>
  );
}

export function PerformancePanel({
  entries,
  roleFilter,
}: {
  entries: RubricEntry[];
  roleFilter: RoleFilter;
}) {
  const matrix = useMemo(
    () => buildRoleLevelMatrix(entries, roleFilter),
    [entries, roleFilter],
  );
  const weeks = useMemo(
    () => weeklyAssessmentBuckets(entries, roleFilter),
    [entries, roleFilter],
  );
  const cumQual = useMemo(() => cumulativeQualifying(weeks), [weeks]);
  const totalQual = cumQual.length ? cumQual[cumQual.length - 1] : 0;
  const totalAttempts = weeks.reduce((s, w) => s + w.count, 0);
  // Motivational “proof density” — not a floor score
  const density =
    totalAttempts > 0 ? Math.min(100, Math.round((totalQual / totalAttempts) * 100)) : 0;

  return (
    <div className="space-y-5">
      {/* Filter callout */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[var(--cyan)]/25 bg-[var(--tint-cyan)] px-4 py-3 text-sm">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-dim)]">
          Header filter
        </span>
        <span className="font-semibold text-[var(--cyan)]">{roleFilterLabel(roleFilter)}</span>
        <span className="text-[var(--text-mid)]">
          — scopes Practice, Defense, Interview (gaps / retest / performance), and Readiness
          matrix. Switch All / SWE / MLE in the top bar.
        </span>
      </div>

      {/* Giant motivation strip */}
      <div className="relative overflow-hidden rounded-3xl border border-[var(--hairline)] bg-[var(--surface)] p-6 sm:p-8">
        <div
          className="pointer-events-none absolute -left-10 top-0 h-56 w-56 rounded-full bg-[var(--cyan)]/15 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-10 bottom-0 h-56 w-56 rounded-full bg-[var(--magenta)]/15 blur-3xl"
          aria-hidden
        />
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-dim)]">
              Proof of work
            </div>
            <div className="mt-2 font-mono text-6xl font-black tracking-tighter text-[var(--cyan)] sm:text-7xl">
              {totalQual}
            </div>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--text-mid)]">
              Qualifying level hits under <strong className="text-[var(--text)]">{roleFilterLabel(roleFilter)}</strong>
              — times a grade counted as Level I, II, or III for a role. This is your evidence pile,
              not the hybrid floor.
            </p>
          </div>
          <div className="flex items-center gap-5">
            <ProgressRing value={density} size={100} color="var(--magenta)">
              <span className="text-sm font-bold">{density}%</span>
            </ProgressRing>
            <div className="text-sm">
              <div className="font-medium text-[var(--text)]">Qualifying rate</div>
              <div className="mt-1 max-w-[11rem] text-xs text-[var(--text-dim)]">
                Share of logs that earned a qualifying level ({totalQual} of {totalAttempts || "—"}{" "}
                attempts).
              </div>
            </div>
          </div>
        </div>
      </div>

      <RoleLevelMatrixView matrix={matrix} />

      <div className={`${card} sm:p-6`}>
        <WeeklyBars weeks={weeks} />
      </div>
    </div>
  );
}

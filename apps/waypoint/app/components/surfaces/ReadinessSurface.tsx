"use client";

/**
 * Readiness — the glance surface (redesign 2026-07-14). One card per primary
 * role: concentric floor rings (practice / interviews / stories), a GREEN/OPEN
 * verdict, and a single computed "Closes it" action line with deep links.
 * Role × Level analytics live on Interview → Performance, not here.
 */

import { useMemo } from "react";
import { useWaypointStore } from "@/lib/store";
import { computeReadiness, type RoleFloor } from "@/lib/readiness";
import { openHighGapCount, performanceSummary } from "@/lib/gaps";
import { requestNav, type InterviewTabId, type MainTabId } from "@/lib/nav";
import type { PrimaryRole } from "@/lib/domain";
import { FloorRings } from "../ui/FloorRings";
import { ReadinessKPIs } from "../rubric/AnalyticsPanels";

const RING_COLORS = {
  practice: "var(--cyan)",
  interview: "var(--violet)",
  defense: "var(--magenta)",
} as const;

interface NextStep {
  text: string;
  tab: MainTabId;
  interviewTab?: InterviewTabId;
}

/** 0..1 progress toward each dimension's floor (practice floor is the 80% bar). */
function floorRatios(r: RoleFloor): { practice: number; interview: number; defense: number } {
  const cap = (n: number) => Math.max(0, Math.min(1, n));
  return {
    practice: r.practice.met ? 1 : cap((r.practice.ratio ?? 0) / 0.8),
    interview: r.interview.need ? cap((r.interview.count ?? 0) / r.interview.need) : 0,
    defense: r.defense.need ? cap((r.defense.count ?? 0) / r.defense.need) : 0,
  };
}

function nextSteps(r: RoleFloor): NextStep[] {
  const out: NextStep[] = [];
  if (!r.practice.met) {
    const n = Math.max(1, (r.practice.need ?? 0) - (r.practice.count ?? 0));
    out.push({ text: `${n} more solid core problem${n === 1 ? "" : "s"}`, tab: "practice" });
  }
  if (!r.interview.met) {
    const n = Math.max(1, (r.interview.need ?? 0) - (r.interview.count ?? 0));
    out.push({
      text: `${n} more solid mock${n === 1 ? "" : "s"}`,
      tab: "interview",
      interviewTab: "grade",
    });
  }
  if (!r.defense.met) {
    const n = Math.max(1, (r.defense.need ?? 0) - (r.defense.count ?? 0));
    out.push({ text: `${n} more stor${n === 1 ? "y" : "ies"} cold`, tab: "defense" });
  }
  return out;
}

function RoleCard({
  floor,
  onLogSolid,
}: {
  floor: RoleFloor;
  onLogSolid: () => void;
}) {
  const ratios = floorRatios(floor);
  const pct = Math.round(((ratios.practice + ratios.interview + ratios.defense) / 3) * 100);
  const steps = nextSteps(floor);

  const dims: { key: keyof typeof RING_COLORS; name: string; d: RoleFloor["practice"] }[] = [
    { key: "practice", name: "Practice", d: floor.practice },
    { key: "interview", name: "Interviews", d: floor.interview },
    { key: "defense", name: "Stories cold", d: floor.defense },
  ];

  return (
    <div className="rounded-3xl border border-[var(--hairline)] bg-[var(--surface)] p-5 sm:p-6">
      <div className="mb-4 flex items-baseline justify-between gap-2">
        <h3 className="font-semibold">
          {floor.role === "SWE_FS_II" ? "SWE Full Stack II" : "MLE II"}
        </h3>
        <span
          className="text-[11px] font-bold tracking-[0.08em]"
          style={{ color: floor.green ? "var(--green)" : "var(--yellow)" }}
        >
          {floor.green ? "GREEN" : "OPEN"}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-5">
        <FloorRings
          label={`${floor.role} floor progress`}
          rings={[
            { value: ratios.practice, color: RING_COLORS.practice },
            { value: ratios.interview, color: RING_COLORS.interview },
            { value: ratios.defense, color: RING_COLORS.defense },
          ]}
          center={
            <div className="text-center leading-tight">
              <div
                className="font-mono text-xl font-bold"
                style={{ color: floor.green ? "var(--green)" : "var(--text)" }}
              >
                {floor.green ? "GO" : `${pct}%`}
              </div>
              <div className="text-[8px] uppercase tracking-[0.14em] text-[var(--text-dim)]">
                of floor
              </div>
            </div>
          }
        />
        <div className="min-w-[150px] flex-1 space-y-2">
          {dims.map(({ key, name, d }) => (
            <div key={key} className="flex items-baseline gap-2 text-sm">
              <span
                className="h-2 w-2 shrink-0 translate-y-px rounded-full"
                style={{ background: RING_COLORS[key] }}
                aria-hidden
              />
              <span className="text-[var(--text-mid)]">{name}</span>
              <span
                className={`ml-auto font-mono text-xs ${
                  d.met ? "text-[var(--green)]" : "text-[var(--text)]"
                }`}
                title={d.detail}
              >
                {d.count ?? 0}/{d.need ?? 0}
                {d.met ? " ✓" : ""}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 border-t border-[var(--hairline)] pt-3.5 text-sm">
        {floor.green ? (
          <span className="text-[var(--green)]">Floor met — keep it warm.</span>
        ) : (
          <span className="text-[var(--text-mid)]">
            <span className="font-semibold text-[var(--cyan)]">Closes it:</span>{" "}
            {steps.map((s, i) => (
              <span key={s.text}>
                {i > 0 ? " + " : ""}
                <button
                  type="button"
                  onClick={() => requestNav(s.tab, s.interviewTab)}
                  className="underline decoration-[var(--hairline-strong)] underline-offset-2 hover:text-[var(--cyan)] hover:decoration-[var(--cyan)]"
                >
                  {s.text}
                </button>
              </span>
            ))}
          </span>
        )}
        <button
          type="button"
          className="mt-2 block text-xs text-[var(--text-dim)] hover:text-[var(--cyan)]"
          onClick={onLogSolid}
        >
          + Log solid interview/mock for this role
        </button>
      </div>
    </div>
  );
}

export function ReadinessSurface() {
  const state = useWaypointStore();
  const snap = useMemo(() => computeReadiness(state), [state]);
  const logSolid = useWaypointStore((s) => s.logSolidInterview);
  const roleFilter = state.roleFilter;
  const highGaps = useMemo(
    () => openHighGapCount(state.rubricEntries, roleFilter),
    [state.rubricEntries, roleFilter],
  );
  const summary = useMemo(
    () => performanceSummary(state.rubricEntries, roleFilter),
    [state.rubricEntries, roleFilter],
  );
  const greenCount = snap.roles.filter((r) => r.green).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-2xl font-semibold">Readiness</h2>
        <span
          className="rounded-full border px-3 py-0.5 text-xs font-semibold"
          style={{
            borderColor: snap.evidenceGreen ? "var(--green)" : "var(--yellow)",
            color: snap.evidenceGreen ? "var(--green)" : "var(--yellow)",
          }}
          title="Hybrid gate: checkable floor for both primaries + your go/no-go. Today checkboxes do not auto-green this board."
        >
          Evidence: {greenCount}/2 roles green
        </span>
        {highGaps > 0 ? (
          <span
            className="rounded-full border border-[var(--orange)]/50 px-3 py-0.5 text-xs text-[var(--orange)]"
            title="Open High/Critical gaps — signal only, does not change evidence green"
          >
            {highGaps} high gap{highGaps === 1 ? "" : "s"} open
          </span>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {snap.roles.map((r) => (
          <RoleCard
            key={r.role}
            floor={r}
            onLogSolid={() => logSolid(r.role as PrimaryRole)}
          />
        ))}
      </div>

      <ReadinessKPIs s={summary} />
    </div>
  );
}

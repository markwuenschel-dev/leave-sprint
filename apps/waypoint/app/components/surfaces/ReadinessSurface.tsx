"use client";

/**
 * Readiness — the glance surface. One card per role, and the card is a scoreboard:
 * average final score for that role, big, with the numbers behind it.
 * "How well am I answering questions?" — nothing else.
 *
 * The evidence floor (practice / mocks / stories coverage) deliberately does NOT
 * appear on these cards. It answers a different question — did you do the reps —
 * and mixing it in is what made this surface unreadable. It survives only as the
 * header pill; the coverage detail lives on Interview → Performance.
 */

import { useMemo } from "react";
import { useWaypointStore } from "@/lib/store";
import { computeReadiness } from "@/lib/readiness";
import {
  openHighGapCount,
  performanceSummary,
  type MatrixRole,
  type PerfSummary,
} from "@/lib/gaps";
import { requestNav } from "@/lib/nav";
import { ScoreDonut, scoreColor } from "../ui/ScoreDonut";

const ROLE_LABELS: Record<MatrixRole, string> = {
  SWE: "SWE Full Stack II",
  MLE: "MLE II",
  DS: "DS",
  DE: "DE",
  BIE: "BIE",
  BIA: "BIA",
};

const ROLES: MatrixRole[] = ["SWE", "MLE", "DS", "DE", "BIE", "BIA"];

function trendText(trend: number | null): { text: string; color: string } | null {
  if (trend == null || trend === 0) return null;
  const up = trend > 0;
  return {
    text: `${up ? "▲" : "▼"} ${Math.abs(trend)} vs last 5`,
    color: up ? "var(--green)" : "var(--text-dim)",
  };
}

function Stat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  accent?: string;
}) {
  return (
    <div>
      <div className="mb-0.5 text-[9px] font-semibold uppercase tracking-[0.13em] text-[var(--text-dim)]">
        {label}
      </div>
      <div className="font-mono text-[19px] font-bold leading-tight" style={{ color: accent ?? "var(--text)" }}>
        {value}
      </div>
      {sub ? <div className="mt-px text-[10px] text-[var(--text-dim)]">{sub}</div> : null}
    </div>
  );
}

function RoleCard({ role, summary }: { role: MatrixRole; summary: PerfSummary }) {
  const label = ROLE_LABELS[role];
  const t = trendText(summary.trend);

  return (
    <div className="flex flex-col gap-[18px] rounded-3xl border border-[var(--hairline)] bg-[var(--surface)] p-5 sm:p-[22px]">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-semibold">{label}</h3>
        <span className="text-[10px] uppercase tracking-[0.06em] text-[var(--text-dim)]">
          {summary.graded ? `${summary.graded} graded` : "no data"}
        </span>
      </div>

      {summary.graded ? (
        <div className="flex flex-wrap items-center gap-5">
          <ScoreDonut
            score={summary.avgFinal}
            label={`${label} average final score: ${summary.avgFinal} of 100`}
            center={
              <div className="text-center leading-tight">
                <div className="font-mono text-[34px] font-bold" style={{ color: scoreColor(summary.avgFinal) }}>
                  {summary.avgFinal ?? "—"}
                </div>
                <div className="text-[8px] uppercase tracking-[0.14em] text-[var(--text-dim)]">
                  avg final
                </div>
                {t ? (
                  <div className="font-mono text-[10px] font-semibold" style={{ color: t.color }}>
                    {t.text}
                  </div>
                ) : null}
              </div>
            }
          />
          <div className="grid min-w-[168px] flex-1 grid-cols-2 gap-x-3.5 gap-y-3">
            <Stat
              label="Pass rate"
              value={`${summary.passRate}%`}
              sub="scored ≥ 70"
              accent={summary.passRate >= 50 ? "var(--green)" : "var(--yellow)"}
            />
            <Stat label="Qualifying" value={`${summary.qualifyingRate}%`} sub="earned a level" />
            <Stat
              label="Best levels"
              value={
                <span
                  className="inline-flex items-baseline gap-1.5"
                  title={`${summary.bestLevel.L1} × L1 · ${summary.bestLevel.L2} × L2 · ${summary.bestLevel.L3} × L3`}
                >
                  <span style={{ color: "var(--cyan)" }}>{summary.bestLevel.L1}</span>
                  <span className="text-[11px] text-[var(--text-dim)]">·</span>
                  <span style={{ color: "var(--orange)" }}>{summary.bestLevel.L2}</span>
                  <span className="text-[11px] text-[var(--text-dim)]">·</span>
                  <span style={{ color: "var(--magenta)" }}>{summary.bestLevel.L3}</span>
                </span>
              }
              sub="L1 · L2 · L3"
            />
            <Stat
              label="Proof strength"
              value={summary.avgProof != null ? `${Math.round(summary.avgProof * 100)}%` : "—"}
              sub="avg confidence"
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-5">
          <ScoreDonut
            score={null}
            label={`${label} — nothing graded yet`}
            center={
              <div className="text-center leading-tight">
                <div className="font-mono text-[34px] font-bold text-[var(--text-dim)]">—</div>
                <div className="text-[8px] uppercase tracking-[0.14em] text-[var(--text-dim)]">
                  avg final
                </div>
              </div>
            }
          />
          <div className="min-w-[168px] flex-1 space-y-2">
            <p className="text-xs text-[var(--text-dim)]">Nothing graded as {label} yet.</p>
            <button
              type="button"
              onClick={() => requestNav("interview", "grade")}
              className="text-xs text-[var(--cyan)] underline underline-offset-2"
            >
              Grade a {label} assessment
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ReadinessSurface() {
  const state = useWaypointStore();
  const snap = useMemo(() => computeReadiness(state), [state]);
  const roleFilter = state.roleFilter;

  const highGaps = useMemo(
    () => openHighGapCount(state.rubricEntries, roleFilter),
    [state.rubricEntries, roleFilter],
  );
  // One summary per role, independent of the header filter — every card always
  // shows, and always counts only its own role.
  const summaries = useMemo(() => {
    const out = {} as Record<MatrixRole, PerfSummary>;
    for (const r of ROLES) out[r] = performanceSummary(state.rubricEntries, r);
    return out;
  }, [state.rubricEntries]);

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
          title="Hybrid gate: checkable coverage floor for both primaries + your go/no-go. Detail lives on Interview → Performance."
        >
          Evidence: {greenCount}/2 primaries green
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
        {ROLES.map((r) => (
          <RoleCard key={r} role={r} summary={summaries[r]} />
        ))}
      </div>
    </div>
  );
}

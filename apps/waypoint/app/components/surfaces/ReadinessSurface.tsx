"use client";

import { useMemo } from "react";
import { useWaypointStore } from "@/lib/store";
import { computeReadiness } from "@/lib/readiness";
import { buildRoleLevelMatrix, openHighGapCount } from "@/lib/gaps";
import type { PrimaryRole } from "@/lib/domain";
import { ProgressRing } from "../ui/ProgressRing";
import { RoleLevelMatrixView } from "../rubric/RoleLevelMatrix";
import { card } from "./shared";

function DimBar({
  met,
  label,
  detail,
  ratio,
}: {
  met: boolean;
  label: string;
  detail: string;
  ratio?: number;
}) {
  const pct = ratio != null ? Math.round(Math.min(1, ratio) * 100) : met ? 100 : 0;
  return (
    <div className="mb-3 last:mb-0">
      <div className="mb-1 flex justify-between text-sm">
        <span>
          {met ? "✓" : "○"} {label}
        </span>
        <span className="text-xs text-[var(--text-dim)]">{pct}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--fill-strong)]">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            background: met ? "var(--green)" : "var(--cyan)",
          }}
        />
      </div>
      <div className="mt-0.5 text-xs text-[var(--text-dim)]">{detail}</div>
    </div>
  );
}

export function ReadinessSurface() {
  const state = useWaypointStore();
  const snap = useMemo(() => computeReadiness(state), [state]);
  const setPhase = useWaypointStore((s) => s.setPhase);
  const logSolid = useWaypointStore((s) => s.logSolidInterview);
  const phase = state.phase;
  const roleFilter = state.roleFilter;
  const highGaps = useMemo(
    () => openHighGapCount(state.rubricEntries, roleFilter),
    [state.rubricEntries, roleFilter],
  );
  const matrix = useMemo(
    () => buildRoleLevelMatrix(state.rubricEntries, roleFilter),
    [state.rubricEntries, roleFilter],
  );

  function enterA() {
    if (!snap.evidenceGreen) {
      const ok = window.confirm(
        "Evidence is not green yet. Personal go/no-go: enter Phase A anyway?",
      );
      if (!ok) return;
    }
    setPhase("A");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-semibold">Readiness</h2>
          <ProgressRing
            value={snap.evidenceGreen ? 100 : (snap.roles.filter((r) => r.green).length / 2) * 100}
            size={48}
            color={snap.evidenceGreen ? "var(--green)" : "var(--cyan)"}
          >
            <span className="text-[10px] font-bold">{snap.evidenceGreen ? "GO" : "B"}</span>
          </ProgressRing>
        </div>
        <div className="flex gap-2">
          {phase === "B" ? (
            <button
              type="button"
              onClick={enterA}
              className="rounded-xl border border-[var(--cyan)]/40 bg-[var(--cyan)]/15 px-4 py-2 text-sm font-medium text-[var(--cyan)]"
            >
              Enter Phase A
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setPhase("B")}
              className="rounded-xl border border-[var(--hairline)] px-4 py-2 text-sm"
            >
              Return to Phase B
            </button>
          )}
        </div>
      </div>
      <p className="text-sm text-[var(--text-mid)]">
        Hybrid gate: checkable floor for both primaries + your go/no-go. Today checkboxes do not
        auto-green this board.
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        {snap.roles.map((r) => (
          <div key={r.role} className={card}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">
                {r.role === "SWE_FS_II" ? "SWE Full Stack II" : "MLE II"}
              </h3>
              <span style={{ color: r.green ? "var(--green)" : "var(--text-dim)" }}>
                {r.green ? "GREEN" : "OPEN"}
              </span>
            </div>
            <DimBar
              met={r.practice.met}
              label={r.practice.label}
              detail={r.practice.detail}
              ratio={r.practice.ratio}
            />
            <DimBar
              met={r.interview.met}
              label={r.interview.label}
              detail={r.interview.detail}
              ratio={
                r.interview.need
                  ? Math.min(1, (r.interview.count ?? 0) / r.interview.need)
                  : undefined
              }
            />
            <DimBar
              met={r.defense.met}
              label={r.defense.label}
              detail={r.defense.detail}
              ratio={
                r.defense.need
                  ? Math.min(1, (r.defense.count ?? 0) / r.defense.need)
                  : undefined
              }
            />
            <button
              type="button"
              className="mt-3 text-xs text-[var(--cyan)]"
              onClick={() => logSolid(r.role as PrimaryRole)}
            >
              + Log solid interview/mock for this role
            </button>
          </div>
        ))}
      </div>
      <p className="text-sm">
        Overall evidence:{" "}
        <strong style={{ color: snap.evidenceGreen ? "var(--green)" : "var(--yellow)" }}>
          {snap.evidenceGreen ? "GREEN" : "not yet"}
        </strong>
        {" · "}
        both primaries must clear practice, interview, and defense.
      </p>

      {/* Soft signal only — does not block green / Phase A */}
      <p className="text-sm text-[var(--text-mid)]">
        Open High/Critical gaps:{" "}
        <strong style={{ color: highGaps > 0 ? "var(--orange)" : "var(--text-dim)" }}>
          {highGaps}
        </strong>
        {" · "}
        signal only; does not change evidence green.
      </p>

      <RoleLevelMatrixView matrix={matrix} compact />
    </div>
  );
}

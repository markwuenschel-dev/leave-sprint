"use client";

import type { RoleLevelMatrix as Matrix, RoleLevelRow } from "@/lib/gaps";
import { MATRIX_LEVELS } from "@/lib/gaps";
import { card } from "../surfaces/shared";

const ROLE_LABEL: Record<string, string> = {
  SWE: "SWE",
  MLE: "MLE",
  DS: "DS",
  DE: "DE",
};

const ROLE_FULL: Record<string, string> = {
  SWE: "Software engineering",
  MLE: "Machine learning eng",
  DS: "Data science",
  DE: "Data engineering",
};

const LEVEL_LABEL: Record<string, string> = {
  L1: "I",
  L2: "II",
  L3: "III",
};

const LEVEL_WORDS: Record<string, string> = {
  L1: "Level I",
  L2: "Level II",
  L3: "Level III",
};

function LevelBars({ row }: { row: RoleLevelRow }) {
  const max = Math.max(row.cells.L1.count, row.cells.L2.count, row.cells.L3.count, 1);
  return (
    <div className="mt-4 space-y-2">
      {MATRIX_LEVELS.map((L) => {
        const n = row.cells[L].count;
        const pct = Math.round((n / max) * 100);
        const best = row.cells[L].isBest;
        return (
          <div key={L} className="flex items-center gap-3">
            <div className="w-10 shrink-0 text-[11px] font-semibold text-[var(--text-dim)]">
              {LEVEL_LABEL[L]}
            </div>
            <div className="h-3 flex-1 overflow-hidden rounded-full bg-[var(--fill-strong)]">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: n ? `${Math.max(pct, 8)}%` : "0%",
                  background: best
                    ? "var(--cyan)"
                    : n
                      ? "color-mix(in srgb, var(--cyan) 45%, var(--text-dim))"
                      : "transparent",
                }}
              />
            </div>
            <div
              className={`w-8 shrink-0 text-right font-mono text-sm tabular-nums ${
                best ? "font-bold text-[var(--cyan)]" : "text-[var(--text-mid)]"
              }`}
            >
              {n || "—"}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Compact table for Readiness */
export function RoleLevelMatrixView({
  matrix,
  compact = false,
}: {
  matrix: Matrix;
  compact?: boolean;
}) {
  if (!matrix.rows.length) {
    return (
      <div className={`${card} text-sm text-[var(--text-dim)]`}>
        No role-scoped assessments yet. Log grades with a primary role (SWE / MLE / DS / DE).
      </div>
    );
  }

  const hasAny = matrix.rows.some((r) => r.total > 0);

  if (compact) {
    return (
      <div className={card}>
        <div className="mb-1 text-xs font-medium uppercase tracking-wider text-[var(--text-dim)]">
          Role × level (qualifying hits)
        </div>
        <p className="mb-3 text-[11px] text-[var(--text-dim)]">
          How many times each role showed Level I / II / III on graded work. Highlight = best so far.
        </p>
        {!hasAny ? (
          <p className="text-sm text-[var(--text-dim)]">No qualifying evidence yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[280px] border-collapse text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-[var(--text-dim)]">
                  <th className="pb-2 pr-3 font-medium">Role</th>
                  {MATRIX_LEVELS.map((L) => (
                    <th key={L} className="px-2 pb-2 text-center font-medium">
                      {LEVEL_LABEL[L]}
                    </th>
                  ))}
                  <th className="pb-2 pl-2 text-right font-medium">Best</th>
                </tr>
              </thead>
              <tbody>
                {matrix.rows.map((row) => (
                  <tr key={row.role} className="border-t border-[var(--hairline)]">
                    <td className="py-2 pr-3 font-medium">{ROLE_LABEL[row.role]}</td>
                    {MATRIX_LEVELS.map((L) => {
                      const cell = row.cells[L];
                      return (
                        <td key={L} className="px-2 py-2 text-center">
                          {cell.count === 0 ? (
                            <span className="text-[var(--text-dim)]">·</span>
                          ) : (
                            <span
                              className={`inline-flex min-w-[1.75rem] justify-center rounded-md px-1.5 py-0.5 font-mono text-xs ${
                                cell.isBest
                                  ? "bg-[var(--cyan)]/15 text-[var(--cyan)] ring-1 ring-[var(--cyan)]/40"
                                  : "text-[var(--text-mid)]"
                              }`}
                            >
                              {cell.count}
                            </span>
                          )}
                        </td>
                      );
                    })}
                    <td className="py-2 pl-2 text-right text-xs text-[var(--text-dim)]">
                      {row.best ? LEVEL_LABEL[row.best] : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // Full / motivational layout for Interview → Performance
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[var(--hairline)] bg-[var(--bg-elev)] px-4 py-3 text-sm text-[var(--text-mid)]">
        <strong className="text-[var(--text)]">What the numbers mean:</strong> each cell is how many
        graded assessments for that role counted as{" "}
        <em>qualifying Level I / II / III</em> (you actually demonstrated that bar). Bigger best
        level = stronger evidence for that track. Empty = no graded proof yet.
      </div>

      {!hasAny ? (
        <div className={`${card} text-sm text-[var(--text-dim)]`}>
          No qualifying L1–L3 evidence yet for this filter. Log grades with a role + qualifying
          level.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {matrix.rows.map((row) => (
            <div
              key={row.role}
              className="relative overflow-hidden rounded-3xl border border-[var(--hairline)] bg-[var(--surface)] p-5 sm:p-6"
            >
              <div
                className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-[var(--cyan)]/10 blur-2xl"
                aria-hidden
              />
              <div className="relative">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-2xl font-bold tracking-tight">{ROLE_LABEL[row.role]}</div>
                    <div className="text-xs text-[var(--text-dim)]">{ROLE_FULL[row.role]}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-dim)]">
                      Best shown
                    </div>
                    <div
                      className={`font-mono text-4xl font-black tracking-tight sm:text-5xl ${
                        row.best ? "text-[var(--cyan)]" : "text-[var(--text-dim)]"
                      }`}
                    >
                      {row.best ? LEVEL_LABEL[row.best] : "—"}
                    </div>
                  </div>
                </div>

                <p className="mt-3 text-sm text-[var(--text-mid)]">
                  {row.best ? (
                    <>
                      You have shown{" "}
                      <strong className="text-[var(--text)]">{ROLE_LABEL[row.role]}</strong> at{" "}
                      <strong className="text-[var(--cyan)]">{LEVEL_WORDS[row.best]}</strong>
                      {row.cells[row.best].count > 1
                        ? ` (${row.cells[row.best].count} times)`
                        : ""}
                      .
                    </>
                  ) : (
                    <>No qualifying level logged for this role yet.</>
                  )}
                </p>

                <LevelBars row={row} />

                <div className="mt-4 text-[11px] text-[var(--text-dim)]">
                  {row.total} qualifying hit{row.total === 1 ? "" : "s"} total across I–III
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import type { ProblemStatus, Tier } from "@waypoint/practice-types";
import { useWaypointStore } from "@/lib/store";
import { ProgressRing } from "../ui/ProgressRing";
import { SurfaceHero, card, selectClass } from "./shared";

const TIERS: Tier[] = ["A", "B", "C", "D"];
const STATUSES: ProblemStatus[] = ["not-started", "practicing", "solid"];

const tierColor: Record<Tier, string> = {
  A: "var(--cyan)",
  B: "var(--green)",
  C: "var(--yellow)",
  D: "var(--violet)",
};

/**
 * Practice = coding bank for the hybrid evidence floor.
 * Green needs ~80% Solid on core problems (per primary). This tab is that ledger.
 */
export function PracticeSurface() {
  const problems = useWaypointStore((s) => s.problems);
  const filter = useWaypointStore((s) => s.roleFilter);
  const setStatus = useWaypointStore((s) => s.setProblemStatus);
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<"all" | Tier>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | ProblemStatus>("all");
  const [coreOnly, setCoreOnly] = useState(true);
  const [focusQueue, setFocusQueue] = useState(true);

  const scoped = useMemo(() => {
    return problems.filter((p) => {
      if (filter === "SWE" && p.roleTrack === "MLE") return false;
      if (filter === "MLE" && p.roleTrack === "SWE") return false;
      return true;
    });
  }, [problems, filter]);

  const core = scoped.filter((p) => p.core);
  const coreSolid = core.filter((p) => p.status === "solid").length;
  const corePct = core.length ? Math.round((coreSolid / core.length) * 100) : 0;
  const floorMet = core.length > 0 && corePct >= 80;

  const nextUp = useMemo(() => {
    return scoped
      .filter((p) => p.core && p.status !== "solid")
      .sort((a, b) => {
        const rank = (s: ProblemStatus) =>
          s === "practicing" ? 0 : s === "not-started" ? 1 : 2;
        const r = rank(a.status) - rank(b.status);
        if (r !== 0) return r;
        return a.tier.localeCompare(b.tier) || a.title.localeCompare(b.title);
      })
      .slice(0, 8);
  }, [scoped]);

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = scoped.filter((p) => {
      if (coreOnly && !p.core) return false;
      if (tierFilter !== "all" && p.tier !== tierFilter) return false;
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) || p.pattern.toLowerCase().includes(q)
      );
    });
    if (focusQueue) {
      // Queue mode: not-solid first, then solid collapsed-ish by sort
      rows = [...rows].sort((a, b) => {
        const solidA = a.status === "solid" ? 1 : 0;
        const solidB = b.status === "solid" ? 1 : 0;
        if (solidA !== solidB) return solidA - solidB;
        return a.tier.localeCompare(b.tier) || a.title.localeCompare(b.title);
      });
    } else {
      rows = [...rows].sort(
        (a, b) => a.tier.localeCompare(b.tier) || a.title.localeCompare(b.title),
      );
    }
    return rows;
  }, [scoped, search, tierFilter, statusFilter, coreOnly, focusQueue]);

  const byTier = TIERS.map((t) => ({
    tier: t,
    rows: list.filter((p) => p.tier === t),
  })).filter((g) => g.rows.length > 0);

  return (
    <div className="space-y-5">
      <SurfaceHero
        eyebrow="Evidence floor · coding"
        title="Practice"
        accent="green"
        subtitle={
          <>
            Mark patterns <strong className="text-[var(--text)]">Solid</strong> when you can
            solve cold. Readiness uses ~80% core solid for each primary — not the whole bank.
          </>
        }
        right={
          <div className="flex items-center gap-3 rounded-2xl border border-[var(--hairline)] bg-[var(--bg-elev)] px-4 py-3">
            <ProgressRing
              value={corePct}
              size={64}
              color={floorMet ? "var(--green)" : "var(--cyan)"}
            >
              <span className="text-xs font-bold">{corePct}%</span>
            </ProgressRing>
            <div className="text-xs leading-snug">
              <div className="font-medium text-[var(--text)]">
                {coreSolid}/{core.length} core solid
              </div>
              <div
                className="mt-0.5"
                style={{ color: floorMet ? "var(--green)" : "var(--text-dim)" }}
              >
                {floorMet ? "Floor met (≥80%)" : "Need ≥80% core"}
              </div>
            </div>
          </div>
        }
      />

      {/* Next-up strip */}
      {nextUp.length > 0 ? (
        <div className={card}>
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-dim)]">
              Next up · core not solid
            </div>
            <span className="text-[11px] text-[var(--text-dim)]">{nextUp.length} shown</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {nextUp.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() =>
                  setStatus(
                    p.id,
                    p.status === "not-started"
                      ? "practicing"
                      : p.status === "practicing"
                        ? "solid"
                        : "solid",
                  )
                }
                title="Click to advance status"
                className="group rounded-xl border border-[var(--hairline)] bg-[var(--bg-elev)] px-3 py-2 text-left transition hover:border-[var(--cyan)]/40"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="font-mono text-[10px] font-bold"
                    style={{ color: tierColor[p.tier] }}
                  >
                    {p.tier}
                  </span>
                  <span className="max-w-[10rem] truncate text-sm font-medium">{p.title}</span>
                </div>
                <div className="mt-0.5 text-[10px] capitalize text-[var(--text-dim)]">
                  {p.status === "not-started" ? "new → practice" : "practicing → solid"}
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className={`${card} text-sm text-[var(--green)]`}>
          All core problems in this filter are solid. Optional bank still available below.
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input
          className="min-w-[160px] flex-1 rounded-xl border border-[var(--hairline)] bg-[var(--bg-elev)] px-3 py-2 text-sm focus:border-[var(--cyan)] focus:outline-none"
          placeholder="Search title or pattern…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className={selectClass}
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value as "all" | Tier)}
        >
          <option value="all">All tiers</option>
          {TIERS.map((t) => (
            <option key={t} value={t}>
              Tier {t}
            </option>
          ))}
        </select>
        <select
          className={selectClass}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "all" | ProblemStatus)}
        >
          <option value="all">All status</option>
          {STATUSES.map((st) => (
            <option key={st} value={st}>
              {st}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 rounded-lg border border-[var(--hairline)] px-2 py-1 text-xs text-[var(--text-mid)]">
          <input
            type="checkbox"
            checked={coreOnly}
            onChange={(e) => setCoreOnly(e.target.checked)}
          />
          Core only
        </label>
        <label className="flex items-center gap-1.5 rounded-lg border border-[var(--hairline)] px-2 py-1 text-xs text-[var(--text-mid)]">
          <input
            type="checkbox"
            checked={focusQueue}
            onChange={(e) => setFocusQueue(e.target.checked)}
          />
          Work queue first
        </label>
      </div>

      {byTier.length === 0 ? (
        <div className={`${card} text-sm text-[var(--text-dim)]`}>No problems match filters.</div>
      ) : (
        byTier.map(({ tier, rows }) => (
          <div key={tier} className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <span
                className="inline-flex h-6 w-6 items-center justify-center rounded-md font-mono text-[11px] font-bold"
                style={{
                  color: tierColor[tier],
                  border: `1px solid ${tierColor[tier]}`,
                  background: "var(--surface-2)",
                }}
              >
                {tier}
              </span>
              <span className="text-sm font-semibold">Tier {tier}</span>
              <span className="text-xs text-[var(--text-dim)]">{rows.length}</span>
            </div>
            <div className="overflow-hidden rounded-2xl border border-[var(--hairline)]">
              {rows.map((p, i) => (
                <div
                  key={p.id}
                  className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 ${
                    i > 0 ? "border-t border-[var(--hairline)]" : ""
                  } ${p.status === "solid" ? "bg-[var(--tint-green)]/40" : "bg-[var(--surface)]"}`}
                >
                  <div className="min-w-0">
                    <div className="font-medium">
                      {p.leetcodeSlug ? (
                        <a
                          href={`https://leetcode.com/problems/${p.leetcodeSlug}/`}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-[var(--cyan)]"
                        >
                          {p.title}
                        </a>
                      ) : (
                        p.title
                      )}{" "}
                      {p.core ? (
                        <span className="ml-1 rounded border border-[var(--cyan)]/30 px-1 text-[10px] text-[var(--cyan)]">
                          core
                        </span>
                      ) : null}
                    </div>
                    <div className="text-xs text-[var(--text-dim)]">
                      {p.pattern}
                      {p.roleTrack ? ` · ${p.roleTrack}` : ""}
                    </div>
                  </div>
                  <div className="flex rounded-lg border border-[var(--hairline)] p-0.5">
                    {STATUSES.map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setStatus(p.id, st)}
                        className={`rounded-md px-2.5 py-1 text-[11px] capitalize transition ${
                          p.status === st
                            ? st === "solid"
                              ? "bg-[var(--green)]/20 text-[var(--green)]"
                              : st === "practicing"
                                ? "bg-[var(--cyan)]/15 text-[var(--cyan)]"
                                : "bg-[var(--fill-strong)] text-[var(--text-mid)]"
                            : "text-[var(--text-dim)] hover:text-[var(--text-mid)]"
                        }`}
                      >
                        {st === "not-started" ? "new" : st === "practicing" ? "reps" : "solid"}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

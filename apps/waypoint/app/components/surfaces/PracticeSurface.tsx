"use client";

import { useMemo, useState } from "react";
import type { ProblemStatus, Tier } from "@waypoint/practice-types";
import { useWaypointStore } from "@/lib/store";
import { ProgressRing } from "../ui/ProgressRing";
import { card, selectClass } from "./shared";

const TIERS: Tier[] = ["A", "B", "C", "D"];
const STATUSES: ProblemStatus[] = ["not-started", "practicing", "solid"];

const tierColor: Record<Tier, string> = {
  A: "var(--cyan)",
  B: "var(--green)",
  C: "var(--yellow)",
  D: "var(--violet)",
};

const statusStyle: Record<ProblemStatus, string> = {
  "not-started": "border-[var(--hairline-strong)] text-[var(--text-dim)]",
  practicing: "border-[var(--cyan)] text-[var(--cyan)] bg-[var(--cyan)]/10",
  solid: "border-[var(--done)] text-[var(--done)] bg-[var(--done)]/10",
};

export function PracticeSurface() {
  const problems = useWaypointStore((s) => s.problems);
  const filter = useWaypointStore((s) => s.roleFilter);
  const setStatus = useWaypointStore((s) => s.setProblemStatus);
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<"all" | Tier>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | ProblemStatus>("all");
  const [coreOnly, setCoreOnly] = useState(false);

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return problems
      .filter((p) => {
        if (filter === "SWE" && p.roleTrack === "MLE") return false;
        if (filter === "MLE" && p.roleTrack === "SWE") return false;
        if (tierFilter !== "all" && p.tier !== tierFilter) return false;
        if (statusFilter !== "all" && p.status !== statusFilter) return false;
        if (coreOnly && !p.core) return false;
        if (!q) return true;
        return (
          p.title.toLowerCase().includes(q) || p.pattern.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const t = a.tier.localeCompare(b.tier);
        if (t !== 0) return t;
        return a.title.localeCompare(b.title);
      });
  }, [problems, filter, search, tierFilter, statusFilter, coreOnly]);

  const solid = problems.filter((p) => p.status === "solid").length;
  const core = problems.filter((p) => p.core);
  const coreSolid = core.filter((p) => p.status === "solid").length;
  const solidPct = problems.length ? Math.round((solid / problems.length) * 100) : 0;

  const byTier = TIERS.map((t) => {
    const rows = list.filter((p) => p.tier === t);
    return { tier: t, rows };
  }).filter((g) => g.rows.length > 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Practice</h2>
          <p className="mt-1 text-sm text-[var(--text-dim)]">
            {problems.length} problems · {coreSolid}/{core.length} core solid · role filter applies
          </p>
        </div>
        <div className={`${card} flex items-center gap-3 py-3`}>
          <ProgressRing value={solidPct} size={56} color="var(--green)">
            <span className="text-[11px] font-semibold">{solidPct}%</span>
          </ProgressRing>
          <div className="text-xs text-[var(--text-dim)]">
            <div>
              <span className="text-[var(--text)] font-medium">{solid}</span> solid
            </div>
            <div>
              <span className="text-[var(--cyan)]">{problems.filter((p) => p.status === "practicing").length}</span>{" "}
              practicing
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          className="min-w-[180px] flex-1 rounded-xl border border-[var(--hairline)] bg-transparent px-3 py-2 text-sm"
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
        <label className="flex items-center gap-1.5 text-xs text-[var(--text-mid)]">
          <input
            type="checkbox"
            checked={coreOnly}
            onChange={(e) => setCoreOnly(e.target.checked)}
          />
          Core only
        </label>
      </div>

      {byTier.length === 0 ? (
        <div className={`${card} text-sm text-[var(--text-dim)]`}>No problems match filters.</div>
      ) : (
        byTier.map(({ tier, rows }) => (
          <div key={tier} className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <span
                className="inline-flex h-5 w-5 items-center justify-center rounded font-mono text-[11px] font-bold"
                style={{
                  color: tierColor[tier],
                  border: `1px solid ${tierColor[tier]}`,
                  background: "var(--surface-2)",
                }}
              >
                {tier}
              </span>
              <span className="text-sm font-semibold">
                Tier {tier} · {rows.length}
              </span>
            </div>
            {rows.map((p) => (
              <div
                key={p.id}
                className={`${card} flex flex-wrap items-center justify-between gap-3 py-3`}
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
                      <span className="text-xs text-[var(--cyan)]">core</span>
                    ) : null}
                  </div>
                  <div className="text-xs text-[var(--text-dim)]">
                    {p.pattern}
                    {p.roleTrack ? ` · ${p.roleTrack}` : ""}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {STATUSES.map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatus(p.id, st)}
                      className={`rounded-lg border px-2 py-1 text-[11px] capitalize ${
                        p.status === st ? statusStyle[st] : "border-transparent text-[var(--text-dim)]"
                      }`}
                    >
                      {st === "not-started" ? "new" : st}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}

"use client";

/**
 * Problem Bank (Tier A–D)
 *
 * Searchable, filterable list with live status updates.
 * Statuses: "not-started" | "practicing" | "solid"
 * All changes go through the shared Zustand store.
 */

import { useSprintStore } from "@/lib/store";
import { useState } from "react";
import type { ProblemStatus, Tier } from "@/lib/types";

export function ProblemBank() {
  const { problems, updateProblemStatus } = useSprintStore();
  const [filter, setFilter] = useState<"all" | Tier>("all");
  const [q, setQ] = useState("");

  const filtered = problems.filter(p => {
    const match = !q || p.title.toLowerCase().includes(q.toLowerCase()) || p.pattern.toLowerCase().includes(q.toLowerCase());
    const tierOk = filter === "all" || p.tier === filter;
    return match && tierOk;
  });

  return (
    <div>
      <div className="flex gap-2 mb-3">
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search title or pattern..."
          className="flex-1 rounded-xl bg-[#11141a] border border-white/10 px-3 py-2 text-sm placeholder:text-[var(--text-dim)]"
        />
        <select value={filter} onChange={e => setFilter(e.target.value as any)} className="bg-[#11141a] border border-white/10 rounded-xl px-3 text-sm">
          <option value="all">All tiers</option>
          <option value="A">Tier A</option>
          <option value="B">Tier B</option>
          <option value="C">Tier C</option>
          <option value="D">Tier D</option>
        </select>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 && <div className="text-xs text-[var(--text-dim)]">No matches.</div>}
        {filtered.map(p => (
          <div key={p.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#161a22] p-3 text-sm">
            <div className="w-7 text-center font-mono text-[10px] opacity-60">{p.tier}</div>
            <div className="flex-1">
              <div className="font-medium">{p.title}</div>
              <div className="text-xs text-[var(--text-mid)]">{p.pattern}</div>
            </div>

            <div className="flex gap-1">
              {(["not-started", "practicing", "solid"] as ProblemStatus[]).map((s) => (
                <button
                  key={s}
                  onClick={() => updateProblemStatus(p.id, s)}
                  className={`px-2 py-0.5 rounded text-[10px] border ${p.status === s ? "border-[var(--cyan)] text-[var(--cyan)]" : "border-white/10 text-[var(--text-dim)]"}`}
                >
                  {s === "not-started" ? "NS" : s === "practicing" ? "PR" : "SOLID"}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="text-[10px] text-[var(--text-dim)] mt-4">Status syncs instantly to localStorage. LeetCode enrichment (slug → title) is planned as optional v1+.</div>
    </div>
  );
}

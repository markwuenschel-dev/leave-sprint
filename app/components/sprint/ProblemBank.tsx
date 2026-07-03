"use client";

import { useSprintStore } from "@/lib/store";
import { useState } from "react";
import type { ProblemStatus, Tier } from "@/lib/types";
import { Check, Search } from "lucide-react";

export function ProblemBank() {
  const { problems, updateProblemStatus } = useSprintStore();
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<"all" | Tier>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | ProblemStatus>("all");

  const filtered = problems.filter((p) => {
    const matchesSearch =
      !search ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.pattern.toLowerCase().includes(search.toLowerCase());

    const matchesTier = tierFilter === "all" || p.tier === tierFilter;
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;

    return matchesSearch && matchesTier && matchesStatus;
  });

  const statusColors: Record<ProblemStatus, string> = {
    "not-started": "border-white/20 text-[var(--text-dim)]",
    practicing: "border-[var(--cyan)] text-[var(--cyan)] bg-[var(--cyan)]/10",
    solid: "border-[var(--done)] text-[var(--done)] bg-[var(--done)]/10",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="section-title">PROBLEM BANK</div>
          <div className="text-sm text-[var(--text-mid)]">
            {filtered.length} problems • Track your progress
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-4 top-3.5 h-4 w-4 text-[var(--text-dim)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search problems or patterns..."
            className="w-full rounded-2xl border border-white/10 bg-[#11141a] pl-11 py-3 text-sm placeholder:text-[var(--text-dim)] focus:outline-none focus:border-[var(--cyan)]/50"
          />
        </div>

        <select
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value as any)}
          className="rounded-2xl border border-white/10 bg-[#11141a] px-4 text-sm"
        >
          <option value="all">All Tiers</option>
          <option value="A">Tier A</option>
          <option value="B">Tier B</option>
          <option value="C">Tier C</option>
          <option value="D">Tier D</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="rounded-2xl border border-white/10 bg-[#11141a] px-4 text-sm"
        >
          <option value="all">All Status</option>
          <option value="not-started">Not Started</option>
          <option value="practicing">Practicing</option>
          <option value="solid">Solid</option>
        </select>
      </div>

      {/* Problem List */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="text-center py-8 text-[var(--text-dim)]">
            No problems match your filters.
          </div>
        )}

        {filtered.map((problem) => {
          const isSolid = problem.status === "solid";

          return (
            <div
              key={problem.id}
              className="group flex items-center justify-between gap-4 rounded-3xl border border-white/10 bg-[#161a22] p-5 hover:border-white/20 transition-all"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <div className="font-mono text-xs px-2.5 py-0.5 rounded bg-white/5 text-[var(--text-dim)] border border-white/10">
                    {problem.tier}
                  </div>
                  <div className="font-semibold text-[15px] tracking-tight">
                    {problem.title}
                  </div>
                </div>
                <div className="text-sm text-[var(--text-mid)] mt-1 pl-1">
                  {problem.pattern}
                </div>
              </div>

              {/* Status + Actions */}
              <div className="flex items-center gap-2">
                <div
                  className={`px-3 py-1 rounded-2xl text-xs font-medium border ${statusColors[problem.status]}`}
                >
                  {problem.status === "not-started" && "Not Started"}
                  {problem.status === "practicing" && "Practicing"}
                  {problem.status === "solid" && "Solid"}
                </div>

                <div className="flex gap-1.5">
                  {(["not-started", "practicing", "solid"] as ProblemStatus[]).map((status) => (
                    <button
                      key={status}
                      onClick={() => updateProblemStatus(problem.id, status)}
                      className={`px-3 py-1.5 rounded-2xl text-xs border transition-all ${
                        problem.status === status
                          ? "border-[var(--cyan)] text-[var(--cyan)]"
                          : "border-white/10 text-[var(--text-dim)] hover:border-white/30"
                      }`}
                    >
                      {status === "not-started" ? "NS" : status === "practicing" ? "PR" : "SOLID"}
                    </button>
                  ))}
                </div>

                {isSolid && (
                  <Check className="h-4 w-4 text-[var(--done)] ml-1" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 text-[10px] text-[var(--text-dim)]">
        Status updates save automatically to localStorage. LeetCode enrichment coming in a future pass.
      </div>
    </div>
  );
}
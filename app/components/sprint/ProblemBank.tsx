"use client";

import { useSprintStore } from "@/lib/store";
import { useState, useMemo } from "react";
import type { ProblemStatus, Tier } from "@/lib/types";
import { Check, Search } from "lucide-react";

function semanticScore(query: string, text: string): number {
  if (!query || !text) return 0;

  const q = query.toLowerCase().trim();
  const t = text.toLowerCase();

  if (t.includes(q)) return 1.0;

  const qWords = q.split(/\s+/).filter(Boolean);
  const tWords = t.split(/\s+/).filter(Boolean);

  let score = 0;

  qWords.forEach(qw => {
    // Check for direct or partial matches
    const hasDirectMatch = tWords.some(tw => tw.includes(qw) || qw.includes(tw));
    if (hasDirectMatch) {
      score += 0.6;
    }

    // Check for close matches (simple fuzzy)
    const hasCloseMatch = tWords.some(tw => {
      const lenDiff = Math.abs(qw.length - tw.length);
      return lenDiff <= 2 && (qw.includes(tw) || tw.includes(qw));
    });
    if (hasCloseMatch) {
      score += 0.3;
    }
  });

  return Math.min(1, score / Math.max(1, qWords.length));
}

export function ProblemBank() {
  const { problems, updateProblemStatus } = useSprintStore();
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<"all" | Tier>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | ProblemStatus>("all");

  const filtered = useMemo(() => {
    if (!search.trim()) {
      return problems.filter((p) => {
        const matchesTier = tierFilter === "all" || p.tier === tierFilter;
        const matchesStatus = statusFilter === "all" || p.status === statusFilter;
        return matchesTier && matchesStatus;
      });
    }

    return problems
      .map(p => {
        const titleScore = semanticScore(search, p.title);
        const patternScore = semanticScore(search, p.pattern);
        const combinedScore = (titleScore * 0.6) + (patternScore * 0.4);
        return { ...p, _score: combinedScore };
      })
      .filter(p => {
        const matchesTier = tierFilter === "all" || p.tier === tierFilter;
        const matchesStatus = statusFilter === "all" || p.status === statusFilter;
        return (p as any)._score > 0.15 && matchesTier && matchesStatus;
      })
      .sort((a, b) => ((b as any)._score || 0) - ((a as any)._score || 0));
  }, [problems, search, tierFilter, statusFilter]);

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
            {filtered.length} problems • Semantic + keyword search
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-4 top-3.5 h-4 w-4 text-[var(--text-dim)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Semantic search (patterns, titles, concepts)..."
            className="w-full rounded-2xl border border-white/10 bg-[#11141a] pl-11 py-3 text-sm placeholder:text-[var(--text-dim)] focus:outline-none focus:border-[var(--cyan)]/50"
          />
        </div>

        <select value={tierFilter} onChange={(e) => setTierFilter(e.target.value as any)} className="rounded-2xl border border-white/10 bg-[#11141a] px-4 text-sm">
          <option value="all">All Tiers</option>
          <option value="A">Tier A</option>
          <option value="B">Tier B</option>
          <option value="C">Tier C</option>
          <option value="D">Tier D</option>
        </select>

        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="rounded-2xl border border-white/10 bg-[#11141a] px-4 text-sm">
          <option value="all">All Status</option>
          <option value="not-started">Not Started</option>
          <option value="practicing">Practicing</option>
          <option value="solid">Solid</option>
        </select>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="text-center py-8 text-[var(--text-dim)]">
            No problems match your search/filters.
          </div>
        )}

        {filtered.map((problem) => {
          const isSolid = problem.status === "solid";
          const score = (problem as any)._score;

          return (
            <div key={problem.id} className="group flex items-center justify-between gap-4 rounded-3xl border border-white/10 bg-[#161a22] p-5 hover:border-white/20 transition-all">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <div className="font-mono text-xs px-2.5 py-0.5 rounded bg-white/5 text-[var(--text-dim)] border border-white/10">
                    {problem.tier}
                  </div>
                  <div className="font-semibold text-[15px] tracking-tight">
                    {problem.title}
                  </div>
                  {score && score > 0.3 && (
                    <div className="text-[10px] text-[var(--cyan)] font-mono">match {(score * 100).toFixed(0)}%</div>
                  )}
                </div>
                <div className="text-sm text-[var(--text-mid)] mt-1 pl-1">
                  {problem.pattern}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className={`px-3 py-1 rounded-2xl text-xs font-medium border ${statusColors[problem.status]}`}>
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
                        problem.status === status ? "border-[var(--cyan)] text-[var(--cyan)]" : "border-white/10 text-[var(--text-dim)] hover:border-white/30"
                      }`}
                    >
                      {status === "not-started" ? "NS" : status === "practicing" ? "PR" : "SOLID"}
                    </button>
                  ))}
                </div>

                {isSolid && <Check className="h-4 w-4 text-[var(--done)] ml-1" />}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 text-[10px] text-[var(--text-dim)]">
        Semantic search boosts matches in patterns/concepts.
      </div>
    </div>
  );
}
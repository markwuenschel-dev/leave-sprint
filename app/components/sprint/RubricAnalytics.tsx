"use client";

import { useMemo } from "react";
import { useSprintStore } from "@/lib/store";
import { RD } from "@/lib/rubric/referenceData";
import { avgSubPct, taskLabel } from "@/lib/rubric/scoring";
import { countPromoEvidence, nextRecommended, evidenceBurndown, requiredSlots } from "@/lib/rubric/promotion";
import { clusterForTag } from "@/lib/rubric/clusters";
import type { LevelId, RubricEntry } from "@/lib/rubric/types";
import { getDateForDay } from "@/lib/types";
import { StatTile } from "@/app/components/ui/StatTile";
import { Radar } from "@/app/components/ui/Radar";
import { Sparkline } from "@/app/components/ui/Sparkline";
import { Burndown, type BurndownSeries } from "@/app/components/ui/Burndown";
import { Sparkles, Target } from "lucide-react";

function median(nums: number[]): number {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

export function RubricAnalytics() {
  const rubricEntries = useSprintStore((s) => s.rubricEntries);

  const asc = useMemo(() => [...rubricEntries].sort((a, b) => (a.date < b.date ? -1 : 1)), [rubricEntries]);

  const stats = useMemo(() => {
    const n = asc.length;
    const scores = asc.map((e) => e.finalScore);
    const passes = asc.filter((e) => e.finalScore >= 70).length;
    const assistFree = asc.filter((e) => e.assistanceLevel <= 1).length;
    const last5 = scores.slice(-5);
    const rolling = last5.length ? Math.round(last5.reduce((a, b) => a + b, 0) / last5.length) : 0;
    return { n, passes, passRate: n ? Math.round((passes / n) * 100) : 0, assistFree, rolling, median: median(scores) };
  }, [asc]);

  const recLive = useMemo(() => nextRecommended(rubricEntries), [rubricEntries]);

  const avgRadar = useMemo(() => avgSubPct(asc), [asc]);

  const byTaskType = useMemo(() => {
    return RD.taskTypes
      .map((t) => ({ ...t, scores: asc.filter((e) => e.taskType === t.id).map((e) => e.finalScore) }))
      .filter((t) => t.scores.length > 0);
  }, [asc]);

  const weakness = useMemo(() => {
    const counts = new Map<string, number>();
    asc.forEach((e) => e.weaknessTags.forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1)));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
  }, [asc]);

  const clusters = useMemo(() => {
    const counts = new Map<string, number>();
    asc.forEach((e) => e.knowledgeGapTags.forEach((t) => counts.set(clusterForTag(t), (counts.get(clusterForTag(t)) ?? 0) + 1)));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [asc]);

  if (!rubricEntries.length) {
    return (
      <div className="card-glass p-10 text-center">
        <Sparkles className="mx-auto mb-3 text-[var(--text-dim)]" />
        <div className="text-lg font-medium">No competency evidence yet</div>
        <div className="text-sm text-[var(--text-mid)] mt-1">Log assessments in the Rubric tab or master Q-Bank questions — this dashboard fills in as you go.</div>
      </div>
    );
  }

  const xLabels = Array.from({ length: 29 }, (_, i) => (i % 7 === 0 || i === 28 ? `${i + 1}` : ""));

  return (
    <div className="space-y-8">
      {/* Stat grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatTile label="Attempts" value={stats.n} />
        <StatTile label="Passes ≥70" value={stats.passes} accent="var(--done)" />
        <StatTile label="Pass rate" value={`${stats.passRate}%`} accent="var(--cyan)" />
        <StatTile label="Assist-free" value={stats.assistFree} sub="A≤1" />
        <StatTile label="Rolling avg" value={stats.rolling} sub="last 5" accent="var(--cyan)" />
        <StatTile label="Median" value={stats.median} />
      </div>

      {/* Next recommended */}
      <div className="card-glass p-6">
        <div className="flex items-center gap-2 section-title !mb-3">
          <Target size={14} /> NEXT RECOMMENDED ACTION
        </div>
        {recLive.done ? (
          <div className="text-lg font-medium text-[var(--done)]">{recLive.text}</div>
        ) : (
          <div className="flex items-start gap-4">
            <div className="text-xs font-mono px-2.5 py-1 rounded bg-[var(--cyan)]/10 text-[var(--cyan)] border border-[var(--cyan)]/30 shrink-0 mt-0.5">{recLive.detail?.lvl}</div>
            <div>
              <div className="text-lg font-medium">{recLive.detail?.action}</div>
              <div className="text-sm text-[var(--text-mid)] mt-0.5">{recLive.detail?.reason}</div>
              <div className="text-xs text-[var(--text-dim)] mt-1 font-mono">
                pace: {recLive.detail?.pace} · {recLive.detail?.daysLeft} days left
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Promotion evidence progress */}
      <div>
        <div className="section-title">PROMOTION EVIDENCE PROGRESS</div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {(["L1", "L2", "L3"] as LevelId[]).map((lvl) => (
            <PromoCard key={lvl} lvl={lvl} entries={rubricEntries} />
          ))}
        </div>
      </div>

      {/* Evidence burndown */}
      <div className="card-glass p-6">
        <div className="section-title">L1 + L2 EVIDENCE BURNDOWN</div>
        <Burndown
          maxY={Math.max(requiredSlots("L1"), requiredSlots("L2"))}
          todayIndex={Math.min(28, Math.max(0, Math.round((Date.now() - getDateForDay(1).getTime()) / 86400000)))}
          xLabels={xLabels}
          series={[
            idealSeries("L1", "var(--cyan)"),
            { points: evidenceBurndown(rubricEntries, "L1"), color: "var(--cyan)" },
            idealSeries("L2", "var(--magenta)"),
            { points: evidenceBurndown(rubricEntries, "L2"), color: "var(--magenta)" },
          ]}
        />
        <div className="flex gap-4 text-xs text-[var(--text-dim)] mt-2">
          <Legend color="var(--cyan)" label="L1 remaining" />
          <Legend color="var(--magenta)" label="L2 remaining" />
          <span>dashed = ideal pace</span>
        </div>
      </div>

      {/* Competency radar + task-type trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-glass p-6">
          <div className="section-title">AVERAGE COMPETENCY PROFILE</div>
          {avgRadar ? (
            <div className="flex justify-center">
              <Radar labels={RD.universalDims.map((d) => d.short)} values={avgRadar} size={260} />
            </div>
          ) : (
            <div className="text-sm text-[var(--text-dim)]">No sub-scored assessments yet (radar fills from full rubric logs).</div>
          )}
        </div>

        <div className="card-glass p-6">
          <div className="section-title">SCORE TREND BY TASK TYPE</div>
          <div className="space-y-2.5">
            {byTaskType.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3">
                <div className="text-sm text-[var(--text-mid)] w-40 truncate">{t.label}</div>
                <Sparkline values={t.scores} color={t.color} />
                <div className="font-mono text-sm w-8 text-right">{t.scores[t.scores.length - 1]}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Weakness tags + KG clusters */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {weakness.length > 0 && (
          <div className="card-glass p-6">
            <div className="section-title">RECURRING WEAKNESS TAGS</div>
            <div className="space-y-2">
              {weakness.map(([tag, count]) => (
                <div key={tag} className="flex items-center gap-3">
                  <div className="text-sm text-[var(--text-mid)] flex-1">{tag}</div>
                  <div className="h-2 rounded-full bg-[var(--orange)]" style={{ width: `${count * 14}px`, maxWidth: "160px" }} />
                  <div className="font-mono text-xs w-6 text-right">{count}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {clusters.length > 0 && (
          <div className="card-glass p-6">
            <div className="section-title">KNOWLEDGE-GAP CLUSTERS</div>
            <div className="flex flex-wrap gap-2">
              {clusters.map(([name, count]) => (
                <div key={name} className="px-3 py-1.5 rounded-2xl bg-[var(--fill-subtle)] border border-[var(--hairline)] text-sm flex items-center gap-2">
                  {name}
                  <span className="font-mono text-xs text-[var(--magenta)]">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function idealSeries(lvl: LevelId, color: string): BurndownSeries {
  const total = requiredSlots(lvl);
  const points = Array.from({ length: 29 }, (_, i) => Math.max(0, Math.round(total - (total * i) / 28)));
  return { points, color, dashed: true };
}

function PromoCard({ lvl, entries }: { lvl: LevelId; entries: RubricEntry[] }) {
  const reqs = countPromoEvidence(entries, lvl);
  const metCount = reqs.filter((r) => r.met).length;
  return (
    <div className="rounded-3xl border border-[var(--hairline)] bg-[var(--surface)] p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="font-semibold text-lg">{lvl}</div>
        <div className={`text-xs font-mono px-2 py-0.5 rounded-full border ${metCount === reqs.length ? "border-[var(--done)] text-[var(--done)]" : "border-[var(--hairline)] text-[var(--text-dim)]"}`}>
          {metCount}/{reqs.length} met
        </div>
      </div>
      <div className="space-y-2">
        {reqs.map((r) => (
          <div key={r.type}>
            <div className="flex items-center justify-between text-sm">
              <span className={r.met ? "text-[var(--done)]" : "text-[var(--text-mid)]"}>
                {taskLabel(r.type)}
                {r.maxAssist !== undefined ? ` · A≤${r.maxAssist}` : ""}
                {r.minDiff !== undefined ? ` · D≥${r.minDiff}` : ""}
              </span>
              <span className="font-mono text-xs">
                {r.count}/{r.min}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-[var(--fill-subtle)] overflow-hidden mt-1">
              <div className={`h-full rounded-full ${r.met ? "bg-[var(--done)]" : "bg-[var(--cyan)]"}`} style={{ width: `${Math.min(100, (r.count / r.min) * 100)}%` }} />
            </div>
            {r.reasons.length > 0 && <div className="text-[10px] text-[var(--text-dim)] mt-0.5">{r.reasons.join(" · ")}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="inline-block w-3 h-0.5" style={{ background: color }} /> {label}
    </span>
  );
}

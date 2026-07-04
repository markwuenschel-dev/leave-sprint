"use client";

import { useMemo } from "react";
import { useSprintStore, getDayCompletion, getDaysFullyDone } from "@/lib/store";
import {
  currentSprintDay, clampedSprintDay, stageCumulativeByDay, idealStageLine, stagePaceStats,
  fullDaysCumulativeByDay, disciplineRates, rhythmIntensity, problemStatusCounts,
  weeklyBuckets, cumulativeQualifying,
} from "@/lib/velocity";
import { countPromoEvidence } from "@/lib/rubric/promotion";
import { trust } from "@/lib/rubric/dashboards";
import { STAGES, TOTAL_STAGES, PHASE_ORDER } from "@/data/stages";
import { MILESTONES } from "@/data/day-plans";
import { SPRINT_DAYS, formatDayDate } from "@/lib/types";
import type { LevelId, ProblemStatus } from "@/lib/types";
import { Burndown } from "@/app/components/ui/Burndown";
import { Sparkline } from "@/app/components/ui/Sparkline";
import { StatTile } from "@/app/components/ui/StatTile";
import { ProgressRing } from "@/app/components/ui/ProgressRing";
import { Heatmap } from "@/app/components/ui/Heatmap";

const xLabels = Array.from({ length: SPRINT_DAYS }, (_, i) => (i % 7 === 0 || i === SPRINT_DAYS - 1 ? `${i + 1}` : ""));

export function VelocityDashboard() {
  const { days, stages, problems, rubricEntries } = useSprintStore();

  const day = currentSprintDay();
  const dayClamped = clampedSprintDay();
  const daysLeft = Math.max(0, SPRINT_DAYS - dayClamped);
  const pastSprint = day > SPRINT_DAYS;

  const pace = useMemo(() => stagePaceStats(stages, TOTAL_STAGES), [stages]);
  const stageCum = useMemo(() => stageCumulativeByDay(stages), [stages]);
  const ideal = useMemo(() => idealStageLine(TOTAL_STAGES), []);
  const fullDaysCum = useMemo(() => fullDaysCumulativeByDay(days), [days]);
  const discRates = useMemo(() => disciplineRates(days), [days]);
  const heat = useMemo(() => rhythmIntensity(days).map((c) => ({ ...c, title: `Day ${c.day} · ${Math.round(c.value * 100)}%` })), [days]);
  const problemSnap = useMemo(() => problemStatusCounts(problems), [problems]);
  const weeks = useMemo(() => weeklyBuckets(rubricEntries), [rubricEntries]);
  const cumQual = useMemo(() => cumulativeQualifying(weeks), [weeks]);
  const logging = useMemo(() => trust(rubricEntries).logging, [rubricEntries]);
  const stagesDone = useMemo(() => Object.values(stages).filter((s) => s.done).length, [stages]);
  const allStagesDone = stagesDone >= TOTAL_STAGES;

  const fullDays = getDaysFullyDone(days);
  const overall = Math.round((fullDays / SPRINT_DAYS) * 100);
  const streak = useMemo(() => {
    let s = 0;
    for (let d = dayClamped; d >= 1; d--) {
      if (getDayCompletion(days[d]) === 100) s++;
      else break;
    }
    return s;
  }, [days, dayClamped]);

  const milestoneMarkers = MILESTONES.map((m) => ({ index: m.day - 1, label: m.short, color: "var(--yellow)" }));
  const cleanFullDays = fullDaysCum.map((v) => v ?? 0).slice(0, dayClamped);

  return (
    <div className="space-y-8">
      {/* Stat header */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile label="Stages done" value={`${stagesDone}/${TOTAL_STAGES}`} accent={allStagesDone ? "var(--done)" : "var(--cyan)"} />
        <StatTile label="Full days" value={`${fullDays}`} sub={`/ ${SPRINT_DAYS} · ${overall}%`} />
        <StatTile label="Streak" value={<span>{streak}<span className="text-base"> 🔥</span></span>} accent="var(--orange)" />
        <StatTile label={pastSprint ? "Sprint" : "Day"} value={pastSprint ? "complete" : `${dayClamped}`} sub={pastSprint ? `day ${day}` : `of ${SPRINT_DAYS} · ${daysLeft} left`} />
        <StatTile label="Stage velocity" value={pace.velocity} sub="in-sprint /day" accent="var(--cyan)" />
        <StatTile label="Projected finish" value={allStagesDone ? "complete" : pace.projectedFinishDay ? `Day ${pace.projectedFinishDay}` : "—"} accent={allStagesDone ? "var(--done)" : pace.projectedFinishDay && pace.projectedFinishDay > SPRINT_DAYS ? "var(--orange)" : "var(--text)"} />
        <StatTile label="Assessments" value={rubricEntries.length} sub={`${logging.fastPct}% fast`} />
        <StatTile label="Problems solid" value={`${problemSnap.pctSolid}%`} sub={`${problemSnap.byStatus.solid}/${problemSnap.total}`} accent="var(--done)" />
      </div>

      {/* Stage pace */}
      <div className="card-glass p-6">
        <div className="flex items-center justify-between">
          <div className="section-title">STAGE COMPLETION PACE</div>
          <div className="text-xs text-[var(--text-dim)] font-mono">
            {pace.completed} in-sprint · {pace.onTrackDelta >= 0 ? "+" : ""}{pace.onTrackDelta} vs ideal
          </div>
        </div>
        <Burndown
          maxY={TOTAL_STAGES}
          todayIndex={dayClamped - 1}
          xLabels={xLabels}
          markers={milestoneMarkers}
          series={[
            { points: ideal, color: "var(--text-dim)", dashed: true },
            { points: stageCum, color: "var(--cyan)" },
          ]}
        />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mt-4">
          {PHASE_ORDER.map((phase) => {
            const ps = STAGES.filter((s) => s.phase === phase);
            if (!ps.length) return null;
            const done = ps.filter((s) => stages[s.id]?.done).length;
            return <StatTile key={phase} label={phase} value={`${done}/${ps.length}`} accent={done === ps.length ? "var(--done)" : "var(--text)"} />;
          })}
        </div>
        <div className="flex gap-4 text-xs text-[var(--text-dim)] mt-2">
          <Legend color="var(--cyan)" label="actual" /> <Legend color="var(--text-dim)" label="ideal (dashed)" /> <span>◆ milestones</span>
        </div>
      </div>

      {/* Daily rhythm */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-glass p-6">
          <div className="section-title">DAILY RHYTHM</div>
          <div className="flex items-center gap-4 mb-4">
            <Sparkline values={cleanFullDays} width={160} height={44} color="var(--cyan)" min={0} max={Math.max(1, SPRINT_DAYS)} />
            <div className="text-sm text-[var(--text-mid)]">cumulative full days</div>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {discRates.map((d) => (
              <div key={d.key} className="flex flex-col items-center gap-1">
                <ProgressRing value={d.pct} size={54} stroke={5} color="var(--cyan)">
                  <span className="text-[10px] font-mono">{d.pct}%</span>
                </ProgressRing>
                <span className="text-xs text-[var(--text-dim)]">{d.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card-glass p-6">
          <div className="section-title">RHYTHM HEATMAP</div>
          <Heatmap cells={heat} columns={7} accent="var(--green)" />
        </div>
      </div>

      {/* Problem bank (snapshot) */}
      <div className="card-glass p-6">
        <div className="flex items-center justify-between mb-3">
          <div className="section-title !mb-0">PROBLEM BANK</div>
          <span className="text-[10px] text-[var(--text-dim)]">snapshot — problems aren&apos;t timestamped</span>
        </div>
        <div className="flex items-center gap-6">
          <ProgressRing value={problemSnap.pctSolid} size={72} color="var(--done)">
            <span className="text-xs font-mono">{problemSnap.pctSolid}%</span>
          </ProgressRing>
          <div className="flex-1">
            <div className="flex h-3 rounded-full overflow-hidden bg-[var(--fill-subtle)]">
              {(["solid", "practicing", "not-started"] as ProblemStatus[]).map((s) => {
                const n = problemSnap.byStatus[s];
                const c = s === "solid" ? "var(--done)" : s === "practicing" ? "var(--cyan)" : "var(--border)";
                return n ? <div key={s} style={{ width: `${(n / problemSnap.total) * 100}%`, background: c }} /> : null;
              })}
            </div>
            <div className="flex gap-4 text-xs text-[var(--text-mid)] mt-2">
              <span><span className="text-[var(--done)]">●</span> {problemSnap.byStatus.solid} solid</span>
              <span><span className="text-[var(--cyan)]">●</span> {problemSnap.byStatus.practicing} practicing</span>
              <span><span className="text-[var(--text-dim)]">●</span> {problemSnap.byStatus["not-started"]} not started</span>
            </div>
          </div>
        </div>
      </div>

      {/* Competency velocity (calendar weeks) */}
      <div className="card-glass p-6">
        <div className="flex items-center justify-between mb-3">
          <div className="section-title !mb-0">COMPETENCY VELOCITY</div>
          <span className="text-[10px] text-[var(--text-dim)]">calendar weeks (rolling)</span>
        </div>
        {weeks.length === 0 ? (
          <div className="text-sm text-[var(--text-dim)] py-6 text-center">No assessments logged yet — throughput and qualifying accrual appear here as you grade records.</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
              <div className="flex items-center gap-4">
                <Sparkline values={weeks.map((w) => w.count)} width={160} height={44} color="var(--magenta)" min={0} max={Math.max(...weeks.map((w) => w.count), 1)} />
                <div className="text-sm text-[var(--text-mid)]">assessments / week</div>
              </div>
              <div className="flex items-center gap-4">
                <Sparkline values={cumQual} width={160} height={44} color="var(--cyan)" min={0} max={Math.max(...cumQual, 1)} />
                <div className="text-sm text-[var(--text-mid)]">cumulative qualifying evidence</div>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {(["L1", "L2", "L3"] as LevelId[]).map((lvl) => {
                const reqs = countPromoEvidence(rubricEntries, lvl);
                const met = reqs.filter((r) => r.met).length;
                return (
                  <div key={lvl} className="rounded-2xl border border-[var(--hairline)] bg-[var(--surface)] p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold">{lvl}</span>
                      <span className="text-xs font-mono text-[var(--text-dim)]">{met}/{reqs.length} met</span>
                    </div>
                    <div className="space-y-1.5">
                      {reqs.map((r) => (
                        <div key={r.type} className="flex items-center gap-2 text-xs">
                          <span className={`flex-1 ${r.met ? "text-[var(--done)]" : "text-[var(--text-mid)]"}`}>{r.type}</span>
                          <span className="font-mono">{r.count}/{r.min}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
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

"use client";

import { useMemo, useState } from "react";
import { useSprintStore } from "@/lib/store";
import { levelTrends, roleReadiness, retestSchedule, gapBoard, trust } from "@/lib/rubric/dashboards";
import { RubricAnalytics } from "../RubricAnalytics";
import { Sparkline } from "@/app/components/ui/Sparkline";
import { StatTile } from "@/app/components/ui/StatTile";
import { ProgressRing } from "@/app/components/ui/ProgressRing";
import { LayoutDashboard, TrendingUp, Users, CalendarClock, ClipboardList } from "lucide-react";

type Sub = "overview" | "levels" | "roles" | "retest" | "gaps";
const SUBTABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "levels", label: "Levels & Gates", icon: TrendingUp },
  { id: "roles", label: "Role Readiness", icon: Users },
  { id: "retest", label: "Retest Queue", icon: CalendarClock },
  { id: "gaps", label: "Gap Board", icon: ClipboardList },
] as const;

export function CompetencyDashboards() {
  const [sub, setSub] = useState<Sub>("overview");
  const entries = useSprintStore((s) => s.rubricEntries);

  return (
    <div className="space-y-6">
      <div className="flex gap-1 bg-[var(--bg-elev)] rounded-2xl p-1 border border-[var(--hairline)] overflow-x-auto">
        {SUBTABS.map((t) => {
          const Icon = t.icon;
          const active = sub === t.id;
          return (
            <button key={t.id} onClick={() => setSub(t.id)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${active ? "bg-[var(--fill-subtle)] text-[var(--text)]" : "text-[var(--text-dim)] hover:text-[var(--text)]"}`}>
              <Icon size={15} /> {t.label}
            </button>
          );
        })}
      </div>

      {sub === "overview" && <RubricAnalytics />}
      {sub === "levels" && <LevelsDashboard entries={entries} />}
      {sub === "roles" && <RolesDashboard entries={entries} />}
      {sub === "retest" && <RetestDashboard entries={entries} />}
      {sub === "gaps" && <GapsDashboard entries={entries} />}
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return <div className="card-glass p-10 text-center text-[var(--text-dim)] text-sm">{msg}</div>;
}

function LevelsDashboard({ entries }: { entries: ReturnType<typeof useSprintStore.getState>["rubricEntries"] }) {
  const t = useMemo(() => levelTrends(entries), [entries]);
  if (!entries.length) return <Empty msg="No assessments yet — level trends fill in as you log graded records." />;

  return (
    <div className="space-y-6">
      <div>
        <div className="section-title">QUALIFYING DEMONSTRATED LEVEL</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {t.qualifyingDistribution.map((d) => (
            <StatTile key={d.level} label={d.level === "None" ? "Not yet qualifying" : `Qualifying ${d.level}`} value={d.count} accent={d.level === "None" ? "var(--text-dim)" : "var(--cyan)"} />
          ))}
        </div>
      </div>

      <div className="card-glass p-6">
        <div className="section-title">LEVEL SCORE TRENDS BY TASK TYPE</div>
        <div className="space-y-3">
          {t.byTaskType.map((tt) => (
            <div key={tt.taskType} className="flex items-center gap-4 flex-wrap">
              <div className="w-40 text-sm text-[var(--text-mid)] truncate">{tt.label}</div>
              {(["L1", "L2", "L3"] as const).map((k) => (
                <div key={k} className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono text-[var(--text-dim)]">{k}</span>
                  <Sparkline values={tt[k]} width={90} height={28} color={k === "L1" ? "var(--cyan)" : k === "L2" ? "var(--magenta)" : "var(--violet)"} />
                </div>
              ))}
              <span className="text-xs text-[var(--text-dim)]">{tt.count} attempts</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card-glass p-6">
        <div className="section-title">GATE PASS RATES</div>
        <div className="space-y-2">
          {t.gatePassRates.map((g) => (
            <div key={g.gate} className="flex items-center gap-3">
              <div className="w-44 text-sm text-[var(--text-mid)]">{g.gate}</div>
              <div className="flex-1 h-2.5 rounded-full bg-[var(--fill-subtle)] overflow-hidden flex">
                <div className="h-full bg-[var(--done)]" style={{ width: `${g.total ? (g.pass / g.total) * 100 : 0}%` }} />
                <div className="h-full bg-[var(--yellow)]" style={{ width: `${g.total ? (g.partial / g.total) * 100 : 0}%` }} />
                <div className="h-full bg-[var(--orange)]" style={{ width: `${g.total ? (g.fail / g.total) * 100 : 0}%` }} />
              </div>
              <div className="w-16 text-right font-mono text-xs">{g.rate}%<span className="text-[var(--text-dim)]"> pass</span></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RolesDashboard({ entries }: { entries: ReturnType<typeof useSprintStore.getState>["rubricEntries"] }) {
  const roles = useMemo(() => roleReadiness(entries), [entries]);
  if (!roles.length) return <Empty msg="No role-readiness evidence yet — add roleReadinessRollup / roleRequirementCoverage to records (or import them)." />;

  const readinessColor = (r: string) =>
    r === "Strong fit" || r === "Interviewable" ? "var(--done)" : r === "Interviewable with risk" || r === "Emerging" ? "var(--yellow)" : "var(--orange)";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {roles.map((r) => (
        <div key={r.targetRole} className="card-glass p-5">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="font-semibold">{r.targetRole}</div>
            <span className="text-xs px-2.5 py-1 rounded-full border" style={{ borderColor: readinessColor(r.readiness), color: readinessColor(r.readiness) }}>{r.readiness}</span>
          </div>
          <div className="flex items-center gap-4 mb-3">
            {r.coverageScore !== null && (
              <ProgressRing value={r.coverageScore * 100} size={52} stroke={5} color="var(--cyan)">
                <span className="text-[10px] font-mono">{Math.round(r.coverageScore * 100)}%</span>
              </ProgressRing>
            )}
            <div className="text-xs text-[var(--text-mid)] space-y-0.5">
              <div>{r.blockingGaps} blocking gap{r.blockingGaps === 1 ? "" : "s"}</div>
              {r.evidenceFloorMet !== null && <div className={r.evidenceFloorMet ? "text-[var(--done)]" : "text-[var(--orange)]"}>Evidence floor {r.evidenceFloorMet ? "met" : "not met"}</div>}
            </div>
          </div>
          {r.hit.length + r.partial.length + r.missing.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {r.hit.map((x) => <span key={x} className="text-[10px] px-2 py-0.5 rounded border border-[var(--done)] text-[var(--done)]">{x}</span>)}
              {r.partial.map((x) => <span key={x} className="text-[10px] px-2 py-0.5 rounded border border-[var(--yellow)] text-[var(--yellow)]">{x}</span>)}
              {r.missing.map((x) => <span key={x} className="text-[10px] px-2 py-0.5 rounded border border-[var(--hairline)] text-[var(--text-dim)]">{x}</span>)}
            </div>
          )}
          {r.nextMilestone && <div className="text-xs text-[var(--text-mid)]"><span className="text-[var(--text-dim)]">Next: </span>{r.nextMilestone}</div>}
        </div>
      ))}
    </div>
  );
}

function RetestDashboard({ entries }: { entries: ReturnType<typeof useSprintStore.getState>["rubricEntries"] }) {
  const items = useMemo(() => retestSchedule(entries), [entries]);
  if (!items.length) return <Empty msg="Nothing queued for retest — add retestPlan / staleness / priority to records." />;

  const buckets = [
    { key: "due-now", label: "Due now", color: "var(--orange)" },
    { key: "due-soon", label: "Due soon", color: "var(--yellow)" },
    { key: "blocked", label: "Blocked", color: "var(--text-dim)" },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        {buckets.map((b) => (
          <StatTile key={b.key} label={b.label} value={items.filter((i) => i.bucket === b.key).length} accent={b.color} />
        ))}
      </div>
      <div className="space-y-2">
        {items.map((i) => {
          const b = buckets.find((x) => x.key === i.bucket)!;
          return (
            <div key={i.id} className="rounded-2xl border border-[var(--hairline)] bg-[var(--surface)] p-4 flex items-start gap-3">
              <span className="text-[10px] px-2 py-0.5 rounded-full border shrink-0 mt-0.5" style={{ borderColor: b.color, color: b.color }}>{b.label}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{i.task}</div>
                <div className="text-xs text-[var(--text-mid)] mt-0.5">{i.action}</div>
                <div className="text-[10px] text-[var(--text-dim)] font-mono mt-1">
                  {i.severity ? `${i.severity} severity` : ""}{i.retestDate ? ` · retest ${i.retestDate}` : ""}{i.stalenessRisk ? ` · staleness ${i.stalenessRisk}` : ""}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GapsDashboard({ entries }: { entries: ReturnType<typeof useSprintStore.getState>["rubricEntries"] }) {
  const board = useMemo(() => gapBoard(entries), [entries]);
  const tr = useMemo(() => trust(entries), [entries]);
  if (!entries.length) return <Empty msg="No gaps tracked yet." />;

  const statusColor: Record<string, string> = { open: "var(--orange)", "in progress": "var(--yellow)", reopened: "var(--magenta)", closed: "var(--done)" };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
        {board.columns.map((col) => (
          <div key={col.status} className="card-glass p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium capitalize" style={{ color: statusColor[col.status] }}>{col.status}</div>
              <div className="text-xs font-mono text-[var(--text-dim)]">{col.items.length}</div>
            </div>
            <div className="space-y-2">
              {col.items.map((it) => (
                <div key={it.id} className="rounded-xl border border-[var(--hairline)] bg-[var(--bg-elev)] p-2.5">
                  <div className="text-xs font-medium truncate">{it.task}</div>
                  {(it.recurring || it.worsening) && (
                    <div className="text-[10px] mt-0.5">
                      {it.recurring && <span className="text-[var(--yellow)]">recurring </span>}
                      {it.worsening && <span className="text-[var(--orange)]">worsening</span>}
                    </div>
                  )}
                  {it.tags.length > 0 && <div className="text-[10px] text-[var(--text-dim)] mt-0.5 truncate">{it.tags.join(" · ")}</div>}
                </div>
              ))}
              {col.items.length === 0 && <div className="text-[10px] text-[var(--text-dim)]">—</div>}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-glass p-6">
          <div className="section-title">KNOWLEDGE-GAP CLUSTERS</div>
          <div className="flex flex-wrap gap-2">
            {board.clusterCounts.map((c) => <div key={c.cluster} className="px-3 py-1.5 rounded-2xl bg-[var(--fill-subtle)] border border-[var(--hairline)] text-sm flex items-center gap-2">{c.cluster}<span className="font-mono text-xs text-[var(--magenta)]">{c.count}</span></div>)}
            {!board.clusterCounts.length && <div className="text-sm text-[var(--text-dim)]">No knowledge-gap tags yet.</div>}
          </div>
          {board.gapTypeCounts.length > 0 && (
            <div className="mt-4">
              <div className="text-[11px] uppercase tracking-wider text-[var(--text-dim)] mb-1">Gap types</div>
              <div className="flex flex-wrap gap-1.5">{board.gapTypeCounts.map((g) => <span key={g.type} className="text-xs px-2 py-0.5 rounded border border-[var(--hairline)] text-[var(--text-mid)]">{g.type} <span className="font-mono text-[var(--violet)]">{g.count}</span></span>)}</div>
            </div>
          )}
        </div>

        <div className="card-glass p-6">
          <div className="section-title">READINESS TRUST</div>
          <div className="grid grid-cols-2 gap-3">
            <StatTile label="Avg proof strength" value={tr.avgProof ?? "—"} accent="var(--cyan)" sub="0–1" />
            <StatTile label="Tracker health" value={tr.trackerHealth ?? "—"} />
            <StatTile label="Overclaim risk High" value={tr.overclaimHigh} accent={tr.overclaimHigh ? "var(--orange)" : "var(--text)"} />
            <StatTile label="LLM-dependency High" value={tr.llmRiskHigh} accent={tr.llmRiskHigh ? "var(--orange)" : "var(--text)"} />
            <StatTile label="Fast-logged" value={`${tr.logging.fastPct}%`} sub={`${tr.logging.fast} fast · ${tr.logging.full} full`} accent={tr.logging.fastPct > 70 ? "var(--yellow)" : "var(--text)"} />
          </div>
          {tr.calibrationMix.length > 0 && (
            <div className="mt-3">
              <div className="text-[11px] uppercase tracking-wider text-[var(--text-dim)] mb-1">Calibration source</div>
              <div className="flex flex-wrap gap-1.5">{tr.calibrationMix.map((c) => <span key={c.type} className="text-xs px-2 py-0.5 rounded bg-[var(--fill-subtle)] border border-[var(--hairline)]">{c.type} <span className="font-mono text-[var(--text-dim)]">{c.count}</span></span>)}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

/**
 * Career — role readiness from the longitudinal competency graph.
 *
 * Read-only by construction: this surface derives and renders, and holds no store
 * mutation of any kind. Career Library writes (Projects, Resumes, Job Targets,
 * Campaigns) stay fenced until INT-004 repairs the migration boundary.
 *
 * All computation lives in `@/lib/career/readiness` so the numbers are testable
 * without rendering; this file is presentation only.
 */

import { useMemo } from "react";
import { Compass } from "lucide-react";

import { useWaypointStore } from "@/lib/store";
import {
  UNROUTED_REASON_TEXT,
  buildCareerReadiness,
  isLocallyCalibrated,
  type BiRow,
} from "@/lib/career/readiness";
import type {
  PrioritizedAction,
  RoleDimensionReadiness,
  RoleReadiness,
} from "@waypoint/competency";

import { SurfaceHero, card } from "./shared";

const BAND_COLOR: Record<string, string> = {
  strong: "var(--green)",
  competitive: "var(--green)",
  developing: "var(--yellow)",
  exploratory: "var(--yellow)",
  "no-evidence": "var(--text-dim)",
};

const STATUS_COLOR: Record<string, string> = {
  established: "var(--green)",
  emerging: "var(--yellow)",
  unproven: "var(--text-dim)",
};

const pill = "rounded-full border px-2.5 py-0.5 text-[11px] font-semibold";
const th =
  "text-left text-[10px] uppercase tracking-wider text-[var(--text-dim)] font-semibold pr-3 pb-1";
const td = "border-t border-[var(--hairline)] py-1.5 pr-3";

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}
function num(n: number | null): string {
  return n == null ? "—" : String(Math.round(n));
}

function Pill({ text, color, title }: { text: string; color: string; title?: string }) {
  return (
    <span className={pill} style={{ borderColor: color, color }} title={title}>
      {text}
    </span>
  );
}

function Stat({ k, v, sub }: { k: string; v: string; sub?: string }) {
  return (
    <div className="min-w-[124px] rounded-xl border border-[var(--hairline)] px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-[var(--text-dim)]">{k}</div>
      <div className="text-xl font-semibold leading-tight">{v}</div>
      {sub ? <div className="text-[11px] text-[var(--text-dim)]">{sub}</div> : null}
    </div>
  );
}

function DimensionTable({ rows }: { rows: RoleDimensionReadiness[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr>
            <th className={th}>Competency</th>
            <th className={`${th} text-right`}>Weight</th>
            <th className={`${th} text-right`}>Unmet</th>
            <th className={`${th} text-right`}>Score</th>
            <th className={`${th} text-right`}>Confidence</th>
            <th className={th}>Status</th>
            <th className={th}>Last evidence</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((d) => (
            <tr key={d.competency}>
              <td className={td}>
                {d.label}{" "}
                {d.status !== "established" ? (
                  <Pill text="gap" color="var(--magenta)" title="Not yet established — this is a readiness gap" />
                ) : null}
              </td>
              <td className={`${td} text-right tabular-nums`}>{d.weight}</td>
              <td className={`${td} text-right tabular-nums text-[var(--text-dim)]`}>
                {d.unmetWeight.toFixed(1)}
              </td>
              <td className={`${td} text-right tabular-nums font-semibold`}>{num(d.score)}</td>
              <td className={`${td} text-right tabular-nums`}>{pct(d.confidence)}</td>
              <td className={td}>
                <Pill text={d.status} color={STATUS_COLOR[d.status] ?? "var(--text-dim)"} />
              </td>
              <td className={`${td} text-[var(--text-dim)]`}>{d.lastEvidenceDate ?? "never"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RoleCard({ r }: { r: RoleReadiness }) {
  const local = isLocallyCalibrated(r.role);
  return (
    <div className={card}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h4 className="font-semibold">{r.longLabel}</h4>
        <Pill text={r.band} color={BAND_COLOR[r.band] ?? "var(--text-dim)"} />
        {local ? (
          <Pill
            text="locally calibrated"
            color="var(--magenta)"
            title="weightsFromSpec: false — no v1.11 §9.3 row defines this role's weights"
          />
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <Stat k="Readiness" v={num(r.score)} />
        <Stat k="Coverage" v={pct(r.coverage)} />
        <Stat k="Gaps" v={`${r.gaps.length}`} sub={`of ${r.dimensions.length}`} />
      </div>
    </div>
  );
}

function ActionRow({ a, i }: { a: PrioritizedAction; i: number }) {
  return (
    <div className="flex items-start gap-3 border-t border-[var(--hairline)] py-3 first:border-t-0">
      <div className="w-5 shrink-0 text-right text-sm font-semibold text-[var(--text-dim)]">
        {i + 1}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm">
          <span className="font-semibold">{a.actionLabel}</span>
          <span className="text-[var(--text-dim)]"> — {a.label}</span>
          <span className="text-[var(--text-dim)]"> · {a.terms.timeCostHours}h</span>
        </div>
        <ul className="mt-1 list-disc pl-4 text-xs text-[var(--text-dim)]">
          {a.why.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      </div>
      <div className="shrink-0 text-lg font-semibold tabular-nums">{a.score.toFixed(2)}</div>
    </div>
  );
}

function BiTable({ rows, labels }: { rows: BiRow[]; labels: string[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[620px] border-collapse text-sm">
        <thead>
          <tr>
            <th className={th}>Competency</th>
            {labels.map((l) => (
              <th key={l} className={`${th} text-right`}>
                {l} w
              </th>
            ))}
            <th className={`${th} text-right`}>Score</th>
            <th className={`${th} text-right`}>Confidence</th>
            <th className={th}>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.competency}>
              <td className={td}>
                {r.label} {r.isGap ? <Pill text="gap" color="var(--magenta)" /> : null}
              </td>
              {r.weights.map((w, i) => (
                <td
                  key={labels[i]}
                  className={`${td} text-right tabular-nums ${w == null ? "text-[var(--text-dim)]" : ""}`}
                >
                  {w ?? "—"}
                </td>
              ))}
              <td className={`${td} text-right tabular-nums font-semibold`}>{num(r.score)}</td>
              <td className={`${td} text-right tabular-nums`}>{pct(r.confidence)}</td>
              <td className={td}>
                <Pill text={r.status} color={STATUS_COLOR[r.status] ?? "var(--text-dim)"} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CareerSurface() {
  const rubricEntries = useWaypointStore((s) => s.rubricEntries);

  // `asOf` is read once per render rather than inside the engine, which is
  // deliberately clock-free so every number stays reproducible in a test.
  const view = useMemo(
    () => buildCareerReadiness(rubricEntries, new Date().toISOString().slice(0, 10)),
    [rubricEntries],
  );

  const { target, routing, bi } = view;
  const empty = routing.total === 0;

  return (
    <div className="space-y-6">
      <SurfaceHero
        eyebrow="Longitudinal competency graph"
        title={`${target.longLabel} readiness`}
        accent="violet"
        subtitle={
          <>
            Every graded attempt, weighted by evidence class, assistance, LLM independence,
            source and recency — then projected onto the role you are actually targeting.
            Read-only.
          </>
        }
        right={<Compass size={20} className="text-[var(--text-dim)]" />}
      />

      {empty ? (
        <div className={card}>
          <p className="text-sm text-[var(--text-dim)]">
            No graded entries yet, so there is nothing to project. This view derives entirely
            from your rubric history — grade an attempt on Interview → Grade, or import a
            backup, and readiness appears here. Nothing is stored by this screen.
          </p>
        </div>
      ) : null}

      {/* Evidence quality first: a readiness number is only as honest as what fed it. */}
      <div className={card}>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h3 className="font-semibold">What fed these numbers</h3>
          <Pill
            text={`${routing.routed} of ${routing.total} routed`}
            color={routing.unrouted.length > 0 ? "var(--yellow)" : "var(--green)"}
          />
        </div>
        <div className="mb-3 flex flex-wrap gap-2">
          <Stat k="Direct tags" v={String(routing.channelCounts.direct)} sub="strength 1.0" />
          <Stat k="Task type" v={String(routing.channelCounts.taskType)} sub="strength 0.7" />
          <Stat k="Domain" v={String(routing.channelCounts.domain)} sub="strength 0.5" />
          <Stat k="Unrouted" v={String(routing.unrouted.length)} sub="reached nothing" />
        </div>
        {!routing.hasDirectEvidence && !empty ? (
          <p className="text-xs text-[var(--text-dim)]">
            No entry carries a direct competency tag, so everything routes through task type
            and domain at 0.7 and 0.5 strength. Confidence is therefore lower than the same
            work would earn if attempts named the competencies they exercised — read thin
            confidence here as thin <em>tagging</em>, not thin ability.
          </p>
        ) : null}
        {routing.unrouted.length > 0 ? (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-sm">
              <thead>
                <tr>
                  <th className={th}>Entry</th>
                  <th className={th}>Reason</th>
                  <th className={th}>What it means</th>
                </tr>
              </thead>
              <tbody>
                {routing.unrouted.map((u) => (
                  <tr key={u.evidenceId}>
                    <td className={`${td} font-mono text-xs`}>{u.evidenceId}</td>
                    <td className={td}>
                      <Pill text={u.reason} color="var(--yellow)" />
                    </td>
                    <td className={`${td} text-xs text-[var(--text-dim)]`}>
                      {UNROUTED_REASON_TEXT[u.reason]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      <div className={card}>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h3 className="font-semibold">{target.longLabel}</h3>
          <Pill text="target role" color="var(--cyan)" />
          <Pill text={target.band} color={BAND_COLOR[target.band] ?? "var(--text-dim)"} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Stat k="Readiness" v={num(target.score)} />
          <Stat k="Coverage" v={pct(target.coverage)} sub="weight at least emerging" />
          <Stat k="Evidence strength" v={pct(target.evidenceStrength)} sub="coverage × confidence" />
          <Stat
            k="Readiness gaps"
            v={String(target.gaps.length)}
            sub={`of ${target.dimensions.length} dimensions`}
          />
        </div>
      </div>

      {view.actions.length > 0 ? (
        <div className={card}>
          <h3 className="mb-1 font-semibold">What to do next</h3>
          <p className="mb-2 text-xs text-[var(--text-dim)]">
            {`Ranked for ${target.label} alone — no other role's weights can displace this ` +
              `queue. Each line shows the terms that produced its score.`}
          </p>
          {view.actions.map((a, i) => (
            <ActionRow key={a.competency} a={a} i={i} />
          ))}
        </div>
      ) : null}

      <div className={card}>
        <h3 className="mb-1 font-semibold">Evidence-lift priorities</h3>
        <p className="mb-3 text-xs text-[var(--text-dim)]">
          {`Every ${target.label} dimension ranked by remaining lift. Rows marked`}{" "}
          <em>gap</em>{" "}
          {`are not yet established — those are the readiness gaps.`}
        </p>
        <DimensionTable rows={target.priorities} />
      </div>

      <div>
        <h3 className="mb-2 font-semibold">Warm roles</h3>
        <p className="mb-3 text-xs text-[var(--text-dim)]">
          Kept for comparison. They do not drive the queue above.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {view.warm.map((r) => (
            <RoleCard key={r.role} r={r} />
          ))}
          {view.exploratory.map((r) => (
            <RoleCard key={r.role} r={r} />
          ))}
        </div>
      </div>

      <div className={card}>
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <h3 className="font-semibold">Business Intelligence</h3>
          <Pill text="BIE + BIA, one view" color="var(--violet)" />
        </div>
        <p className="mb-3 text-xs text-[var(--text-dim)]">
          Collapsed for display only. The two roles keep separate §9.3 weight profiles — shown
          as separate columns rather than averaged, because a merged BI profile is a number the
          spec never states. Score, confidence and status belong to the competency graph rather
          than to a role, so those are genuinely shared.
        </p>
        <BiTable rows={bi.rows} labels={bi.roles.map((r) => r.label)} />
      </div>
    </div>
  );
}

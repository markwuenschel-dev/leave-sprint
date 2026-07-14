/**
 * Study Guide engine — deterministic digest + guide types (design pack 2026-07-14).
 *
 * The digest is pure math over evidence the store already holds: recurring miss
 * clusters with trend, weakest domains, retrain-flagged Q Bank cards, due
 * retests, unpracticed core defense stories. The LLM (via /api/study) only
 * writes the "learn next / this week" narrative on top and must bind every rep
 * to ids from this digest. No RAG: the whole digest is a few KB.
 */

import { QBANK, QB_TRACK_MAP, type QBankStatus, type TrackKey } from "@waypoint/qbank";
import type { RubricEntry } from "@waypoint/rubric";
import type { FileDefenseItem } from "@waypoint/practice-types";
import type { RoleFilter } from "./domain";
import { activeRetestQueue, domainAverages, filterEntriesByRole } from "./gaps";

export interface MissCluster {
  concept: string;
  misses: number;
  trend: "worsening" | "flat" | "improving";
  /** Where the signal comes from, e.g. "sql · knowledge" (taskType/domain pairs). */
  sources: string[];
}

export interface StudyRep {
  kind: "qbank" | "defense" | "retest";
  id: string;
  label: string;
}

export interface StudyDigest {
  role: RoleFilter;
  /** Entry count in scope — the staleness watermark. */
  gradeCount: number;
  misses: MissCluster[];
  weakDomains: { domain: string; avg: number; count: number }[];
  retrainCards: { id: string; track: TrackKey; q: string }[];
  dueRetests: { id: string; task: string; action: string; score: number }[];
  /** Core defense stories in scope; unpracticed ones are the urgent signal. */
  defenseStories: { id: string; title: string; project?: string; practiced: number }[];
  /** Q Bank cards in scope the model may cite as reps (id + truncated question). */
  qbankCandidates: { id: string; q: string }[];
}

export interface StudyGuideLearnItem {
  title: string;
  why: string;
  reps: StudyRep[];
}

export interface StudyGuideWeekItem {
  id: string;
  text: string;
  done?: boolean;
}

export interface StudyGuide {
  builtAt: string; // ISO
  gradeCount: number; // watermark at build time
  role: RoleFilter;
  model?: string;
  learn: StudyGuideLearnItem[];
  week: StudyGuideWeekItem[];
}

/** Tracks whose rubric role falls inside the given scope. */
export function tracksForRole(role: RoleFilter): TrackKey[] {
  const all = Object.keys(QB_TRACK_MAP) as TrackKey[];
  if (role === "ALL") return all;
  return all.filter((t) => QB_TRACK_MAP[t].role === role);
}

const trunc = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

function trendOf(scores: { date: string; final: number | null }[]): MissCluster["trend"] {
  const pts = scores
    .filter((p) => typeof p.final === "number")
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  if (pts.length < 2) return "flat";
  const half = Math.floor(pts.length / 2);
  const avg = (xs: typeof pts) => xs.reduce((s, p) => s + (p.final as number), 0) / xs.length;
  const earlier = avg(pts.slice(0, half));
  const later = avg(pts.slice(half));
  if (later < earlier - 3) return "worsening";
  if (later > earlier + 3) return "improving";
  return "flat";
}

/** Recurring miss clusters from knowledge-gap tags + gap types (+ repeated missing elements). */
function missClusters(entries: RubricEntry[]): MissCluster[] {
  const byTag = new Map<string, { entries: RubricEntry[]; sources: Set<string> }>();
  const add = (tag: string, e: RubricEntry) => {
    const key = tag.trim();
    if (!key) return;
    const cur = byTag.get(key) ?? { entries: [], sources: new Set<string>() };
    cur.entries.push(e);
    cur.sources.add([e.primaryDomain || e.domain, e.taskType].filter(Boolean).join(" · "));
    byTag.set(key, cur);
  };
  for (const e of entries) {
    for (const t of e.knowledgeGapTags ?? []) add(t, e);
    for (const t of e.gapTypes ?? []) add(t, e);
    // Missing elements only count when the exact wording repeats.
    for (const m of e.missingElements ?? []) add(m.toLowerCase(), e);
  }
  return [...byTag.entries()]
    .filter(([, v]) => v.entries.length >= 2)
    .map(([concept, v]) => ({
      concept,
      misses: v.entries.length,
      trend: trendOf(v.entries.map((e) => ({ date: e.date, final: e.finalScore ?? null }))),
      sources: [...v.sources].slice(0, 3),
    }))
    .sort((a, b) => b.misses - a.misses)
    .slice(0, 8);
}

export function buildStudyDigest(
  entries: RubricEntry[],
  role: RoleFilter,
  qbankStatus: Record<string, QBankStatus>,
  fileDefense: FileDefenseItem[],
): StudyDigest {
  const scoped = filterEntriesByRole(entries, role);
  const tracks = tracksForRole(role);

  const retrainCards = tracks.flatMap((track) =>
    QBANK[track].questions
      .filter((q) => qbankStatus[q.id] === "review")
      .map((q) => ({ id: q.id, track, q: trunc(q.q, 120) })),
  );

  const dueRetests = activeRetestQueue(entries, role)
    .slice(0, 5)
    .map((r) => ({ id: r.id, task: trunc(r.task, 120), action: r.action, score: r.score }));

  const defenseStories = fileDefense
    .filter((f) => {
      const roleOk =
        role === "ALL" || !f.roleTrack || f.roleTrack === "BOTH" || f.roleTrack === role;
      return roleOk && f.core;
    })
    .sort((a, b) => (a.practicedDates?.length ?? 0) - (b.practicedDates?.length ?? 0))
    .slice(0, 10)
    .map((f) => ({
      id: f.id,
      title: f.title,
      practiced: f.practicedDates?.length ?? 0,
      ...(f.project ? { project: f.project } : {}),
    }));

  const weakDomains = domainAverages(scoped, "ALL", 12)
    .filter((d) => d.count >= 2)
    .sort((a, b) => a.avg - b.avg)
    .slice(0, 4);

  const qbankCandidates = tracks.flatMap((track) =>
    QBANK[track].questions.map((q) => ({ id: q.id, q: trunc(q.q, 100) })),
  );

  return {
    role,
    gradeCount: scoped.length,
    misses: missClusters(scoped),
    weakDomains,
    retrainCards,
    dueRetests,
    defenseStories,
    qbankCandidates,
  };
}

/** Ids the model is allowed to cite, used to drop hallucinated reps on parse. */
export function validRepIds(digest: StudyDigest): Set<string> {
  const s = new Set<string>();
  for (const c of digest.qbankCandidates) s.add(`qbank:${c.id}`);
  for (const r of digest.dueRetests) s.add(`retest:${r.id}`);
  for (const f of digest.defenseStories) s.add(`defense:${f.id}`);
  return s;
}

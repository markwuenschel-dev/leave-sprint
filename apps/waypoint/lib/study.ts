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

/** A thing to go read, named precisely enough to search for. */
export interface StudyConcept {
  name: string;
  /** The one line you should be able to say afterwards — what "knowing it" means. */
  claim: string;
  /** Where to actually read it: a doc section, a chapter, an exact search phrase. */
  lookup?: string;
}

export type ProblemSource = "leetcode" | "neetcode" | "hackerrank" | "stratascratch" | "other";

/**
 * External practice. Unlike StudyRep this CANNOT be validated against the
 * digest — it is model recall, so the surface labels it as such and links
 * through a search when the slug is missing or malformed.
 */
export interface StudyProblem {
  source: ProblemSource;
  name: string;
  difficulty?: "easy" | "medium" | "hard";
  slug?: string;
  /** Which miss this problem exercises. */
  targets?: string;
}

export interface StudyGuideLearnItem {
  title: string;
  why: string;
  /** Digest miss concepts this item collapses — validated, drives the leverage badge. */
  collapses: string[];
  concepts: StudyConcept[];
  /** Internal reps — id-validated against the digest. */
  reps: StudyRep[];
  /** External problems — model recall, not verifiable. */
  problems: StudyProblem[];
}

const SLUG_OK = /^[a-z0-9][a-z0-9-]{0,80}$/i;

/** Direct link when we trust the slug, search fallback otherwise. Never a raw model string. */
export function problemUrl(p: StudyProblem): string {
  const slug = p.slug?.trim();
  if (slug && SLUG_OK.test(slug)) {
    if (p.source === "leetcode") return `https://leetcode.com/problems/${slug}/`;
    if (p.source === "neetcode") return `https://neetcode.io/problems/${slug}`;
    if (p.source === "hackerrank") return `https://www.hackerrank.com/challenges/${slug}/problem`;
  }
  const terms = [p.name, p.source === "other" ? "" : p.source].filter(Boolean).join(" ");
  return `https://www.google.com/search?q=${encodeURIComponent(terms)}`;
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

/** Miss concepts a learn item may claim to collapse. Same contract as validRepIds. */
export function validMissConcepts(digest: StudyDigest): Set<string> {
  return new Set(digest.misses.map((m) => m.concept));
}

/**
 * Prompt shared by /api/study and the surface's "Copy prompt" button, so a guide
 * built by hand in another chat has the same contract as one built in-app.
 */
export const STUDY_SYSTEM = `You are a study coach building a short, per-role study guide for a software/data career switcher, from a deterministic digest of their graded interview practice history. Be specific and evidence-bound: every claim traces to the digest, every internal rep cites an id from it. No filler, no generic advice.

Reply with ONLY a JSON object, no markdown fences:
{
  "learn": [
    {
      "title": "the underlying model to acquire, phrased as the idea — not the symptom",
      "why": "2-3 sentences: which misses/trends are the evidence, and why this one idea collapses several of them at once",
      "collapses": ["<concept string copied verbatim from digest.misses>"],
      "concepts": [
        { "name": "precise searchable name of the mechanism", "claim": "the one line you should be able to say afterwards", "lookup": "where to actually read it: named doc section, chapter, or the exact phrase to search" }
      ],
      "reps": [{ "kind": "qbank" | "defense" | "retest", "id": "<id from digest>", "label": "short human label" }],
      "problems": [
        { "source": "leetcode" | "neetcode" | "hackerrank" | "stratascratch" | "other", "name": "exact problem title", "slug": "url-slug-if-you-are-sure", "difficulty": "easy" | "medium" | "hard", "targets": "the miss this problem exercises" }
      ]
    }
  ],
  "week": [{ "id": "w1", "text": "one concrete checkable action mixing study + reps" }]
}

Rules:
- 2 to 5 learn items, ordered by leverage: the item collapsing the most recurring misses comes first.
- "collapses" must quote concept strings from digest.misses verbatim; anything else is dropped, which costs the item its leverage badge.
- 2 to 4 concepts per learn item. Name the actual mechanism ("window frame clauses: ROWS vs RANGE"), never a topic label ("SQL"). "lookup" must be something to type into a search bar or a named doc/chapter — never "read the docs".
- 1 to 4 reps per learn item. "qbank" ids come from qbankCandidates or retrainCards; "retest" ids from dueRetests; "defense" ids from defenseStories. Never invent an id.
- 2 to 4 problems per learn item, from your own knowledge of those sites. Prefer canonical, well-known problems whose title and slug you are confident about — omit the slug rather than guess it, and skip the problem rather than invent it. Ladder the difficulty: start at or just below their current level, end above it. Omit problems entirely for narrative/behavioral learn items, where they do not apply.
- 4 to 6 week items, small enough to finish in a week alongside a job search; reference the learn items, concepts, and problems by name.
- If the digest has almost no signal (few misses), say so in the single learn item's "why" and build the week from retrain cards, due retests, and unpracticed defense stories instead.`;

export function studyUserPrompt(digest: StudyDigest): string {
  return `DIGEST (role scope: ${digest.role}):\n${JSON.stringify(digest)}`;
}

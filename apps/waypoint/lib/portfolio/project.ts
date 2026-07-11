/**
 * Projections: a validated CleanProject → the two things Waypoint actually uses.
 *   toDefenseItems  → FileDefenseItem[]  (the Defense tab cards)
 *   toTieMap        → per-question `tie` strings (concept → code-site bridge)
 *
 * Judgment fields degrade gracefully: when the extractor's prose is missing or
 * low-confidence, a deterministic role-based template fills in, and the id is
 * reported as `provisional` so you can review it rather than shipping a blank.
 * mergeDefense re-ingests without wiping `practicedDates` / `notes`.
 */

import type { FileDefenseItem } from "@waypoint/practice-types";
import type {
  CleanProject,
  CleanFile,
  DefenseRoleTrack,
  RoleTrack,
  FileRole,
} from "./schema";
import { LIMITS } from "./schema";
import { dedupeIds } from "./ids";

/** DS/DE aren't valid FileDefenseItem tracks → fold into OTHER; keep SWE/MLE/BOTH. */
function narrowTrack(rt: RoleTrack): DefenseRoleTrack {
  return rt === "SWE" || rt === "MLE" || rt === "BOTH" ? rt : "OTHER";
}

/** Deterministic "say this cold" line per role when the extractor gave none. */
const ROLE_LINE: Record<FileRole, (f: CleanFile) => string> = {
  boundary: (f) =>
    `${f.title} isolates ${f.terminology[0] ?? "the integration"} behind a stable contract, so callers don't depend on how it works underneath.`,
  adapter: (f) => `All the integration risk for ${f.title} is contained here, behind one contract.`,
  controller: (f) => `${f.title} translates transport into use-case calls — no business logic lives here.`,
  service: (f) => `${f.title} owns the workflow orchestration, not the transport or the domain rules.`,
  dto: (f) => `${f.title} is the API contract — it keeps internal shapes from leaking into the public surface.`,
  "pure-fn": (f) => `${f.title} is a pure function: same inputs, same output, no side effects — trivial to test.`,
  component: (f) => `${f.title} is presentational — it renders state and pushes logic outward.`,
  model: (f) => `${f.title} models a domain concept so invalid states are hard to represent.`,
  config: (f) => `${f.title} centralizes wiring so configuration lives in one reviewable place.`,
  test: (f) => `${f.title} pins down the invariants and edge cases the code has to hold.`,
  other: (f) => `${f.title}: ${f.responsibility || "role inferred from structure and dependencies"}.`,
};

/** Slugs that read wrong in sentence case → force uppercase. */
const ACRONYMS = new Set(["llm", "rag", "api", "http", "dto", "sql", "ui", "id", "url", "ci", "cd", "cli", "json"]);

/** "design-by-contract" → "Design by contract"; "llm-output-validation" → "LLM output validation". */
function humanizeConcept(slug: string): string {
  const words = slug.split("-").map((w) => (ACRONYMS.has(w) ? w.toUpperCase() : w));
  const s = words.join(" ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const ROLE_TERMS: Record<FileRole, string> = {
  boundary: "Boundary · dependency inversion · contract",
  adapter: "Adapter pattern · process boundary · error envelope",
  controller: "Controller · request binding · status-code semantics",
  service: "Orchestration · dependency injection · use-case layer",
  dto: "DTO · serialization · API contract",
  "pure-fn": "Pure function · determinism · side-effect isolation",
  component: "Presentational component · conditional rendering · state",
  model: "Domain model · invariants · impossible states",
  config: "Configuration · single source of truth",
  test: "Test · invariant · edge case",
  other: "Separation of concerns",
};

export interface DefenseProjection {
  items: FileDefenseItem[];
  /** Ids whose interviewLine came from the fallback template — review these. */
  provisional: string[];
}

export function toDefenseItems(
  project: CleanProject,
  opts: { minConfidence?: number } = {},
): DefenseProjection {
  const min = opts.minConfidence ?? LIMITS.minConfidence;

  const rows = project.files.map((f) => {
    const strongLine = f.confidence >= min && !!f.interviewLine;
    const line = strongLine ? f.interviewLine : (ROLE_LINE[f.role] ?? ROLE_LINE.other)(f);
    const item: FileDefenseItem = {
      id: f.id,
      title: f.title,
      why: f.responsibility || `${f.role} — responsibility inferred from structure`,
      terminology:
        f.terminology.join(" · ") ||
        (f.concepts.length ? f.concepts.slice(0, 5).map(humanizeConcept).join(" · ") : ROLE_TERMS[f.role]),
      interviewLine: line,
      practicedDates: [],
      notes: "",
      ...(f.core ? { core: true } : {}),
      roleTrack: narrowTrack(f.roleTrack),
      project: project.project.key,
    };
    return { item, provisional: !strongLine };
  });

  const items = dedupeIds(rows.map((r) => r.item));
  const provisional = items.filter((_, i) => rows[i].provisional).map((it) => it.id);
  return { items, provisional };
}

export interface TieResult {
  tie: string;
  concept: string;
  filePath: string;
  strength: number;
  /** Other sites that also matched, best-first — for manual re-pointing. */
  alternates: { concept: string; filePath: string }[];
}

/**
 * Build `tie` strings by joining each question's concepts to concept-sites.
 * @param questionConcepts qid → concept slugs (produce this externally too, or
 *        derive from QBankQuestion text). No match → NO tie emitted (never fabricate).
 */
export function toTieMap(
  project: CleanProject,
  questionConcepts: Record<string, string[]>,
): Record<string, TieResult> {
  // concept slug → sites, strongest first
  const byConcept = new Map<string, typeof project.concepts>();
  for (const s of project.concepts) {
    const arr = byConcept.get(s.concept) ?? [];
    arr.push(s);
    byConcept.set(s.concept, arr);
  }
  for (const arr of byConcept.values()) arr.sort((a, b) => (b.strength ?? 0) - (a.strength ?? 0));

  const out: Record<string, TieResult> = {};
  for (const [qid, concepts] of Object.entries(questionConcepts)) {
    const hits = concepts
      .flatMap((c) => byConcept.get(c) ?? [])
      .sort((a, b) => (b.strength ?? 0) - (a.strength ?? 0));
    if (!hits.length) continue; // omit — don't invent a tie

    // de-dup alternates by path, keep best per path
    const seen = new Set<string>();
    const ranked = hits.filter((h) => (seen.has(h.filePath) ? false : (seen.add(h.filePath), true)));
    const top = ranked[0];
    out[qid] = {
      tie: `Ground this in ${project.project.label}: ${top.claim}`,
      concept: top.concept,
      filePath: top.filePath,
      strength: top.strength ?? 0,
      alternates: ranked.slice(1, 3).map((h) => ({ concept: h.concept, filePath: h.filePath })),
    };
  }
  return out;
}

/**
 * Idempotent merge into an existing defense list. Generated metadata wins;
 * user progress (practicedDates, notes) is preserved by id-join. Rows not in the
 * generated set are kept untouched, so a partial hand-off never deletes cards.
 */
export function mergeDefense(
  existing: FileDefenseItem[],
  generated: FileDefenseItem[],
): FileDefenseItem[] {
  const prev = new Map(existing.map((f) => [f.id, f]));
  const genIds = new Set(generated.map((g) => g.id));
  const merged = generated.map((g) => {
    const old = prev.get(g.id);
    if (!old) return g;
    return {
      ...g,
      practicedDates: old.practicedDates ?? [],
      notes: old.notes ?? g.notes ?? "",
    };
  });
  for (const f of existing) if (!genIds.has(f.id)) merged.push(f);
  return merged;
}

/**
 * Replace exactly one project's cards. Drops the project's stale cards (present
 * in `existing` but not re-generated), preserves every OTHER project's cards,
 * and keeps practice progress for surviving ids. Use this when re-ingesting a
 * single project so a refactor can't leave orphaned cards behind.
 */
export function mergeProjectDefense(
  existing: FileDefenseItem[],
  generated: FileDefenseItem[],
  projectKey: string,
): FileDefenseItem[] {
  const genIds = new Set(generated.map((g) => g.id));
  const others = existing.filter((f) => f.project !== projectKey || genIds.has(f.id));
  return mergeDefense(others, generated);
}

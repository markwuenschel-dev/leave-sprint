/**
 * Ingest boundary for untrusted portfolio hand-offs. Parse-don't-validate:
 * coerce what we can, DROP what we can't, and NEVER throw. Mirrors
 * applyTwinImport's discipline (id-join, unmatched listed, corrupt quarantined)
 * so a bad hand-off can add or skip but never corrupt state.
 *
 * The load-bearing check is grounding: when `knownPaths` (the real repo
 * inventory — `git ls-files`) is supplied, every cited path is verified and
 * hallucinated files + dangling concept sites are dropped. An LLM extractor's
 * failure mode is confident and wrong; this is where that gets caught.
 */

import {
  LIMITS,
  type PortfolioHandoff,
  type CleanProject,
  type CleanFile,
  type PortfolioConceptSite,
  type FileRole,
  type RoleTrack,
  type SourceKind,
} from "./schema";
import { defenseId, dedupeIds, conceptSlug, slug } from "./ids";

const FILE_ROLES: readonly FileRole[] = [
  "controller", "dto", "service", "adapter", "boundary",
  "pure-fn", "component", "model", "config", "test", "other",
];
const ROLE_TRACKS: readonly RoleTrack[] = ["SWE", "MLE", "DS", "DE", "BOTH", "OTHER"];
const SOURCE_KINDS: readonly SourceKind[] = ["code", "readme", "adr", "comment", "commit", "test"];

export interface ValidationReport {
  project: string;
  filesKept: number;
  filesDropped: { ref: string; reason: string }[];
  sitesKept: number;
  sitesDropped: { ref: string; reason: string }[];
  /** Kept but needs a human eye (truncated line, empty prose, unverified path). */
  flagged: { id: string; reason: string }[];
  /** True when no repo inventory was supplied, so paths could not be grounded. */
  ungrounded: boolean;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}
function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v.trim() : fallback;
}
function strArr(v: unknown, cap = 64): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const x of v) {
    const s = str(x);
    if (s && !out.includes(s)) out.push(s);
    if (out.length >= cap) break;
  }
  return out;
}
function bool(v: unknown): boolean {
  return v === true;
}
function clamp01(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(1, Math.max(0, n));
}
function oneOf<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  const s = str(v);
  return (allowed as readonly string[]).includes(s) ? (s as T) : fallback;
}

/** Normalize a repo path so `\`, `./`, and trailing slashes don't defeat grounding. */
function normPath(v: unknown): string {
  let p = str(v).replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/+$/, "");
  return p;
}
function basename(path: string): string {
  const i = path.lastIndexOf("/");
  return i >= 0 ? path.slice(i + 1) : path;
}

/** Trim to a word cap at a word boundary; returns [text, wasTruncated]. */
function capWords(text: string, maxWords: number, maxChars = Infinity): [string, boolean] {
  const stripped = text.replace(/^["'“”]+|["'“”]+$/g, "").trim();
  const words = stripped.split(/\s+/);
  let out = stripped;
  let cut = false;
  if (words.length > maxWords) {
    out = words.slice(0, maxWords).join(" ");
    cut = true;
  }
  if (out.length > maxChars) {
    // back off to the last sentence/word boundary under the char cap
    const slice = out.slice(0, maxChars);
    const lastStop = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf(" "));
    out = (lastStop > maxChars * 0.6 ? slice.slice(0, lastStop) : slice).trim();
    cut = true;
  }
  return [out, cut];
}

/**
 * Turn a raw hand-off into a trusted CleanProject + a report of every decision.
 * @param knownPaths real repo-relative file list; when omitted, paths are kept
 *        but the result is flagged `ungrounded`.
 */
export function validateHandoff(
  raw: unknown,
  opts: { knownPaths?: string[] } = {},
): { clean: CleanProject; report: ValidationReport } {
  const knownSet = opts.knownPaths?.length
    ? new Set(opts.knownPaths.map((p) => normPath(p)))
    : null;

  const report: ValidationReport = {
    project: "",
    filesKept: 0,
    filesDropped: [],
    sitesKept: 0,
    sitesDropped: [],
    flagged: [],
    ungrounded: !knownSet,
  };

  const emptyProject: CleanProject = {
    project: { key: "unknown", label: "Unknown", summary: "", roleTracks: [] },
    files: [],
    concepts: [],
  };

  const h = raw as Partial<PortfolioHandoff>;
  if (!isRecord(raw) || !isRecord(h.project)) {
    report.flagged.push({ id: "-", reason: "hand-off is not an object with a project" });
    return { clean: emptyProject, report };
  }

  // ── project meta ───────────────────────────────────────────────────────
  const key = slug(str(h.project.key) || str(h.project.label)) || "unknown";
  const label = str(h.project.label) || str(h.project.key) || "Unknown";
  const [summary] = capWords(str(h.project.summary), 80, LIMITS.summaryMaxChars);
  const roleTracks = strArr(h.project.roleTracks)
    .map((r) => oneOf(r, ROLE_TRACKS, "OTHER"))
    .filter((r, i, a) => a.indexOf(r) === i);
  report.project = key;

  // ── files ──────────────────────────────────────────────────────────────
  const rawFiles = Array.isArray(h.files) ? h.files : [];
  const seenPath = new Set<string>();
  const clean: CleanFile[] = [];

  for (const rf of rawFiles) {
    if (clean.length >= LIMITS.maxFiles) {
      report.filesDropped.push({ ref: `#${clean.length}`, reason: "file cap reached" });
      break;
    }
    if (!isRecord(rf)) {
      report.filesDropped.push({ ref: "?", reason: "not an object" });
      continue;
    }
    const path = normPath(rf.path);
    if (!path) {
      report.filesDropped.push({ ref: str(rf.title) || "?", reason: "missing path" });
      continue;
    }
    if (knownSet && !knownSet.has(path)) {
      report.filesDropped.push({ ref: path, reason: "path not in repo inventory" });
      continue;
    }
    if (seenPath.has(path)) {
      report.filesDropped.push({ ref: path, reason: "duplicate path" });
      continue;
    }
    seenPath.add(path);

    const title = str(rf.title) || basename(path);
    const role = oneOf(rf.role, FILE_ROLES, "other");
    const confidence = clamp01(rf.confidence, 0.5);

    const [responsibility, respCut] = capWords(str(rf.responsibility), LIMITS.responsibilityMaxWords);
    const [interviewLine, lineCut] = capWords(
      str(rf.interviewLine),
      LIMITS.interviewLineMaxWords,
      LIMITS.interviewLineMaxChars,
    );

    const file: CleanFile = {
      id: defenseId(key, { path, title }),
      path,
      title,
      role,
      responsibility,
      terminology: strArr(rf.terminology, LIMITS.maxConceptsPerFile),
      interviewLine,
      boundary: bool(rf.boundary),
      core: bool(rf.core),
      roleTrack: oneOf(rf.roleTrack, ROLE_TRACKS, "OTHER"),
      concepts: strArr(rf.concepts, LIMITS.maxConceptsPerFile).map(conceptSlug).filter(Boolean),
      evidence: strArr(rf.evidence),
      confidence,
      provenance: strArr(rf.provenance)
        .map((p) => oneOf(p, SOURCE_KINDS, "code"))
        .filter((p, i, a) => a.indexOf(p) === i),
    };

    if (respCut) report.flagged.push({ id: file.id, reason: "responsibility truncated" });
    if (lineCut) report.flagged.push({ id: file.id, reason: "interviewLine truncated" });
    if (!interviewLine) report.flagged.push({ id: file.id, reason: "empty interviewLine → fallback" });
    if (!knownSet) report.flagged.push({ id: file.id, reason: "path unverified (no inventory)" });

    clean.push(file);
  }

  const deduped = dedupeIds(clean);
  report.filesKept = deduped.length;
  const survivingPaths = new Set(deduped.map((f) => f.path));

  // ── concept sites (tie edges) ────────────────────────────────────────────
  const rawSites = Array.isArray(h.concepts) ? h.concepts : [];
  const sites: PortfolioConceptSite[] = [];
  for (const rs of rawSites) {
    if (!isRecord(rs)) {
      report.sitesDropped.push({ ref: "?", reason: "not an object" });
      continue;
    }
    const concept = conceptSlug(str(rs.concept));
    const filePath = normPath(rs.filePath);
    const ref = `${concept || "?"}@${filePath || "?"}`;
    if (!concept) {
      report.sitesDropped.push({ ref, reason: "missing concept" });
      continue;
    }
    if (!survivingPaths.has(filePath)) {
      report.sitesDropped.push({ ref, reason: "dangling site (path not among kept files)" });
      continue;
    }
    const [claim] = capWords(str(rs.claim), 60);
    sites.push({ concept, filePath, claim, strength: clamp01(rs.strength, 0.5) });
  }
  report.sitesKept = sites.length;

  return {
    clean: { project: { key, label, summary, roleTracks }, files: deduped, concepts: sites },
    report,
  };
}

/** One-line-per-fact summary, like formatTwinSummary — for logging an ingest. */
export function summarizeReport(r: ValidationReport): string {
  const lines = [
    `Project: ${r.project}${r.ungrounded ? " (UNGROUNDED — no repo inventory)" : ""}`,
    `Files kept: ${r.filesKept}${r.filesDropped.length ? ` · dropped ${r.filesDropped.length}` : ""}`,
    `Concept sites kept: ${r.sitesKept}${r.sitesDropped.length ? ` · dropped ${r.sitesDropped.length}` : ""}`,
  ];
  if (r.flagged.length) lines.push(`Flagged for review: ${r.flagged.length}`);
  for (const d of r.filesDropped.slice(0, 12)) lines.push(`  ✗ file ${d.ref} — ${d.reason}`);
  for (const d of r.sitesDropped.slice(0, 12)) lines.push(`  ✗ site ${d.ref} — ${d.reason}`);
  return lines.join("\n");
}

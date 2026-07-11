/**
 * Portfolio hand-off contract — the shape your EXTERNAL LLMs should emit per
 * project. You produce these files (JSON) elsewhere; `validate.ts` is the ingest
 * boundary that turns them into Waypoint data (FileDefenseItem[] + QBankQuestion
 * ties). Everything here is UNTRUSTED input: only `path` + `title` are required,
 * the boundary fills/repairs the rest and drops what it can't ground.
 *
 * One file = one project. See HANDOFF.md for the copy-paste spec + example.
 */

import type { FileDefenseItem, Problem } from "@waypoint/practice-types";

/** Track the extractor may claim. Narrowed to DefenseRoleTrack at projection. */
export type RoleTrack = "SWE" | "MLE" | "DS" | "DE" | "BOTH" | "OTHER";
/** What FileDefenseItem / Problem actually persist. */
export type DefenseRoleTrack = NonNullable<Problem["roleTrack"]>;

/** Architectural role of a file — drives deterministic fallbacks when prose is weak. */
export type FileRole =
  | "controller" | "dto" | "service" | "adapter" | "boundary"
  | "pure-fn" | "component" | "model" | "config" | "test" | "other";

/** Where a judgment sentence came from — code alone is weaker than code+ADR. */
export type SourceKind = "code" | "readme" | "adr" | "comment" | "commit" | "test";

export interface PortfolioProjectMeta {
  /** Stable project slug, e.g. "compounding-quality". Namespaces ids + ties. */
  key: string;
  label: string;
  /** 1–2 sentences: what the project is. */
  summary?: string;
  roleTracks?: RoleTrack[];
}

/** One defensible file/module → one Defense card. */
export interface PortfolioFile {
  /** Repo-relative path. The ground-truth anchor; cross-checked against inventory. */
  path: string;
  /** Display title (basename is fine). Stable-id source. */
  title: string;
  language?: string;
  role?: FileRole;
  /** → FileDefenseItem.why (one sentence). */
  responsibility?: string;
  /** → FileDefenseItem.terminology (joined with " · "). */
  terminology?: string[];
  /** → the say-cold line. Speakability-capped on ingest (~40 words). */
  interviewLine?: string;
  /** Integration seam (network/subprocess/db/external) — best defense + tie material. */
  boundary?: boolean;
  /** On a critical path → counts toward the readiness defense floor. */
  core?: boolean;
  roleTrack?: RoleTrack;
  /** CS concepts this file demonstrates — the keys the tie join uses. */
  concepts?: string[];
  /** Cited symbols within `path` that ground the claims (anti-hallucination). */
  evidence?: string[];
  /** 0..1 model confidence in the prose fields. Low → deterministic fallback. */
  confidence?: number;
  provenance?: SourceKind[];
}

/**
 * Concept → code-site edge. Powers `tie` generation: a QBank question names a
 * concept, this maps it to a concrete place in your code with a grounded claim.
 */
export interface PortfolioConceptSite {
  /** Concept slug, e.g. "discriminated-union". Matched against question concepts. */
  concept: string;
  /** Must reference a surviving PortfolioFile.path, else dropped as dangling. */
  filePath: string;
  /** The tie fragment: how this site exemplifies the concept. */
  claim: string;
  /** 0..1 — how strongly the site demonstrates the concept (ranks candidates). */
  strength?: number;
}

/** The whole hand-off for one project. */
export interface PortfolioHandoff {
  project: PortfolioProjectMeta;
  files: PortfolioFile[];
  concepts?: PortfolioConceptSite[];
}

/** Enforced on ingest — not requests, hard caps. Speakability is load-bearing. */
export const LIMITS = {
  interviewLineMaxWords: 40,
  interviewLineMaxChars: 320,
  responsibilityMaxWords: 60,
  summaryMaxChars: 400,
  maxFiles: 400,
  maxConceptsPerFile: 12,
  minConfidence: 0.55,
} as const;

/** Normalized, trusted output of the ingest boundary. */
export interface CleanProject {
  project: Required<Pick<PortfolioProjectMeta, "key" | "label">> & {
    summary: string;
    roleTracks: RoleTrack[];
  };
  files: CleanFile[];
  concepts: PortfolioConceptSite[];
}

export interface CleanFile {
  id: string;
  path: string;
  title: string;
  role: FileRole;
  responsibility: string;
  terminology: string[];
  interviewLine: string;
  boundary: boolean;
  core: boolean;
  roleTrack: RoleTrack;
  concepts: string[];
  evidence: string[];
  confidence: number;
  provenance: SourceKind[];
}

/** Re-export the persisted target so callers import one place. */
export type { FileDefenseItem };

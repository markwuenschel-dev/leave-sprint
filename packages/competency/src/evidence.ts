/**
 * EVIDENCE MODEL AND WEIGHTING.
 *
 * The scoring spec already says how much a piece of evidence should be worth —
 * §10 evidence classes, §12 assistance, §17.5 evidence source, §17.7 LLM
 * independence, §17.10 staleness. None of it was ever applied. `evidenceWeight`
 * in the rubric package (packages/rubric/src/scoring.ts:39-42) computes the §10
 * multiplier and has no callers; `staleness` and `retention` are captured on every
 * entry and read by nothing; readiness (apps/waypoint/lib/readiness.ts:87-136) is
 * entirely date-blind, so a solid interview from three years ago counts exactly as
 * much as one from this morning.
 *
 * This module is where those five factors finally multiply together into a single
 * number, so that "assistance, LLM use, evidence strength, age, recurrence and
 * uncertainty affect readiness" is a property of the code and not of a document.
 *
 * Every factor lands in [0, 1] and none of them can zero out a scored attempt
 * except Class C, which the spec explicitly defines as not numerically scorable.
 */

import { type CompetencyId } from './dimensions';

/** §10 retrospective evidence classes. Weights are verbatim from the spec table. */
export const EVIDENCE_CLASS_WEIGHT = {
  prospective: 1.0,
  classA: 0.75,
  classB: 0.4,
  classC: 0.0,
} as const;

export type EvidenceClassId = keyof typeof EVIDENCE_CLASS_WEIGHT;

export function isEvidenceClassId(v: unknown): v is EvidenceClassId {
  return typeof v === 'string' && v in EVIDENCE_CLASS_WEIGHT;
}

/**
 * §12 assistance levels 0–5, expressed as an autonomy multiplier.
 *
 * The spec states the *consequences* qualitatively ("A3 cannot establish clean
 * Level II independence") rather than giving numbers. These are the local
 * calibration of that language: A0/A1 is full autonomy evidence, A2 dents
 * confidence, A3 breaks Level II independence, A4–A5 cannot establish independent
 * competency at all — but still describe something that happened, so they retain a
 * small floor rather than going to zero.
 */
export const ASSISTANCE_FACTOR: Record<number, number> = {
  0: 1.0,
  1: 1.0,
  2: 0.85,
  3: 0.6,
  4: 0.35,
  5: 0.2,
};

export function assistanceFactor(level: number | null | undefined): number {
  if (level == null || !Number.isFinite(level)) return 1.0;
  const clamped = Math.max(0, Math.min(5, Math.round(level)));
  return ASSISTANCE_FACTOR[clamped] ?? 1.0;
}

/** §17.7 LLM independence signals, as captured on a grade. */
export interface LlmSignals {
  used?: boolean;
  implementationGenerated?: boolean;
  testsGenerated?: boolean;
  answerDrafted?: boolean;
  reproducedWithout?: boolean;
  explainedWithout?: boolean;
}

/**
 * §17.7: "LLM use does not automatically invalidate an assessment; LLM-generated
 * implementation, tests, or answer text lowers autonomy evidence;
 * `reproducedWithoutLLM` and `explainedWithoutLLM` are stronger than merely
 * claiming understanding."
 *
 * So: mere use is a small discount, generated *artefacts* are a large one, and
 * demonstrated independent reproduction earns most of it back.
 */
export function llmFactor(llm: LlmSignals | null | undefined): number {
  if (!llm || llm.used !== true) return 1.0;
  let f = 0.85;
  if (llm.answerDrafted === true) f = Math.min(f, 0.5);
  if (llm.implementationGenerated === true) f = Math.min(f, 0.5);
  if (llm.testsGenerated === true) f *= 0.85;
  // Recovery: proving it unaided afterwards is the whole point of the five-pass model.
  if (llm.reproducedWithout === true) f *= 1.2;
  if (llm.explainedWithout === true) f *= 1.15;
  return Math.max(0, Math.min(1, f));
}

/**
 * §17.5 evidence source strength. "Live coding, debugging transcripts, repo
 * evidence, human mock interviews, and real interview feedback usually carry
 * stronger readiness evidence than polished written answers."
 */
export const SOURCE_STRENGTH: Record<string, number> = {
  'real interview feedback': 1.0,
  'mock interview': 1.0,
  'live coding': 1.0,
  'debugging transcript': 1.0,
  'repo code': 0.95,
  'test results': 0.95,
  'human evaluator feedback': 0.95,
  'production artifact': 0.95,
  'project walkthrough': 0.9,
  'take-home coding': 0.9,
  'commit history': 0.85,
  'metric or dashboard': 0.85,
  'verbal answer': 0.85,
  'README or design doc': 0.75,
  'written answer': 0.75,
};

/** Neutral default when a grade records no source, which is the common case today. */
export const DEFAULT_SOURCE_STRENGTH = 0.85;

/** Strongest listed source wins — one live-coding artefact is not weakened by also having notes. */
export function sourceFactor(sources: readonly string[] | null | undefined): number {
  if (!sources || sources.length === 0) return DEFAULT_SOURCE_STRENGTH;
  let best = 0;
  for (const s of sources) {
    const key = s.toLowerCase().trim();
    // hasOwn: `evidenceSource` is a free string[] on the entry, so an unlucky
    // value must not resolve to an inherited Object.prototype member.
    if (!Object.hasOwn(SOURCE_STRENGTH, key)) continue;
    const v = SOURCE_STRENGTH[key];
    if (v != null && v > best) best = v;
  }
  return best > 0 ? best : DEFAULT_SOURCE_STRENGTH;
}

/**
 * §17.10 staleness. The spec gives bands (0–14 Low, 15–45 Medium, 46+ High); a
 * step function would make readiness jump discontinuously on an arbitrary morning,
 * so this is a smooth exponential calibrated to pass through them: half-life 90
 * days puts day 14 at ≈0.90 (Low), day 45 at ≈0.71 (Medium), day 120 at ≈0.40 (High).
 *
 * The floor exists because decay models *current* retrievability, not history. An
 * attempt from two years ago is weak evidence about today, but it is not zero
 * evidence — it happened, and pretending otherwise would let readiness reset to
 * nothing after a quiet month.
 */
export const RECENCY_HALF_LIFE_DAYS = 90;
export const RECENCY_FLOOR = 0.2;

export function daysBetween(fromIso: string, toIso: string): number | null {
  const a = Date.parse(fromIso);
  const b = Date.parse(toIso);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.round((b - a) / 86_400_000);
}

export function recencyFactor(dateIso: string, asOfIso: string): number {
  const days = daysBetween(dateIso, asOfIso);
  // Unparseable or future-dated evidence is treated as fresh rather than dropped;
  // a bad date should not silently delete a real attempt from the graph.
  if (days == null || days <= 0) return 1.0;
  const decayed = Math.pow(0.5, days / RECENCY_HALF_LIFE_DAYS);
  return Math.max(RECENCY_FLOOR, decayed);
}

/** §17.10 band label, for display beside a decayed score. */
export type StalenessRisk = 'Low' | 'Medium' | 'High' | 'Unknown';

export function stalenessRisk(dateIso: string, asOfIso: string): StalenessRisk {
  const days = daysBetween(dateIso, asOfIso);
  if (days == null) return 'Unknown';
  if (days <= 14) return 'Low';
  if (days <= 45) return 'Medium';
  return 'High';
}

/**
 * §9.4 contribution weights. An assessment has one primary domain and up to two
 * secondary domains; the primary carries 60% of the influence, then 25%, then 15%.
 */
export const DOMAIN_CONTRIBUTION = [0.6, 0.25, 0.15] as const;

/** Position-based contribution weight; anything past the third domain contributes nothing. */
export function domainContribution(index: number): number {
  return DOMAIN_CONTRIBUTION[index] ?? 0;
}

/**
 * One assessed attempt, reduced to exactly what the competency graph needs.
 *
 * This is deliberately NOT `RubricEntry` (100+ fields, rubric/src/types.ts:40-167).
 * Keeping the package's input narrow is what keeps it pure and dependency-free; the
 * app owns the adapter that projects a RubricEntry onto this shape.
 */
export interface CompetencyEvidence {
  id: string;
  /** ISO date, `YYYY-MM-DD` or a full instant. */
  date: string;
  /** Final score 0–100. `null` means the attempt happened but was not scorable. */
  score: number | null;
  /**
   * Competencies the evidence explicitly demonstrates. Strongest channel — use it
   * whenever the source actually knows, rather than leaving it to inference.
   */
  competencies?: CompetencyId[];
  taskType?: string | null;
  /** §9.4 ordered domains: index 0 is primary, 1 and 2 are secondary. */
  domains?: string[];
  evidenceClass?: EvidenceClassId | null;
  assistanceLevel?: number | null;
  llm?: LlmSignals | null;
  /** §17.5 evidence sources. */
  sources?: string[];
  /** §17.6 — a retest reproduced without notes is stronger than a same-day correction. */
  reproducedWithoutNotes?: boolean;
  /** §17.13 — how much recurrence this gap has shown; drives prioritisation, not score. */
  recurrenceCount?: number;
  /** Free label for tracing a competency score back to the thing that produced it. */
  label?: string;
}

/** The multiplicative factors behind one evidence item's weight, kept for explainability. */
export interface EvidenceWeightBreakdown {
  evidenceClass: number;
  assistance: number;
  llm: number;
  source: number;
  recency: number;
  total: number;
}

/**
 * The single place the five spec factors combine.
 *
 * Returned as a breakdown rather than a bare number so the UI can answer "why is
 * this only worth 0.31?" without re-deriving anything — an honest model has to be
 * able to show its work.
 */
export function weighEvidence(e: CompetencyEvidence, asOfIso: string): EvidenceWeightBreakdown {
  const cls = e.evidenceClass ? EVIDENCE_CLASS_WEIGHT[e.evidenceClass] : 1.0;
  const assist = assistanceFactor(e.assistanceLevel);
  const llm = llmFactor(e.llm);
  const src = sourceFactor(e.sources);
  const rec = recencyFactor(e.date, asOfIso);
  return {
    evidenceClass: cls,
    assistance: assist,
    llm,
    source: src,
    recency: rec,
    total: cls * assist * llm * src * rec,
  };
}

/**
 * GAP KINDS — the goal's five families, mapped from the spec's eleven `GAP_TYPES`
 * (packages/rubric/src/diagnostics.ts:35).
 *
 * The goal asks to distinguish conceptual, vocabulary/retrieval, application,
 * communication and execution gaps. A sixth bucket exists because 'Evidence quality
 * gap' is not a gap in the candidate at all — it says the *record* is too thin to
 * score — and folding it into one of the five would misattribute a bookkeeping
 * problem to a skill problem.
 */
export type GapKind =
  | 'conceptual'
  | 'retrieval'
  | 'application'
  | 'communication'
  | 'execution'
  | 'record'
  | 'unclassified';

const GAP_TYPE_KIND: Record<string, GapKind> = {
  'conceptual gap': 'conceptual',
  'mechanism gap': 'conceptual',
  'recall gap': 'retrieval',
  'application gap': 'application',
  'tradeoff gap': 'application',
  'scope gap': 'application',
  'communication gap': 'communication',
  'requirements translation gap': 'communication',
  'verification gap': 'execution',
  'autonomy gap': 'execution',
  'evidence quality gap': 'record',
};

/**
 * Weakness tags that carry gap-kind signal. §17.1 draws the line clearly:
 * weaknessTags describe the symptom, knowledgeGapTags the missing knowledge — and
 * the vocabulary/retrieval family lives almost entirely in the tag vocabulary
 * (referenceData.ts:345-352), because no `GAP_TYPES` member covers it.
 */
const WEAKNESS_TAG_KIND: Record<string, GapKind> = {
  'terminology imprecision': 'retrieval',
  'definition gap': 'retrieval',
  'interview phrasing gap': 'communication',
  'incomplete execution': 'execution',
};

export function classifyGap(tag: string): GapKind {
  const k = tag.toLowerCase().trim();
  // Tags are an open vocabulary — `normalizeTags` passes unmapped values straight
  // through (packages/rubric/src/aliases.ts:130-139) — so these lookups are guarded.
  if (Object.hasOwn(GAP_TYPE_KIND, k)) return GAP_TYPE_KIND[k];
  if (Object.hasOwn(WEAKNESS_TAG_KIND, k)) return WEAKNESS_TAG_KIND[k];
  return 'unclassified';
}

/** Tally gap kinds across every tag on an attempt. Unclassified tags are counted, not dropped. */
export function tallyGapKinds(tags: readonly string[]): Record<GapKind, number> {
  const out: Record<GapKind, number> = {
    conceptual: 0,
    retrieval: 0,
    application: 0,
    communication: 0,
    execution: 0,
    record: 0,
    unclassified: 0,
  };
  for (const t of tags) out[classifyGap(t)] += 1;
  return out;
}

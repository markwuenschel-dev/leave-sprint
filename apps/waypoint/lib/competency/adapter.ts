/**
 * RubricEntry → CompetencyEvidence.
 *
 * @waypoint/competency deliberately does not know what a `RubricEntry` is — it
 * takes a narrow 12-field input so it can stay pure and dependency-free. This is
 * the projection from the 100+ field record (packages/rubric/src/types.ts:40-167)
 * onto that input, and it is the only place the two vocabularies meet.
 *
 * What matters here is that the fields the spec always intended to matter, and
 * which nothing has ever read, finally reach a consumer:
 *
 *   evidenceClass     §10  — computed by scoring.ts:39-42, zero callers until now
 *   assistanceLevel   §12  — stored, only ever displayed
 *   llmIndependence   §17.7 — only `llmUsed` was read (readiness.ts:80)
 *   evidenceSource    §17.5 — stored, never read
 *   date              §17.10 — readiness has always been date-blind
 *
 * A caveat worth stating plainly: `intakeObservations` writes about 15 of those
 * 100+ fields (packages/rubric/src/observations.ts), so AI-graded entries arrive
 * with `evidenceSource` empty and `staleness`/`retention` null. The adapter is
 * built to degrade to sensible neutrals rather than to punish a thin record — an
 * absent source scores DEFAULT_SOURCE_STRENGTH, not zero.
 */

import type { CompetencyEvidence, EvidenceClassId } from "@waypoint/competency";
import { isEvidenceClassId } from "@waypoint/competency";
import type { RubricEntry } from "@waypoint/rubric";

/** §9.4 allows one primary plus two secondary domains; anything past that contributes 0. */
const MAX_DOMAINS = 3;

/**
 * Ordered domain list for the §9.4 positional weights (60% / 25% / 15%).
 *
 * `primaryDomain` is preferred over `domain`, matching how normalize.ts:152 fills
 * it (`str(raw.primaryDomain) || str(raw.domain)`), and duplicates are dropped so a
 * row that repeats its primary in `secondaryDomains` cannot inflate itself.
 */
export function orderedDomains(e: RubricEntry): string[] {
  const out: string[] = [];
  const push = (d: string | null | undefined) => {
    const v = (d ?? "").trim();
    if (!v) return;
    if (out.includes(v)) return;
    out.push(v);
  };
  push(e.primaryDomain);
  push(e.domain);
  for (const d of e.secondaryDomains ?? []) push(d);
  return out.slice(0, MAX_DOMAINS);
}

function evidenceClassOf(e: RubricEntry): EvidenceClassId | null {
  return isEvidenceClassId(e.evidenceClass) ? e.evidenceClass : null;
}

/** Every gap-bearing tag on an entry, for gap-kind classification. */
export function gapTagsOf(e: RubricEntry): string[] {
  return [...(e.gapTypes ?? []), ...(e.weaknessTags ?? [])];
}

/**
 * How many times this weakness has recurred.
 *
 * Prefers the explicit §17.13 counter when present; falls back to `attemptNumber`,
 * because a fourth attempt at the same thing is itself recurrence evidence. Never
 * synthesises a count from tag repetition — that is `missClusters`' job
 * (apps/waypoint/lib/study.ts:135-161) and duplicating it here would double-count.
 */
function recurrenceOf(e: RubricEntry): number | undefined {
  const prior = e.gapRecurrence?.priorOccurrences;
  if (typeof prior === "number" && Number.isFinite(prior)) return prior;
  if (typeof e.attemptNumber === "number" && e.attemptNumber > 1) return e.attemptNumber - 1;
  return undefined;
}

/**
 * §17.6 — "a retained answer reproduced without notes is stronger evidence than a
 * same-day correction."
 */
function reproducedWithoutNotes(e: RubricEntry): boolean | undefined {
  const v = e.retention?.reproducedWithoutNotes;
  return typeof v === "boolean" ? v : undefined;
}

export function entryToEvidence(e: RubricEntry): CompetencyEvidence {
  const cls = evidenceClassOf(e);
  const recurrence = recurrenceOf(e);
  const reproduced = reproducedWithoutNotes(e);

  return {
    id: e.id || e.assessmentId,
    date: e.date,
    // `finalScore` is a plain number on the type but imported history is lenient
    // (normalize.ts type-checks only present fields), so a non-finite value is
    // treated as unscored rather than poisoning an average with NaN.
    score: Number.isFinite(e.finalScore) ? e.finalScore : null,
    taskType: e.taskType || null,
    domains: orderedDomains(e),
    evidenceClass: cls,
    assistanceLevel: typeof e.assistanceLevel === "number" ? e.assistanceLevel : null,
    llm: e.llmIndependence
      ? {
          ...(e.llmIndependence.llmUsed != null ? { used: e.llmIndependence.llmUsed } : {}),
          ...(e.llmIndependence.implementationGeneratedByLLM != null
            ? { implementationGenerated: e.llmIndependence.implementationGeneratedByLLM }
            : {}),
          ...(e.llmIndependence.testsGeneratedByLLM != null
            ? { testsGenerated: e.llmIndependence.testsGeneratedByLLM }
            : {}),
          ...(e.llmIndependence.answerDraftedByLLM != null
            ? { answerDrafted: e.llmIndependence.answerDraftedByLLM }
            : {}),
          ...(e.llmIndependence.reproducedWithoutLLM != null
            ? { reproducedWithout: e.llmIndependence.reproducedWithoutLLM }
            : {}),
          ...(e.llmIndependence.explainedWithoutLLM != null
            ? { explainedWithout: e.llmIndependence.explainedWithoutLLM }
            : {}),
        }
      : null,
    sources: e.evidenceSource ?? [],
    ...(reproduced != null ? { reproducedWithoutNotes: reproduced } : {}),
    ...(recurrence != null ? { recurrenceCount: recurrence } : {}),
    ...(e.task ? { label: e.task } : {}),
  };
}

export function entriesToEvidence(entries: readonly RubricEntry[]): CompetencyEvidence[] {
  return entries.map(entryToEvidence);
}

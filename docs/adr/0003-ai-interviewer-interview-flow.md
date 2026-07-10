---
status: accepted
---

# AI Interviewer: interview flow (sourcing, cadence, sessions)

Context: How the interviewer sources questions, when a grade lands, and how a
session is scoped. Builds on ADR-0001 (evidence policy) and ADR-0002 (providers).

Decision:

- **Hybrid sourcing.** A curated spine from the existing Q-bank tracks (coverage of
  "all question forms per role") plus adaptive LLM follow-ups the canned
  `l2q`/`l3q`/`trap` ladder can't anticipate, plus the optional multi-model
  candidate-question slate (ADR-0002).
- **Per-question cadence.** One rubric entry per question, emitted as-we-go after
  the question and its probing resolve, grouped by `sessionId` (reusing
  `attemptGroupId` / `parentAssessmentId`). `evidenceClass: 'prospective'`/`'classA'`
  (live capture) — weightier than a `classB` quick-log. A session rollup, if wanted,
  is *derived*, not emitted.
- **User-directed sessions, coverage-default + gap injection.** You choose the scope
  (a role, a single track, or "due retests"); a coverage session walks un-asked forms
  for the role but front-loads due-retest/gap items (reusing `activeRetestQueue`). You
  set termination (N questions or "until I stop").
- **Scope = track-backed roles** SWE / MLE / DS / DE (BIE/BIA/other have no Q-bank tracks).
- **Answers are unaided by default** (`llmIndependence.llmUsed: false`): the examiner
  probes but never feeds the answer mid-grade; post-grade teaching is encouraged. An
  explicit **coaching mode** (help during the answer) stamps `llmUsed: true` and lowers
  evidence weight, so the floor is never inflated by a half-answered session.

## Consequences

- Coverage is tracked at the question/track level, not exact wording — probing varies
  by design (anti-memorization).
- Reuses existing infrastructure: `QB_TRACK_MAP`, `activeRetestQueue`, the
  `normalize`/`derive` scoring pipeline, `validateMonotonic`, and the rubric's
  `assessmentMode` / `calibration` / `evidenceSource` fields.
- Because grades are ordinary `rubricEntries`, gaps / retest / performance / readiness
  light up with no rework (ADR-0001).

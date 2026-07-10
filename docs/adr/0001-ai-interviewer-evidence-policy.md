---
status: accepted
---

# AI Interviewer: evidence policy

Context: We're adding an LLM interviewer that conducts knowledge-probing
interviews across the Q-bank tracks per target role and produces rubric grades
(see `CONTEXT.md` → AI Interviewer). Two decisions govern how those AI-produced
grades relate to the rest of the system.

Decision:

1. **AI-graded evidence counts everywhere, including the readiness floor.** An AI
   mock that scores solid can move evidence-green, exactly like a human-scored
   session — chosen for velocity over gate-purity. Provenance is still recorded
   (`calibration.evaluatorType = 'AI grader'`), so the policy can be tightened
   later without losing data.
2. **The LLM emits observations, not scores.** It outputs only the
   `loggingMode: 'fast'` surface — controlling sub-scores, gate pass/fail,
   weakness/gap tags, provenance, and a calibration confidence — and the existing
   deterministic engine derives `finalScore`, levels, and verdicts, with
   `validateMonotonic` rejecting incoherent grades.

## Considered options

- **Readiness (rejected):** AI grades feed analytics only; the floor requires
  `humanReviewed = true`. Higher integrity, slower green. Rejected for velocity.
- **Emission (rejected):** the LLM emits the finished grade. Simpler prompt, but
  it bypasses deterministic scoring and rests the floor's integrity on the
  model's arithmetic and self-consistency.

## Consequences

- Because AI grades gate the floor (decision 1), grading fidelity is
  load-bearing; decision 2 is the mitigation — the LLM is confined to dimension
  judgment while the engine + `validateMonotonic` own the arithmetic and coherence.
- AI grades ride the same scoring rails as manual grades, so they are directly
  comparable in gaps / retest / performance.
- `evaluatorType` / `humanReviewed` stay recorded on every entry, so a future ADR
  can restrict floor-eligibility to human-reviewed evidence without a migration.

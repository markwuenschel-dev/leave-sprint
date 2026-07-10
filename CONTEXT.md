# Domain glossary

## Waypoint

The personal career transition hub product (successor identity to Leave Sprint Twin). Arc: readiness rebuild (**phase B**), then land a role (**phase A**). Code slug: `waypoint` (`apps/waypoint`, `@waypoint/*`). Not a leave-sprint countdown product.

## Local-first

Data and app sovereignty — your assessment data lives in embedded PGlite on your own server/machine, owned by you, with no third-party host of record. It is **not** offline-purity: the app may make server-side calls to external services (e.g., the AI Interviewer's chosen LLM provider, keys never exposed to the browser), but your data stays yours.

## Leave Sprint Twin

Archived predecessor dashboard for a fixed 29-day leave sprint. Not a living product; reference/import source only.

## Phase B / Phase A

**Phase B** — readiness rebuild. **Phase A** — active role search / applications. Arc is B then A.

## Hybrid gate / evidence floor

**Evidence green** means the checkable floor is met: practice solidity (~80% Solid on a core list), interview performance (≥2 solid mocks or scored sessions), and core stories/file defense cold — for **both** primary roles (SWE Full Stack II and MLE II). Secondary and escape roles do not block. Applications, network, resume polish, and full-bank completion are not floor criteria. Crossing evidence green does not auto-start Phase A; the human still decides the go/no-go.

## AI Interviewer

An LLM-driven examiner that probes knowledge across the Q-bank tracks and produces rubric grades. It is an **augmenting** evidence source, not the source of truth: its grades enter the rubric record and flow into gaps, retest, and readiness like any grade, while manual grading and the mastered→log bridge remain. One selected provider is **active per session** and plays the whole role — ask, probe, grade — with your answers **unaided by default**. Every grade carries **provenance**: which model asked, which graded. Not the same as the **Interview** shell tab (a nav surface) or a human mock.

## Coaching mode

An opt-in AI Interviewer mode where the model helps you *during* the answer (hints, scaffolding) rather than only examining. It stamps `llmIndependence.llmUsed: true` and lowers the evidence weight, keeping the readiness floor honest. Distinct from **post-grade teaching** — feedback after a grade lands, which does not affect evidence.

## Observations

The raw judgment surface the AI Interviewer emits per question — the six universal sub-scores, the three level scores (L1/L2/L3), the task-specific score, gate verdicts, and diagnostics (enum-constrained gap type + severity; prompt-steered gap/weakness tags). Deliberately only the **inputs**: the deterministic rubric engine derives the grade (final score, demonstrated/qualifying level, verdicts) from them, with monotonicity validation. Distinct from the derived grade — the model judges, the engine scores.

## Rhythm

Waypoint cadence is a **rolling daily checklist** plus a **weekly review** (not a fixed 29-day leave plan). Phase B daily disciplines: **Practice**, **Defense**, **Interview reps**, **Admin light**. Phase A uses the same four, weighted toward applications inside Admin light and weekly review. Completing rhythm checkboxes is not the same as meeting the evidence floor.

## Twin import

Optional one-shot (not required if starting clean / not using twin data): practice progress and full rubric history only. Twin scaffolding may remain in the repo; twin is not the live product. Days/stages/meta out.

## Application

A pipeline row is one **role + company** pursuit, with `targetRole` and a short status set (wishlist → applied → interviewing → offer | rejected | withdrawn). Not a CRM.

## Waypoint shell

Primary nav: Today, Readiness, Practice, Defense, Interview, Applications, Weekly, More. Hybrid gate lives on Readiness. Monorepo: `apps/waypoint`, `@waypoint/rubric`, `@waypoint/qbank`, `@waypoint/practice-types`.

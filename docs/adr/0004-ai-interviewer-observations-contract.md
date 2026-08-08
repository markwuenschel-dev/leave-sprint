---
status: accepted
---

# AI Interviewer: observations contract

Context: ADR-0001 decided the LLM emits *observations* and the deterministic
rubric engine scores. This ADR pins the exact contract — which fields the LLM
fills, which the engine derives, how provenance and confidence are stored, and
what JSON-Schema shape works across all four providers (Wayfinder #17, grounded
in the #16 provider research). Terms: `CONTEXT.md` → Observations.

## Decision

### 1. Emission surface — per-dimension

The LLM emits, per question:

- **`universalSubScores`** — the six universal competency dimensions.
- **`levelScores { L1, L2, L3 }`** — 0–100 per difficulty level.
- **`taskSpecificScore`** — 0–100.
- **`gates`** — verdicts (`Pass` / `Partial` / `Fail`), incl. Correctness.
- diagnostics + tags (§2), provenance (§3), confidence (§4).

The engine **derives** (because the LLM omits them): `universalScore`
(`= subTotal(subs)`), `rawScore`, `finalScore`, `answerLevel`,
`qualifyingDemonstratedLevel`, `demonstratedLevel`, `levelVerdicts` — via
`normalize`/`derive`, with `validateMonotonic` guarding `L3 ≤ L2 ≤ L1`.
Classification (`taskType`, `domain`, `primaryRole`, `problemLevel`,
`difficulty`) comes from the Q-bank question + `QB_TRACK_MAP`; `assistanceLevel`
defaults to 0 (unaided). The LLM supplies **only judgment** — the same input
surface as a full manual grade, so AI and manual grades stay comparable.

### 2. Diagnostics & tags

- **Small controlled sets → schema `enum`:** `gates` (Pass/Partial/Fail),
  `gapTypes` (11), `priority.severity` (Low→Critical), `priority.nextActionType`
  (7), `gapClosureStatus` (5). `severity` is an LLM judgment (not score-derived).
- **Large open vocab → soft constraint:** `knowledgeGapTags` / `weaknessTags`
  stay a free `array<string>`; the **prompt injects the track's existing tags**
  (from `KGTAG_CLUSTERS`) and steers reuse; genuinely-new tags go to
  `proposedNewTags`, not inline. Keeps board grouping meaningful without an
  unbounded enum.

### 3. Provenance — typed fields on existing sub-objects

- `calibration.evaluatorType = 'AI grader'` (existing — the "is-AI" flag).
- **New optional** `calibration.graderModel` (e.g. `claude-opus-4-8`).
- **New optional** `assessmentMode.questionSource` (`qbank` | `generated:<model>`
  | `slate:<model>`), beside `assessmentMode.mode = 'mock interview'`.

Two additive, backward-compatible fields — typed and directly filterable for the
ADR-0002 model-provenance analytics filter. No migration (existing rows valid
without them); chosen over overloading `evidenceSource` (semantically off,
string-parsing fragile) or `extra` (hidden from the schema).

### 4. Confidence — recorded, not gating

LLM emits `calibration.calibrationConfidence` (High/Medium/Low) **and**
`scoreUncertainty { range, reason }`. Recorded for spot-checking and a future
tightening hook; it does **not** gate — ADR-0001 choice A counts AI grades
regardless of confidence.

### 5. JSON-Schema shape — provider intersection; engine enforces validity

The schema targets the intersection all four providers' structured output
supports (Anthropic + OpenAI/Grok are the floor): only `type` / `properties` /
`required` / `enum` / `items` / `anyOf` / `description`, with
`additionalProperties: false` and **every property in `required`** (optional
modeled as nullable, per OpenAI strict). **No** `minimum`/`maximum`,
`minLength`/`maxLength`, `multipleOf`, `pattern`, or `format`.

Because the schema can't express ranges or monotonicity, the **engine** enforces
validity, with a **tiered violation policy**:

- **Presence** *(added 2026-08-08 — see §6)* → the response is checked against
  `OBSERVATIONS_JSON_SCHEMA` itself before anything is scored
  (`checkObservations` / `assertObservations` in `packages/rubric/src/observations.ts`).
  A required property that is **absent, null, or the wrong JSON type** is a **hard
  reject**: `ObservationsValidationError`, never a coerced zero. A malformed *array
  item* and an undeclared property are non-fatal — dropped and reported through
  `IntakeResult.droppedTags`, because array elements are independent observations
  and one bad element must not void a whole interview.
- **Score ranges** → clamp silently to 0–100.
- **Monotonicity** (`validateMonotonic` fails) → reject + **one retry** with the
  violation fed back; if still failing, accept but force
  `calibrationConfidence: 'Low'` + flag (never lose the interview).
- **Tags** → `enum` blocks off-vocab on compliant providers; slip-throughs on the
  **small controlled sets** (`gates`, `gapTypes`, `severity`, `nextActionType`,
  `proposedNewTags.tagClass`) are coerced — unknown values are dropped or fall back
  to a safe default, and every removal is listed in `IntakeResult.droppedTags`.
  The **large open vocabularies** (`knowledgeGapTags`, `weaknessTags`) are passed
  through inline after alias normalization; the engine does **not** re-route them to
  `proposedNewTags`. See §6.

### 6. Amendments (2026-08-08)

Two clauses of §5 were prose with no executable counterpart and had drifted from
the code. Both are now pinned by `packages/rubric/src/observations.test.ts` and
`apps/waypoint/lib/llm/types.test.ts`, so a future divergence fails the suite
instead of sitting undetected in the doc.

**(a) Presence was never enforced — added.** §5 delegated validity to provider-side
structured output and covered ranges, monotonicity and enums, but never *presence*.
`parseObservations` cast the response (`JSON.parse(json) as Observations`), `num()`
mapped anything non-finite to 0, and `normalize.ts`'s `subsTotal ?? 0` cannot
distinguish an absent sub-score block from a real zero — because
`RubricEntry.universalScore` is a non-null `number` that `computeRaw` consumes.
Composed, an omitted block produced `universalScore: 0`, a level ladder of 0/0/0
that **passes** the monotonicity check, empty gates and empty `droppedTags`: a
persisted record byte-identical to a candidate who genuinely scored nothing, feeding
promotion evidence and the readiness floor. Structured output is a *request*, not a
guarantee (refusals, truncation, fallback paths), so the response is now validated at
the parse boundary against the same schema object the adapters send — not a second,
driftable contract. The failure is loud (`ObservationsValidationError`, listing the
offending paths) and attributable: a caller can tell "the model returned garbage"
from "the candidate scored 0".

**(b) Free-tag routing to `proposedNewTags` — superseded, not implemented.** §5
originally said off-vocabulary free tags would be routed to `proposedNewTags` by the
engine. That is *not* what was built, and the implementation is the right side:

1. **There is no closed vocabulary to test membership against.** §2 deliberately
   keeps `knowledgeGapTags` / `weaknessTags` an open vocabulary under a *soft*
   constraint. `aliases.ts` is a retired→canonical rewrite map, not a membership
   list, and `KGTAG_CLUSTERS` is a dashboard rollup, not an authority. Auto-routing
   would require inventing the closed enum §2 explicitly rejected.
2. **A `ProposedNewTag` carries a required `reason`** (and an optional
   `nearestExistingTag`). Only the model can author those honestly; an engine-side
   router would have to fabricate them, producing proposals no human can review.
3. **Auto-routing loses signal.** A re-routed tag disappears from the entry's
   `knowledgeGapTags`, silently degrading cluster analytics and the practice-gap view
   for the sake of tidiness.
4. **The steering already happens where the judgment lives** — the prompt injects the
   track's existing tags (`buildGradeInput`'s `knownTags`,
   `apps/waypoint/lib/interview/prompt.ts:48-50`), and the model decides. `normalizeTags` on ingest is the whole of the engine-side soft
   constraint, and unmapped tags pass through by design.

`droppedTags` therefore covers exactly the small controlled sets plus schema-level
removals. It is returned to the client on every grade; a grading UI **must** render
it, or the observability this tier exists for observes nothing.

## Consequences

- Adds two optional fields to `@waypoint/rubric` (`calibration.graderModel`,
  `assessmentMode.questionSource`) — backward-compatible.
- The observations JSON Schema is authored once against the intersection subset
  and reused by every provider adapter (the seam's normalization target).
- Implementation is downstream work (schema + intake wiring, then the provider
  seam) — see the Wayfinder map's frontier.
- §6(a) makes `parseObservations` and `intakeObservations` **throwing** functions.
  `ObservationsValidationError` is exported from `@waypoint/rubric`; any caller that
  grades must catch it and surface it as a grading failure, never persist a partial
  result. `/api/interview` already wraps the grade call and answers `502` with the
  message. A degraded model response is now a visible error instead of a silent
  all-zero grade — the intended trade: lose the turn, not the record's meaning.

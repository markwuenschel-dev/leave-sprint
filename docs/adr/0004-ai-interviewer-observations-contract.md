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

- **Score ranges** → clamp silently to 0–100.
- **Monotonicity** (`validateMonotonic` fails) → reject + **one retry** with the
  violation fed back; if still failing, accept but force
  `calibrationConfidence: 'Low'` + flag (never lose the interview).
- **Tags** → `enum` blocks off-vocab on compliant providers; slip-throughs are
  coerced (drop unknown small-enum values; route unknown free tags to
  `proposedNewTags`).

## Consequences

- Adds two optional fields to `@waypoint/rubric` (`calibration.graderModel`,
  `assessmentMode.questionSource`) — backward-compatible.
- The observations JSON Schema is authored once against the intersection subset
  and reused by every provider adapter (the seam's normalization target).
- Implementation is downstream work (schema + intake wiring, then the provider
  seam) — see the Wayfinder map's frontier.

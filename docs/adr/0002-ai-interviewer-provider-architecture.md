---
status: accepted
---

# AI Interviewer: pluggable multi-provider LLM, server-side

Context: The AI Interviewer needs a frontier LLM to conduct and grade interviews.
The app was described as "local-first / no cloud host"; this feature is the first
to require an external model. See `CONTEXT.md` → AI Interviewer, Local-first.

Decision:

- **User-selectable, pluggable provider** — Claude, GPT-5.6, Grok, or Gemini —
  behind a thin provider seam that normalizes each vendor's structured-output
  mechanism (Anthropic tool-use, OpenAI structured outputs, Gemini
  `responseSchema`, Grok's OpenAI-compatible API) to our observations schema.
- **One provider is active per session** and plays the entire role — ask, probe,
  grade. Trust parity: the selected model's grade counts toward the floor like any
  other (ADR-0001). No anchor-grader, no ensemble.
- Calls happen **server-side** (a new `/api/interview` route); each provider's API
  key lives server-side beside `DATABASE_URL` / `APP_TOKEN`, never exposed to the
  browser.
- **"Local-first" is redefined as data & app sovereignty**, not offline-purity —
  your data stays in your PGlite; the LLM is a called service, not a host of record.
- Provenance is recorded on **two axes** per grade: *question author*
  (`qbank` | active-model | `slate:<model>`) and *grader* (the active model,
  stamped by exact model id). `calibration.evaluatorType: 'AI grader'` marks all of them.

## Considered options

- **Single provider (Claude only)** — simpler, rejected: you want provider choice.
- **Local model (Ollama)** — offline + free, rejected: weak grading would poison
  the floor under ADR-0001's "AI grades count" policy.
- **Anchor-grader / ensemble** for comparability — rejected for a single-user tool;
  trust parity + stamped model id gives an audit trail and a future tightening path.

## Consequences

- Four API integrations + four keys; the provider seam is the main added complexity.
- Optional **candidate-question slate**: on demand, all four models each propose one
  question and you pick — 4 calls per use, a deliberate button, not the default path.
- Cross-model grade variance is accepted as noise; the stamped model id lets you
  notice and filter if one model runs lenient.

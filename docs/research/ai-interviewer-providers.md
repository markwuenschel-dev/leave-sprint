# AI Interviewer — provider integration facts

Research for [Wayfinder #16](https://github.com/markwuenschel-dev/leave-sprint/issues/16). Sources: `claude-api` skill (Anthropic, authoritative) + Context7 (OpenAI, xAI, Google) as of 2026-07-10. This is a Node/TypeScript (Next.js) app, so all bindings are the JS/TS SDKs.

## Summary table

| Provider | npm SDK | Client init | Model id(s) | Structured (JSON-schema) output | Env var | Streaming |
|---|---|---|---|---|---|---|
| **Anthropic (Claude)** | `@anthropic-ai/sdk` | `new Anthropic()` | `claude-opus-4-8` (default), `claude-sonnet-5`, `claude-haiku-4-5` | `output_config: { format: { type: "json_schema", schema } }`; or `messages.parse()`; or `strict: true` tool use | `ANTHROPIC_API_KEY` | `messages.stream()` → `.finalMessage()` |
| **OpenAI (GPT-5.6)** | `openai` | `new OpenAI()` | `gpt-5.6` *(verify — see caveats; cached docs show `gpt-5.5`)* | `response_format: { type: "json_schema", json_schema: { name, schema, strict: true } }`; or `chat.completions.parse()` / `responses.parse()` with `zodResponseFormat` | `OPENAI_API_KEY` | `stream: true` / `responses.stream()` |
| **xAI (Grok)** | `openai` (OpenAI-compatible) or native `xai-sdk` | `new OpenAI({ baseURL: "https://api.x.ai/v1", apiKey })` | `grok-4.3` (+ grok-4 family) | Same as OpenAI: `response_format: { type: "json_schema", json_schema: { name, schema, strict: true } }` | `XAI_API_KEY` | `stream: true` |
| **Google (Gemini)** | `@google/genai` *(new unified SDK; `@google/generative-ai` is deprecated)* | `new GoogleGenAI({ apiKey })` | `gemini-3-flash-preview`, `gemini-2.5-flash` / `-pro` | `config: { responseMimeType: "application/json", responseJsonSchema: {…} }` (JSON Schema subset) or `responseSchema` (OpenAPI subset); then `JSON.parse(response.text)` | `GEMINI_API_KEY` | `generateContentStream()` |

## Key finding for the provider seam (ties to #17)

**Three adapter shapes, not four:**

1. **OpenAI-compatible** — covers **both OpenAI and Grok** with the *same* `openai` SDK and `response_format: {type:"json_schema", …, strict:true}`. They differ only in `baseURL`, API key, and model id. Grok is a config of the OpenAI adapter.
2. **Anthropic** — `output_config.format` (or `messages.parse()`).
3. **Gemini** — `config.responseJsonSchema` (or `responseSchema`) + `JSON.parse(response.text)`.

All four: accept a **JSON Schema** for the observations contract, expose **streaming**, and key off a **single server-side env var**. The normalization point the seam targets is "constrained JSON matching our observations schema" — which is exactly what ADR-0001's observations-only design needs. The seam interface is roughly:

```ts
interface InterviewProvider {
  ask(ctx): Promise<{ question: string }>            // or stream
  grade(answer, rubricSchema): Promise<Observations> // JSON-schema-constrained
  readonly model: string                              // stamped as provenance
}
```

## Auth / config

- One env var per provider, all server-side (matches ADR-0002's `/api/interview` design; keys never reach the browser). Add to `.env.example`:
  `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `XAI_API_KEY`, `GEMINI_API_KEY`.
- A provider is "available" iff its key is set — the UI provider selector should reflect which keys are configured.

## Cost (rough, per 1M tokens in / out)

- Claude: Opus 4.8 `$5 / $25`, Sonnet 5 `$3 / $15`, Haiku 4.5 `$1 / $5`.
- OpenAI / Grok / Gemini: not fetched — check each provider's pricing page at build. An interview session is ~10–50k tokens → cents per session for a single user; negligible.

## Caveats — verify at build time (docs move fast; cutoff-sensitive)

- **GPT-5.6 model id:** the user specified `gpt-5.6`; Context7's cached OpenAI docs show `gpt-5.5` in examples. Confirm the exact string before shipping the OpenAI adapter.
- **Grok model id:** `grok-4.3` per current xAI docs — confirm latest.
- **Gemini flagship id:** docs show `gemini-3-flash-preview` and the 2.5 family; confirm the intended pro/flash id.
- **Structured-output strictness differs:** OpenAI/Grok honor `strict: true`; Gemini supports only a **subset** of JSON Schema (`$ref`, `type`, `enum`, `items`, `properties`, `required`, `anyOf`, … — no numeric/length constraints) via `responseJsonSchema`; Anthropic structured outputs are supported on Opus 4.8 / Sonnet 5 / Haiku 4.5. The observations schema (#17) should stay within the **intersection** of all four so one schema works everywhere.
- **Anthropic thinking/effort:** `thinking: { type: "adaptive" }` + `output_config: { effort: "high" }` are Anthropic-only knobs; the seam should treat per-provider tuning as adapter-local, not part of the shared interface.

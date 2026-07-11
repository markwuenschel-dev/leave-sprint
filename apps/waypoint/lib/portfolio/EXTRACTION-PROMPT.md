# LLM extraction prompts

Two passes. Run **Pass 1** once per project (against that repo). Run **Pass 2**
once over the QBank, reusing the concept slugs Pass 1 produced so the ties join.
Feed the outputs to me; I wire them in.

---

## Pass 1 — project → PortfolioHandoff JSON

> **Inputs to give the model:** the project's source, and the output of
> `git ls-files` as `ALLOWED_PATHS`. Without the path list it can't be grounded.

```
You are a senior engineer preparing interview defense material from a real codebase.
Read the project and emit ONE JSON object describing its most defensible files and
the CS concepts they demonstrate. This feeds an automated importer, so the output
must be valid JSON and obey every rule below.

INPUTS
- The project source (provided).
- ALLOWED_PATHS: the exact repo-relative file list. You may ONLY reference paths in
  this list. {{PASTE `git ls-files` HERE}}

OUTPUT — a single JSON object, no prose, no markdown fences:
{
  "project": {
    "key": "<stable-kebab-slug>",        // e.g. "compounding-quality"
    "label": "<human name>",
    "summary": "<=2 sentences: what it is and does",
    "roleTracks": ["SWE"|"MLE"|"DS"|"DE"|"BOTH"|"OTHER", ...]
  },
  "files": [ {
    "path": "<must be in ALLOWED_PATHS>",
    "title": "<short human title; basename is fine, keep it STABLE across runs>",
    "language": "<optional>",
    "role": "controller|dto|service|adapter|boundary|pure-fn|component|model|config|test|other",
    "responsibility": "<=60 words: why this file exists / the design decision it embodies",
    "terminology": ["pattern/concept keyword", ...],
    "interviewLine": "<=40 words, ONE spoken sentence you could say cold — the claim, no markdown>",
    "boundary": true|false,               // is it an integration seam (network/subprocess/db/external)?
    "core": true|false,                   // on a critical path / central to the story?
    "roleTrack": "SWE"|"MLE"|"DS"|"DE"|"BOTH"|"OTHER",
    "concepts": ["kebab-concept-slug", ...],   // CS concepts this file demonstrates
    "evidence": ["<real symbol/line in THIS file>", ...],  // grounds your claims
    "confidence": 0.0-1.0,                // honest; lower when inferring from code with no docs
    "provenance": ["code"|"readme"|"adr"|"comment"|"commit"|"test", ...]
  } ],
  "concepts": [ {                         // concept -> code-site edges; these build the "ties"
    "concept": "kebab-concept-slug",      // MUST reuse a slug from some file's "concepts"
    "filePath": "<must be one of the files above>",
    "claim": "<=60 words: how THIS site exemplifies the concept, in grounded specifics",
    "strength": 0.0-1.0                   // how strongly this site shows the concept
  } ]
}

RULES (the importer enforces these — violating them = your rows get dropped/flagged)
1. GROUND EVERYTHING. Every "path" must be in ALLOWED_PATHS verbatim. Every
   "concepts[].filePath" must match a file you listed. Never invent a path,
   symbol, or capability. If unsure it exists, leave it out.
2. SELECT, DON'T DUMP. Only files worth defending in an interview — boundaries,
   key services/adapters/models, design-bearing modules. Skip generated code,
   vendored deps, config noise, and trivial files. Aim for the 10-25 that tell
   the story, not every file.
3. SPEAKABILITY. "interviewLine" is spoken aloud in under ~90s: one plain
   sentence, <=40 words, no markdown, no lists. Put depth in "responsibility".
4. HONEST CONFIDENCE. If a claim rests only on reading code with no README/ADR/
   comment backing, set confidence <=0.5. Reserve >=0.8 for claims you could
   defend from explicit evidence. provenance must list the sources you actually used.
5. CONSISTENT SLUGS. concepts are lowercase-kebab (e.g. "dependency-inversion",
   "discriminated-union", "prefix-sum"). Reuse the SAME slug everywhere it applies.
6. ONE SITE PER REAL DEMONSTRATION. Only emit a concepts[] edge when the file
   genuinely and specifically demonstrates that concept. No aspirational ties.
7. STABLE TITLES. The title becomes a persistent id. Keep it identical across
   re-extractions of the same file (prose can change freely; titles cannot).

Before you output: verify every path is in ALLOWED_PATHS, every filePath matches
a listed file, and no interviewLine exceeds 40 words. Then emit only the JSON.
```

---

## Pass 2 — QBank questions → concept map

> **Input:** `packages/qbank/src/data.ts`, plus `KNOWN_CONCEPTS` = the list of
> concept slugs Pass 1 emitted (so the two sides use the same vocabulary).

```
You are tagging interview questions with the CS concepts they test, so each can be
tied to real code. Read the question bank and emit ONE JSON object mapping each
question id to concept slugs.

INPUTS
- The question bank (each item has an "id", "q", "anchor", "detail").
- KNOWN_CONCEPTS: prefer these existing slugs; only add a new one if none fits.
  {{PASTE the concept slugs from Pass 1 here}}

OUTPUT — a single JSON object, no prose:
{ "<question-id>": ["kebab-concept-slug", ...], ... }

RULES
1. Use each question's "anchor"/"detail" to decide the 1-3 concepts it MOST tests.
   Do not over-tag; precision beats recall — a wrong tag creates a misleading tie.
2. Reuse KNOWN_CONCEPTS slugs verbatim wherever they fit. New slugs must be
   lowercase-kebab and match the style of the known ones.
3. Only include ids that have at least one confident concept. Omit the rest.

Emit only the JSON object.
```

---

## Order of operations

1. Run **Pass 1** for each project → collect all the `concepts[].concept` slugs.
2. Feed that pooled slug list as `KNOWN_CONCEPTS` into **Pass 2** → the qid→concepts map.
3. Hand me: the Pass-1 JSON(s), the `git ls-files` for each, and the Pass-2 map.

Aligning the vocabulary in step 2 is what makes ties actually land — if the two
passes invent different slugs for the same idea, the join finds nothing.

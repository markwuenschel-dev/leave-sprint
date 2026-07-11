# Portfolio hand-off format

You extract projects **externally** with an LLM and hand me one JSON file per
project. This is the shape to target. The ingest boundary (`validateHandoff`)
repairs and grounds whatever you send — only `project.key`, `project.label`, and
each file's `path` + `title` are strictly required — but the closer you hit this,
the less gets dropped or flagged.

## Shape

```jsonc
{
  "project": {
    "key": "compounding-quality",          // stable slug — namespaces ids + ties
    "label": "Compounding Quality",
    "summary": "RAG document-review service with a human-in-the-loop reviewer step.",
    "roleTracks": ["SWE", "MLE"]            // SWE | MLE | DS | DE | BOTH | OTHER
  },

  "files": [                                // one per defensible file/module → one Defense card
    {
      "path": "src/main/java/app/rag/RagEngineClient.java",  // REAL repo path
      "title": "RagEngineClient (interface)",
      "role": "boundary",                   // controller|dto|service|adapter|boundary|pure-fn|component|model|config|test|other
      "responsibility": "Stable Java abstraction over the Python engine; hides subprocess details.",
      "terminology": ["dependency inversion", "interface", "contract"],
      "interviewLine": "Controllers depend on the contract, not subprocess details — swapping to HTTP later doesn't touch the controller.",
      "boundary": true,                     // integration seam (network/subprocess/db/external)
      "core": true,                         // on a critical path → readiness floor
      "roleTrack": "BOTH",
      "concepts": ["dependency-inversion", "interface-vs-implementation", "adapter-pattern"],
      "evidence": ["interface RagEngineClient", "getChecklist()"],  // real symbols in this file
      "confidence": 0.9,                    // 0..1 — honest; low → I use a template line
      "provenance": ["code", "adr"]         // code|readme|adr|comment|commit|test
    }
  ],

  "concepts": [                             // concept → code-site edges; power `tie` strings
    {
      "concept": "dependency-inversion",    // slug; matched against a question's concepts
      "filePath": "src/main/java/app/rag/RagEngineClient.java",  // must be a file above
      "claim": "the interface lets the controller depend on a contract while the subprocess adapter varies underneath",
      "strength": 0.9                       // 0..1 — how strongly this site shows the concept
    }
  ]
}
```

## Rules that make ingest clean (and why)

- **Every `path` and every `concepts[].filePath` must be a real repo path.** If
  you can run `git ls-files`, pass that list as `knownPaths` when you hand off —
  I cross-check against it and drop hallucinated files and dangling sites. No
  list → everything is kept but flagged `ungrounded`.
- **`interviewLine` is *spoken*, ≤ ~40 words.** It's the one line said cold in the
  Defense drill. Longer lines get truncated and flagged. Put the depth in
  `responsibility` (the "why"), not here.
- **`confidence` should be honest.** Below `0.55` I replace the line with a
  deterministic role template and report the id as `provisional` for you to
  review — that's better than shipping a confident-but-wrong sentence.
- **`concepts[].concept` is a slug you also use on the questions.** A `tie` is a
  join: a QBank question names concepts, a site names the same concept. No
  matching site → **no tie is emitted** (I never fabricate one). Use consistent
  slugs (`discriminated-union`, not "Discriminated Unions").
- **Ids are derived from `title` and are stable.** Keep titles stable across
  re-extractions or you'll orphan practice progress. Changing prose is free;
  changing titles costs history.

## For ties: also hand me the question→concept map

`tie` generation needs to know which concepts each QBank question tests:

```json
{ "swe-5": ["inheritance-vs-composition", "liskov"], "swe-6": ["interface-vs-implementation"] }
```

Produce this the same way (an LLM pass over `packages/qbank/src/data.ts`), or I
can derive it from each question's `anchor`/`detail`. Either way the slugs must
match the ones in `concepts[]`.

## What I do with a hand-off

1. `validateHandoff(json, { knownPaths })` → `{ clean, report }` — read the report.
2. `toDefenseItems(clean)` → `FileDefenseItem[]` (+ `provisional` ids to review).
3. `toTieMap(clean, questionConcepts)` → per-question `tie` strings.
4. `mergeDefense(existing, items)` → fold into state, preserving `practicedDates`.

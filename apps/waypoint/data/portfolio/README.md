# Portfolio hand-offs (raw ingest inputs)

Drop the files your external LLMs produce here. These are **inputs** — I validate
them (`lib/portfolio/validateHandoff`) and wire the survivors into `catalog.ts`
(Defense cards) and `packages/qbank/src/data.ts` (ties). They're committed for
provenance and re-runs, but nothing here is loaded by the app at runtime.

## Naming (one set per project)

| File | What it is | Source |
|------|-----------|--------|
| `<project-key>.handoff.json` | Pass 1 output — the `PortfolioHandoff` object | extraction LLM |
| `<project-key>.paths.txt`    | `git ls-files` for that repo (grounding list) | `git ls-files` |
| `question-concepts.json`     | Pass 2 output — `qid → [concept slugs]` (ONE file, shared) | tagging LLM |

`<project-key>` = the same kebab slug you put in `project.key` (e.g.
`compounding-quality.handoff.json` + `compounding-quality.paths.txt`).

## Example

```
data/portfolio/
├── README.md
├── question-concepts.json          # shared across all projects
├── compounding-quality.handoff.json
├── compounding-quality.paths.txt
├── realmwalkers.handoff.json
└── realmwalkers.paths.txt
```

## After you drop them

Tell me they're here. I run `validateHandoff(handoff, { knownPaths })` per project,
show you the drop/flag report, then generate the catalog + tie edits for review.
See `lib/portfolio/HANDOFF.md` for the format and `EXTRACTION-PROMPT.md` for the
prompts that produce it.

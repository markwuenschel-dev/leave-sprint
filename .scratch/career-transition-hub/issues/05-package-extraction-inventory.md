# Package extraction inventory

Type: research
Status: resolved
Blocked by:

## Question

Which **existing twin modules** become shared packages vs stay legacy/dead, for the monorepo hard fork (`apps/hub` + `packages/*`)?

Produce a markdown inventory asset: candidate packages (e.g. rubric, qbank, scoring types, velocity math), dependency notes, and port risk. Read the repo (`lib/rubric`, `lib/qbank`, store/types, db). No implementation — inventory + recommendation only.

## Answer

**Extract:** `@hub/rubric` (full pure-TS engine: RD v1.11, scoring/derive/normalize/io/dashboards/promotion — decouple sprint dates + role weights) and `@hub/qbank` (types, trackMap, bank content). Optionally thin practice-types for Problem/FileDefense; fold competency week math from velocity into rubric.

**Hub-only rebuild:** store, persist, middleware/token gate, theme/utils, greenfield schema + API, all UI.

**Dead/archive:** 29-day spine (days/stages/day-plans), twin Drizzle schema as shared package (keep mappers only as one-shot import), sprint-locked velocity pace.

Full matrix, dependency graph, port risks: [assets/package-extraction-inventory.md](../assets/package-extraction-inventory.md)

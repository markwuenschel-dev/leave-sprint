# Career transition hub — wayfinder map

Label: `wayfinder:map`

## Destination

This map ends when we have a **product definition and ordered decision pack** for turning this repo into a **career transition hub**: arc **B → A** (readiness rebuild, then land a role), **hybrid readiness gate**, role stack **SWE Full Stack II ‖ MLE II** (equal primary), **DS / DE** secondary, **BIE / BIA** escape hatch; Day-1 floor **≥ practice OS + real applications pipeline** at production quality (not a thin MVP); **hard fork** in a monorepo (`apps/waypoint` + `packages/*`) with **greenfield hub schema** and optional one-shot import from the archived twin. Output is decisions/specs implementers can execute — not the fully built hub — unless a later Notes change says otherwise. **Feature exploration** (research/prototype) is in-scope on the map beyond the Day-1 floor.

**Charting status:** all map tickets **resolved** (remaining work is implementation + optional exploration under the protocol). Human authorized final open tickets to be stamped with agent recommendations.

## Notes

- **Domain:** personal career transition OS; single-user lineage of Leave Sprint Twin → **Waypoint**.
- **Twin:** archive/reference only; one-shot import of progress + rubric history.
- **Skills:** `/grilling`, `/domain-modeling`, `/prototype`, `/research` as needed for exploration tickets.
- **Standing preferences:** plan-by-default for wayfinding; Day-1 bar robust/production; exploration WIP-limited; refer by ticket **name**. Grilling pace was up to two questions/turn; late map closed via **stamp recs**.
- **Tracker:** `.scratch/career-transition-hub/`.

## Decisions so far

- [Package extraction inventory](issues/05-package-extraction-inventory.md) — Extract rubric + qbank engines; hub-only store/DB/UI; dead 29-day spine + twin schema as packages.
- [Name the hub](issues/01-name-the-hub.md) — **Waypoint**; slug `waypoint` (`apps/waypoint`, `@waypoint/*`); GitHub repo rename deferred.
- [Hybrid gate evidence floor](issues/02-hybrid-gate-evidence-floor.md) — Evidence green = practice ~80% Solid core + ≥2 solid mocks/scored + core stories cold, **both** primaries; secondaries never block; apps/network/resume/vibes not on floor; you still flip B→A.
- [Rhythm without leave sprint](issues/04-rhythm-without-leave-sprint.md) — Daily checklist + weekly review; B slots Practice/Defense/Interview reps/Admin light; A mode-weights same four (admin expands); checkboxes ≠ evidence green.
- [One-shot import scope](issues/07-oneshot-import-scope.md) — Optional only (not using twin day-to-day); if run: progress + rubric history; leave twin scaffolding in repo; not a Day-1 blocker.
- [Applications pipeline Day-1 surface](issues/03-applications-pipeline-day1.md) — Stamped surface (role+company, short statuses); **deferred for human revisit** if they want to redesign later.
- [Feature exploration protocol](issues/08-feature-exploration-protocol.md) — Spikes allowed for free curiosity; no WIP limit; one-session close preferred (build/later/don’t); spikes don’t auto-block Day-1 core.
- [Monorepo scaffold conventions](issues/09-monorepo-scaffold-conventions.md) — `apps/waypoint` + `@waypoint/rubric|qbank|practice-types`; **leave twin at root**; stay on current stack.
- [Hub information architecture](issues/06-hub-information-architecture.md) — Nav: Today/Readiness/Practice/Defense/Interview/Applications/Weekly/More; gate on Readiness; asset `assets/waypoint-ia-shell.md`.

## Not yet specified

_(Implementer / follow-on — not blocking “way is clear” for scaffold + Day-1 build.)_

- Exact **greenfield schema** DDL (entities above are decided; tables/events not).
- **Practice UX** detail (banks, quiz modes) beyond engines + IA homes.
- **Next-action ranking** algorithm for dual-equal primaries.
- **Auth / deploy / ops** (token gate continuity, Railway, backup/export specifics).
- **CI / test** bar for “production-ready.”
- Concrete **exploration backlog** items (open under protocol when needed).
- When/whether to **move or delete** root twin scaffolding.
- **Rubric version** policy (stay v1.11 vs evolve).
- Global **materials library** depth beyond thin links.
- **Apps pipeline** human revisit (deferred; stamped defaults stand until then).

## Out of scope

- Full **network/CRM**, resume **ATS lab**, **finance/runway**, calendar/email sync as first-class Day-1 domains.
- Continuing **Leave Sprint Twin** as a living product.
- **Building the full hub** inside this map — hand off to implementation (e.g. scaffold PR next).

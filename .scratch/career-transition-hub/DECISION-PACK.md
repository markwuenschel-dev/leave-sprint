# Waypoint — decision pack (implementation handoff)

Read the map for links; this is the single-page ordered pack.

## Product

| Decision | Answer |
|----------|--------|
| Name | **Waypoint** (`apps/waypoint`, `@waypoint/*`) |
| Arc | Phase **B** readiness → Phase **A** applications |
| Roles | Primary equal: **SWE FS II**, **MLE II**; secondary DS/DE; escape BIE/BIA |
| Gate | Hybrid: evidence floor + human go/no-go |
| Evidence floor | Practice ~80% Solid core + ≥2 solid mocks/scored + core stories cold; **both** primaries; not apps/network/resume |
| Rhythm | Daily: Practice, Defense, Interview reps, Admin light + weekly review; A reweights same four |
| Apps Day-1 | Role+company rows, short statuses, targetRole, notes, materials links |
| Twin | Not in daily use; **leave scaffolding at repo root**; import **optional** (progress + rubric only if ever run) |
| Code | Hard fork: `apps/waypoint` + `@waypoint/rubric`, `qbank`, **practice-types**; greenfield schema; **don’t move twin** in first scaffold |
| Stack | Stay on current (Next/React/TS/Tailwind/Drizzle/Zustand/pnpm) |
| Repo rename | Deferred (`leave-sprint` stays) |
| Explore | Spikes OK for free curiosity; **no WIP limit**; prefer one-session close (build/later/don’t); don’t auto-block Day-1 |
| Apps | Stamped defaults; human may revisit later (deferred) |

## Suggested implementation order

1. Monorepo scaffold (`apps/waypoint` + packages **alongside** root twin — no move)
2. Port `@waypoint/rubric` + `@waypoint/qbank` + `@waypoint/practice-types`
3. Greenfield schema + persist (rhythm, readiness, applications, practice)
4. Shell IA (`assets/waypoint-ia-shell.md`)
5. Today + weekly rhythm
6. Practice / Defense / Interview surfaces
7. Readiness gate UI
8. Applications CRUD
9. Optional twin import (skip if starting clean)
10. Deploy/auth/export polish

## Key paths

- Map: `.scratch/career-transition-hub/map.md`
- IA: `.scratch/career-transition-hub/assets/waypoint-ia-shell.md`
- Packages research: `.scratch/career-transition-hub/assets/package-extraction-inventory.md`
- Glossary: `CONTEXT.md`

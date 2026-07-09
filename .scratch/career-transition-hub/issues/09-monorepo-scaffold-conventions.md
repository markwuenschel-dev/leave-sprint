# Monorepo scaffold conventions

Type: grilling
Status: resolved
Blocked by: 01, 05

## Question

What are the **concrete monorepo conventions** for the hard fork before any real port work: app path name, package naming, pnpm workspace layout, shared tsconfig/tooling, and where legacy twin code lives?

Enough to hand an implementer a scaffold checklist. Blocked on product name (slug) and package inventory (what packages exist on day one of the fork).

## Answer

Aligns with Waypoint naming (`@waypoint/*`). **Human confirmed (2026-07-09):** leave twin in place; **all** extract packages Day-1; **stay on current** twin stack.

### Layout

```
/
  apps/
    waypoint/          # new Next.js hub (add alongside; do NOT move twin in first scaffold)
  packages/
    rubric/            # @waypoint/rubric
    qbank/             # @waypoint/qbank
    practice-types/    # @waypoint/practice-types (Problem, FileDefense shapes, etc.)
  # existing twin stays at repo root (app/, lib/, data/, …) — frozen scaffolding
  pnpm-workspace.yaml
  package.json
  tsconfig.base.json
  CONTEXT.md
```

**Scaffold rule:** create `apps/waypoint` + `packages/*` **without** relocating the twin. Twin root app remains as legacy scaffolding until a later explicit move/delete decision.

### Naming

| Kind | Convention |
|------|------------|
| App | `apps/waypoint` |
| Packages | `@waypoint/rubric`, `@waypoint/qbank`, `@waypoint/practice-types` |
| GitHub repo | stay `leave-sprint` (deferred rename) |

### Tooling (stay on current)

- pnpm workspaces, Next App Router, React 19, TypeScript, Tailwind, Drizzle, Zustand patterns.
- Hub reimplements store/schema; does not share twin DB package as runtime product schema.

### Day-1 packages (all)

1. `@waypoint/rubric` — `lib/rubric/*` (+ difficulty pure fn); strip sprint date coupling.
2. `@waypoint/qbank` — `lib/qbank/*` + `data/qbank.ts`.
3. `@waypoint/practice-types` — thin practice domain shapes (problems, file defense, statuses).

**Do not** package twin schema, velocity sprint pace, or store.

### Legacy twin

- Leave scaffolding in place at root; no new twin features.
- Optional import script later under `apps/waypoint` (not Day-1 required).

### Implementer checklist

1. pnpm workspace: `apps/*`, `packages/*` (root twin app still works as today).
2. Create three packages with exports.
3. Create `apps/waypoint` Next app (token gate pattern copy).
4. **Do not** move twin in this step.
5. Prove `@waypoint/rubric` (etc.) import from `apps/waypoint`.

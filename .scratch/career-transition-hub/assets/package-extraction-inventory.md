# Package extraction inventory

**Source tree:** Leave Sprint Twin (`lib/*`, `data/*`, selected `app` domain logic)  
**Target shape:** monorepo hard fork — `apps/hub` + `packages/*`  
**Mode:** research only — inventory + recommendations; no implementation  

## Executive recommendation

| Extract as shared packages (Day-1 port engines) | Hub-only (rebuild in `apps/hub`) | Dead / archive (do not package) |
|---|---|---|
| `@hub/rubric` (full engine + RD + I/O) | App store, UI shell, token gate, theme | 29-day sprint spine (days/stages/day-plans) |
| `@hub/qbank` (types + track map + bank content) | Persist/API wiring patterns | Twin Drizzle schema as-is |
| Optional thin `@hub/practice-types` (coding bank + file-defense shapes) | Greenfield hub schema + one-shot import | Sprint-locked velocity pace charts |
| | Pure difficulty calculator (lift out of component) | Leave-era seed / milestones as product |

**Bottom line:** The twin already has a clean pure-TS competency core (`lib/rubric/*`) and a large qbank content module. Those are the real package extractions. Almost everything else is either leave-sprint product shell or DB/persist coupling that the hub replaces with a greenfield schema.

---

## Dependency graph (current twin)

```
data/qbank.ts ──► lib/qbank/types ──► lib/rubric/types ──► referenceData, diagnostics
lib/qbank/trackMap ──► qbank/types (TaskType, Role from rubric)
lib/rubric/*  (mostly self-contained; pure TS)
  ├── promotion.ts ──► lib/types SPRINT_START / SPRINT_DAYS   ← only hard sprint leak
  └── dashboards.ts ──► clusters, diagnostics.roleTier
lib/types.ts ── re-exports rubric + defines sprint domain (Day/Stage/Problem/FileDefense)
lib/velocity.ts ──► types (sprint window + RubricEntry weekly buckets)
lib/store.ts ──► types, rubric/normalize+io, qbank types, persist, data/seed
lib/db/* ──► schema (twin tables), mappers (rubric hybrid), state (SEED), drizzle
lib/persist ──► /api/state (Next fetch)
app components ──► store + packages above
```

**External deps used by extractable core:** none beyond TypeScript. Rubric/qbank/velocity pure modules do **not** import React, Zustand, Drizzle, or Next.

---

## Candidate packages

### 1. `@hub/rubric` (or `packages/rubric`)

| Field | Detail |
|---|---|
| **Contains** | Entire `lib/rubric/*`: `referenceData` (RD v1.11 + promotionEvidence), `types`, `diagnostics` (§17 sub-objects + controlled vocab), `scoring`, `derive`, `normalize`, `aliases`, `clusters`, `io` (JSON import/export + reference MD), `dashboards` (level trends, role readiness, retest, gaps, trust), `promotion` (evidence counts, next-recommended, burndown), barrel `index.ts` |
| **Size** | ~12 files; largest: `referenceData.ts` (~26KB), `diagnostics.ts` (~12KB), `normalize.ts` (~12KB), `clusters.ts` (~11KB) |
| **Dependencies** | Internal only except **`promotion.ts` imports `SPRINT_START` / `SPRINT_DAYS` / `getDateForDay` from `lib/types`** for burndown + next-action pacing |
| **Port risk** | **Medium** — engine is pure and well-factored; risk is (1) decoupling promotion pace from 29-day leave window, (2) `ROLE_WEIGHT_TABLE` / `TARGET_ROLES` in diagnostics still leave-era Chewy job titles, (3) CSS vars in RD (`var(--cyan)` etc.) are presentation leaks in data |
| **Recommendation** | **Extract** — primary shared package; Day-1 practice OS spine |
| **Rationale** | Destination requires hybrid readiness gate + competency evidence. This is already the full scoring system (three-score model, gates, qualifying level, promotion slots). Port as package; parameterize calendar/sprint bounds instead of importing twin `lib/types`. |

**Sub-split option (optional later):**  
- `@hub/rubric-core` = RD + types + scoring + derive + normalize + aliases + io  
- `@hub/rubric-analytics` = dashboards + clusters + promotion  

Not required for Day-1; single package is simpler.

**Also lift into this package:** pure difficulty scoring from `app/components/sprint/DifficultyCalculator.tsx` (8 dimensions × 0–2, threshold → D1–D5). Today it is UI-local; RD already documents `difficultyAttributes` / `difficultyThresholds` — calculator logic should live next to RD.

---

### 2. `@hub/qbank` (or `packages/qbank`)

| Field | Detail |
|---|---|
| **Contains** | `lib/qbank/types.ts` (`TrackKey`, `QBankQuestion`, `QBankTrack`, `QBankStatus`, `TrackMapEntry`), `lib/qbank/trackMap.ts` (`QB_TRACK_MAP` → rubric taskType/domain/role), content bank `data/qbank.ts` (~383KB, 8 tracks: swe/mle/ds/de/react/sql/sdlc/diag) |
| **Dependencies** | `TaskType`, `Role` from rubric types |
| **Port risk** | **Low–medium** — types/track map trivial; content is large static data (bundle size / tree-shaking). Mastered→log bridge is UI (`QuickLogModal`) not package logic |
| **Recommendation** | **Extract** (content may ship as separate `packages/qbank-data` if hub wants lazy load) |
| **Rationale** | Destination Day-1 floor includes qbank/quiz modes. Twin already has multi-track L1–L3 stretch structure and rubric classification map. Keep engine types + content portable; rebuild player UI in hub. |

---

### 3. `@hub/practice-types` (optional thin package)

| Field | Detail |
|---|---|
| **Contains** | Domain shapes currently in `lib/types.ts` for practice artifacts: `Problem`, `ProblemStatus`, `Tier`, `FileDefenseItem`; optionally status-transition helpers |
| **Dependencies** | None |
| **Port risk** | **Low** for types only |
| **Recommendation** | **Extract lightly** if coding bank + file defense remain first-class hub features; else define greenfield types in hub and treat twin as reference |
| **Rationale** | Shapes are small and reusable. Seed *content* (leetcode list, project files) is leave-era and should not be packaged as product truth — hub materials/practice redesign owns content. |

**Do not put in this package:** `DayState`, `StageId`/`StageState`, `DayPlan`, `SPRINT_*`, `SprintStore` — those are leave-sprint product spine.

---

### 4. `@hub/velocity` / progress math (partial extract only)

| Field | Detail |
|---|---|
| **Contains today** | `lib/velocity.ts`: sprint-day clamp, stage cumulative/ideal pace, rhythm discipline rates/heatmap, problem status counts, **calendar-week rubric buckets** (`weeklyBuckets`, `cumulativeQualifying`) |
| **Dependencies** | `SPRINT_START`, `SPRINT_DAYS`, day/stage/problem types, `RubricEntry` |
| **Port risk** | **High** if extracted wholesale (sprint-locked); **Low** if only competency weekly math moves into `@hub/rubric` |
| **Recommendation** | **Split** — fold competency week helpers into `@hub/rubric` (or hub analytics); **do not** package stage/rhythm 29-day pace as shared product math |
| **Rationale** | Destination is B→A career OS, not a 29-day leave clock. Rolling competency velocity survives; stage burndown vs leave end-date dies with the twin frame. |

---

### 5. Persistence & DB (`lib/db/*`, `lib/persist/*`)

| Module | Contains | Deps | Port risk | Recommendation |
|---|---|---|---|---|
| `lib/db/schema.ts` | Twin tables: `days` (1..29), `stages`, `problems`, `file_defense`, hybrid `rubric_entries`, `qbank_status`, `app_meta` | drizzle-orm, qbank status type | High as shared schema | **Dead as package** — hub gets **greenfield schema** |
| `lib/db/mappers.ts` | Rubric hybrid column/jsonb split + `normaliseEntry` on read | rubric normalize | Med as import reference | **Hub-only import adapter** (one-shot from archived twin), not a runtime package |
| `lib/db/state.ts` | load/save recomposition + SEED empty path | schema, mappers, seed | High | **Dead** — replace with hub repositories |
| `lib/db/index.ts`, `migrate.ts` | PGlite/Postgres driver, migrations | drizzle, pglite, postgres | Med | **Hub-only** infra (patterns reusable, not a shared domain package) |
| `lib/persist/serverStorage.ts` | Zustand storage → debounced PUT `/api/state`, save-status bus, beacon flush | zustand types, fetch | Med | **Hub-only** — good pattern to reimplement against new API; not extractable without twin store contract |

**Rationale (Destination):** “greenfield hub schema and optional one-shot import from the archived twin.” Package the **rubric entry shape + normaliseEntry**, not the twin table layout.

---

### 6. App shell / store / twin domain (`lib/store.ts`, `lib/types.ts` sprint slice)

| Module | Recommendation | Rationale |
|---|---|---|
| `lib/store.ts` (Zustand + all actions) | **Hub-only rebuild** | Product shell; couples seed, rhythm, stages, problems, fileDefense, rubric, qbank |
| `lib/types.ts` sprint types + `SPRINT_*` | **Dead / archive** | 29-day leave frame out of product spine |
| `lib/types.ts` re-exports of rubric | **Delete after extract** | Import from `@hub/rubric` |
| `data/seed.ts`, `data/app-state.json` | **Dead as product seed** | Useful only for twin archive + import tests |
| `data/day-plans.ts`, `data/stages.ts` | **Dead** | Leave-era schedule/milestones |
| `middleware.ts` token gate | **Hub-only** (copy/adapt) | Edge cookie gate; not a domain package |
| `lib/useTheme.ts` | **Hub-only** | UI chrome |
| `lib/utils.ts` (`cn`, `verdictColor`) | **Hub-only** or tiny `@hub/ui-utils` | Trivial; verdict colors couple to CSS tokens |

---

### 7. App components with embedded domain logic (not packages today)

| Component | Domain logic | Recommendation |
|---|---|---|
| `DifficultyCalculator.tsx` | D-level attribute sum → thresholds | **Extract pure fn → `@hub/rubric`**; UI stays hub |
| `CodingBankTiers.tsx` | Large static practice reference content | **Hub content/reference** (or future materials package); not engine |
| `QBank.tsx` | Flashcard layers, MD export, mastered bridge | **Hub UI**; uses `@hub/qbank` data |
| `GradeForm` / `QuickLogModal` / History | Scoring UX over rubric engine | **Hub UI** |
| `CompetencyDashboards` / `RubricAnalytics` | Thin views over `dashboards` + `promotion` | **Hub UI** |
| `ProblemBank` / `FileDefense` | Status + practice dates | **Hub UI** + optional practice-types |
| `TodayRhythm` / `Calendar` / `WeeklySchedule` / `StageProgression` | Leave schedule UX | **Dead** with 29-day spine |
| `VelocityDashboard` | Mix of sprint pace + competency weeks | **Rebuild** hub dashboards on extracted math only |
| `DataExport` | Full-state export UI | **Hub-only** (export should use `@hub/rubric` io + hub schema dump) |
| UI primitives (`Flashcard`, `Burndown`, `Heatmap`, …) | Presentational | **Hub** or `packages/ui` if reuse wanted later |

---

## Summary matrix

| Candidate | Source paths | Deps | Port risk | Recommendation |
|---|---|---|---|---|
| **Rubric engine** | `lib/rubric/**` (+ difficulty pure from component) | Pure TS; promotion↔sprint date leak | **Med** | **Extract** |
| **Qbank** | `lib/qbank/**`, `data/qbank.ts` | Rubric TaskType/Role | **Low–Med** | **Extract** |
| **Practice types** | Problem / FileDefense slices of `lib/types.ts` | None | **Low** | **Extract (optional)** or redefine in hub |
| **Competency velocity** | `weeklyBuckets` et al. in `lib/velocity.ts` | RubricEntry | **Low** | **Extract into rubric** (not own package) |
| **Sprint velocity / rhythm / stages** | rest of `velocity.ts`, day/stage types, `data/stages`, `data/day-plans` | Sprint constants | **High** (wrong product) | **Dead** |
| **Twin store** | `lib/store.ts` | Everything | **High** | **Hub-only rebuild** |
| **Twin DB schema + state** | `lib/db/**` | Drizzle, seed | **High** | **Dead schema; import mappers as one-shot** |
| **Server persist** | `lib/persist/**` | Zustand, Next API | **Med** | **Hub-only reimplement** |
| **Theme / utils / middleware** | `useTheme`, `utils`, `middleware` | React/Next | **Low** | **Hub-only** |
| **Leave seed & schedules** | `data/seed`, `app-state`, day-plans, stages | types | **n/a** | **Dead / archive** |

---

## Suggested monorepo layout (decision aid only)

```
apps/
  hub/                 # Next app: greenfield schema, store, UI, auth, ops
packages/
  rubric/              # @hub/rubric — scoring system + analytics pure fns
  qbank/               # @hub/qbank — types, trackMap, optional content
  # optional later:
  # practice-types/    # coding bank + file-defense shapes
  # ui/                # shared presentational components if multi-app
```

**Import path for twin archive:** keep current tree as reference; one-shot importer reads twin Postgres/export → hub schema using `normaliseEntry` + row mappers as **scripts**, not as a published package dependency of hub runtime.

---

## Port risks to plan for (no implementation here)

1. **Sprint coupling** — `promotion.ts` burndown/nextRecommended and most of `velocity.ts` assume Jun 17 2026 + 29 days. Hub readiness pace needs calendar- or goal-based parameters.  
2. **Role weight config** — `ROLE_WEIGHT_TABLE` / `TARGET_ROLES` encode leave-era job search; Destination wants SWE FS II ‖ MLE II equal primary + DS/DE secondary + BIE/BIA escape — config must move to hub policy, not hardcode in package (package should accept weights as input).  
3. **Content vs engine** — qbank 383KB and CodingBankTiers content will dominate bundles; separate data packages or CDN/static import strategy later.  
4. **Rubric versioning** — `RUBRIC_VERSION = '1.11'`; Destination still open on evolve vs freeze — package should keep version on every entry (already does).  
5. **Hybrid DB mapping** — twin promotes ~15 columns + jsonb diagnostic; hub schema may store differently — only `RubricEntry` + `normaliseEntry` need long-term stability for import.  
6. **CSS tokens in RD** — `taskTypes[].color` uses CSS variables; hub theming must either keep tokens or strip presentation from data.

---

## Explicit non-goals of this inventory

- No package scaffolding, path aliases, or monorepo tooling changes.  
- No greenfield schema design (separate ticket domain).  
- No decision on deleting the twin tree after ports (map “Not yet specified”).  
- No UI redesign of practice modes beyond “port engines.”

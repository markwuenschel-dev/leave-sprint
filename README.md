# Leave Sprint Twin

**High-signal, local-first command center dashboard** for the 29-day leave sprint (June 17 – July 15 2026).

A modern Next.js rebuild of the original single-file dashboard. Built for daily use during the final phase of the sprint: interview prep, daily rhythm discipline, stage tracking, and progress visibility.

> **Always use pnpm** for this project.

## Quick Start

```bash
pnpm install
pnpm dev      # http://localhost:3000 (Turbopack)
pnpm build
```

**Current status (2026-07-03 ≈ Day 17):** Build work is complete. Focus has shifted fully to consistent daily rhythm (Coding Drill + File Defense + Q&A + Build/Prep), 20-stage completion, problem bank practice, and mock interview readiness. Applications target: Day 22 (July 8). Mock #1: Day 21.

---

## Tech Stack

- **Next.js 16.2.10** (App Router) + React 19.2 + **TypeScript ^6.0** + Tailwind 4 + Turbopack
- **shadcn/ui** + Radix primitives (planned progressive adoption)
- **Zustand** + persist middleware (local-first, no backend for v1)
- **Framer Motion** for micro-interactions
- **date-fns** for date handling
- Deploy target: **Netlify** (static export)

---

## Key Screens (v1)

| Screen | Description |
|--------|-------------|
| **Today / Daily Rhythm** | Prominent progress ring for current day. Synced checklist for the 4 disciplines (Coding Drill, File Defense, Q&A, Build Block). Focus notes, energy selector (low/medium/high), and per-day journal. |
| **20-Stage Progression** | Beautiful stepper view of the full build + prep stages. One-click "Mark Done" with ISO timestamps. Phase gates clearly visible. |
| **Interactive Calendar** | July 2026 grid with live color coding: green = full rhythm done, cyan = partial, yellow = at-risk. Click any sprint day for detail panel showing rhythm state + quick actions. |
| **Problem Bank** | Search + filters (Tier, Status, Pattern). Status tracking: Not Started / Practicing / Solid. All updates persist instantly. |
| **File Defense Map** | (Core data present; detail views + "Mark Practiced" + notes in progress) |

**Milestones:** Mock #1 (Day 21) · Applications ⭐ (Day 22) · Mock #2 (Day 26) · Sprint End (Day 29)

## Features & Quality Bar

- **Instant persistence**: Every checkbox, status change, note, and journal updates Zustand + localStorage immediately.
- **Seed + merge**: On first load, state hydrates from `data/app-state.json` (or `data/seed.ts`) and intelligently merges with persisted data.
- **Fully typed** + accessible + mobile-first (bottom nav on small screens).
- **Smooth interactions** via Framer Motion.
- **Easy content edits**: Modify `data/app-state.json` or `data/day-plans.ts` for most schedule and reference data updates.

**LocalStorage key:** `leave-sprint-twin-v1` (different from the legacy single-file `cqw-sprint-v1`).

---

## Keyboard Shortcuts (App)

| Keys | Action |
|------|--------|
| `T`  | Jump to Today tab |
| `S`  | Jump to Stages tab |

(Additional shortcuts for future Practice/Quiz modes planned.)

---

## Data & Persistence

**Seed data lives in:**

- `data/app-state.json` — primary editable seed (days, stages, problems, file defense)
- `data/seed.ts` — TypeScript mirror (used by the store for safe import)
- `data/day-plans.ts` — static daily rhythm content and milestone definitions

**How it works:**
1. On first load the app starts from the seed.
2. Zustand `persist` middleware overlays any saved progress.
3. `onRehydrateStorage` merges intelligently (your local progress always wins; new seed fields appear).
4. All mutations are optimistic and write to localStorage under the key `leave-sprint-twin-v1`.

**Editing during the sprint:** Change `data/app-state.json` or `day-plans.ts` → restart dev server (or hard reload) to pick up baseline changes. Your completed work stays in localStorage.

---

## Project Structure

```
app/
  layout.tsx
  page.tsx
  components/
    sprint/
      TodayRhythm.tsx
      StageProgression.tsx
      Calendar.tsx
      ProblemBank.tsx
lib/
  store.ts          # Zustand store + persist config
  types.ts
  utils.ts
data/
  app-state.json    # ← primary content to edit
  day-plans.ts
  seed.ts
```

---

## Development

```bash
pnpm install
pnpm dev
pnpm build
```

- Uses **Turbopack** (via `--turbopack` flag)
- TypeScript ^6.0 with modern settings (`verbatimModuleSyntax`, `moduleResolution: bundler`)
- After changing `package.json` versions, run `pnpm install` to update `pnpm-lock.yaml`

Static export configured for Netlify in `next.config.ts`.

## Deployment (Netlify)

```bash
pnpm build
# Deploy the generated `out/` folder
```

Or connect the GitHub repository — Netlify auto-detects the Next.js project and uses `pnpm build`.

---

## Roadmap / Near-term

- Rich File Defense detail modal + "Quiz me" + practiced tracking
- At-Risk + Insights panel (velocity, projections, streak, recommendations)
- Optional LeetCode enrichment helper (slug → title/difficulty)
- More complete Practice / Quiz modes
- Theme switcher (dark/light/system) + better shadcn/ui components

---

## Legacy Single-File Version

The original implementation lives alongside:

- `unified_schedule.html` (+ `.js` + `.css`)
- Old localStorage keys: `cqw-sprint-v1`, `cqw-qbank-v1`

This is kept as a **reference and content source**. The new Next.js app is the active daily driver.

Many day plans, problem descriptions, file defense entries, and Q&A prompts were ported from the legacy version.

---

## Goals & v1 Definition of Done

A beautiful, fast, local-first dashboard usable every day for the remaining sprint days. You should be able to:

- Check off daily rhythm items
- Advance stages with timestamps
- Use the calendar + day detail
- Track Problem Bank and File Defense status
- See live progress and at-risk signals

All without leaving the browser and with zero backend.


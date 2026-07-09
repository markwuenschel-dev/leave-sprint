# 🔧 [Type/Scope]: Short Descriptive Title
<!--
  Examples: feat(waypoint): hybrid readiness glance, fix(persist): sendBeacon 401 path,
            refactor(rubric): derive levels, chore: update deps
  Conventional Commits for changelog compatibility. Keep title <72 chars.
-->

## 🧭 Context & The "Why"
<!-- Why this change *now*? Link issue / ticket / research / decision pack. -->
- **Source:** [Issue #XXX / Linear / `.scratch/…` / Research Note]
- **Core Problem / Opportunity:**
-
- **Solution Path / Motivation:**
-

## 🏗️ Architectural Changes (The "What" + "How")
*Organized by layer for system evolution tracking. Include technical details, algorithms, flows.*

- **Schema / Data / Models:**
  -
- **Backend / Store / State** (persist path, S(t)/D(t), Forge Manifest, PGlite/API):
  -
- **Frontend / Surfaces / UI** (nav, Tailwind, tokens, cyberpunk/parchment themes):
  -
- **Dependencies / Config / External:**
  -
- **Key Implementation Notes:**
  - Trade-offs considered (perf vs. maintainability, etc.):
  - Alternatives evaluated:
  - For quant/ML: validation approach, no-lookahead, signal reliability, benchmarks:
  - For game/procedural: PCG params, modular logic, WorldForge recipe usage:
  - For Waypoint/twin: catalog merge, readiness floor impact, twin import scope:

## 📌 Placement, Constraints & Technical Debt
<!-- Monorepo, twin vs. Waypoint, persistence durability, etc. -->
- **Placement / Integration:**
  - App(s): `apps/…` / root twin / `packages/*`
  - Shared packages touched:
- **Gotchas / Technical Debt Introduced:**
  -
- **Breaking Changes / Migration Needs:**
  -

## 🚫 Non-Goals & Boundaries
<!-- What was deliberately left out? Helps future-you understand scope. -->
-
-
-

## ✅ Verification, Testing & Visuals
<!-- How was this validated? Prefer commands + expected outcomes. -->

### Testing performed
- [ ] **Unit / Integration** (pytest, mypy, ruff, `tsc --noEmit`, package tests)
- [ ] **Build / typecheck** (e.g. `pnpm --filter waypoint build`)
- [ ] **E2E / Manual** verification (steps below)
- [ ] **Performance / Benchmark** regression (e1RM, inference, training loads, regime shifts, UI latency)
- [ ] **Edge cases / Failure modes** (boundaries, auth/401, empty DB, Sanctuary risk, cross-domain)
- [ ] **Privacy / safety** (no secrets in client, token gate, export/import integrity)
- [ ] **Other:**

### Manual / command checklist
```bash
# paste commands you actually ran
```

| Check | Command / Steps | Result |
|-------|-----------------|--------|
| Typecheck | | ☐ pass |
| Build | | ☐ pass |
| Persist round-trip | change → save → reload | ☐ pass |
| | | |

### Visuals / demos
<!-- Screenshots, GIFs, before/after, or links. Especially for UI surfaces. -->
-

### Metrics / evidence (when applicable)
- Before:
- After:
- Notes:

## 📚 Documentation, Governance & Audit Trail
<!-- Keep the system legible for agents + humans. -->
- [ ] **README / CONTEXT.md / decision pack** updated (or N/A: ___ )
- [ ] **Domain glossary** terms added/changed (or N/A)
- [ ] **Schema / migration** docs or SQL notes (or N/A)
- [ ] **Changelog-relevant** summary is clear from title + this body
- [ ] **Privacy / data-handling** notes if state shape or export changes
- [ ] **Open questions / follow-ups** filed or listed below

### Follow-ups (not in this PR)
-
-

## 🚢 Ops, Deploy & Migration
<!-- Single-user EC2/PGlite, env vars, backup, one-shot imports. -->
- **Env / config:** (`APP_TOKEN`, `WAYPOINT_PGLITE_DIR`, ports, …)
- **DB / persist:** (ensure/migrate, empty-driver, catalog refresh)
- **Deploy notes:** (systemd, reverse proxy, backup path)
- **Rollback:** (how to reverse safely)
- **Data migration / one-shot import:** (twin import scope, backup JSON)

## 🧾 Reviewer Focus
<!-- 2–5 things you most want eyes on. -->
1.
2.
3.

---

### PR hygiene (author self-check)
- [ ] Title follows Conventional Commits and is scannable
- [ ] Diff is the minimum coherent slice (no drive-by refactors unless called out)
- [ ] No secrets, tokens, or local absolute paths committed
- [ ] Branch is up to date with base (or conflicts called out)
- [ ] Ready for review / draft status set intentionally

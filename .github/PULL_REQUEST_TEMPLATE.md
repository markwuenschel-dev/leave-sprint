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
<!-- What was deliberately left out? Helps future-you understand scope and missing pieces. -->
-
-
-

## ✅ Verification, Testing & Visuals
<!-- How was this validated? Prefer commands + expected outcomes. Metrics when rigorous. -->

### Testing performed
- [ ] **Unit / Integration** (pytest, mypy, ruff, `tsc --noEmit`, package tests)
- [ ] **Build / typecheck** (e.g. `pnpm --filter waypoint build`)
- [ ] **E2E / Manual** verification (steps below)
- [ ] **Performance / Benchmark** regression (e1RM, inference, training loads, regime shifts, UI latency)
- [ ] **Edge cases / Failure modes** (boundaries, auth/401, empty DB, Sanctuary risk, cross-domain)
- [ ] **Privacy / safety** (no secrets in client, token gate, export/import integrity)
- [ ] **Other:**

### Commands Run / Evidence
```bash
# Example commands and outputs
```

| Check | Command / Steps | Result |
|-------|-----------------|--------|
| Typecheck | | ☐ pass |
| Build | | ☐ pass |
| Persist round-trip | change → save → reload | ☐ pass |
| | | |

### Visuals
<!-- Screenshots, GIFs, or before/after for UI, digital twin, game views. Crucial for visual history. -->
<!-- Drag & drop images here -->

### Metrics / evidence (when applicable)
- Before:
- After:
- Notes:

## 📚 Documentation Updates
<!-- For strong audit trails and maintainability. -->
- [ ] Updated README, AGENTS.md, CLAUDE.md, project docs, or inline comments
- [ ] Changelog / Release notes entry
- [ ] Governance / Privacy / Security alignment (local-only, no PII, LICENSE)
- [ ] CONTEXT.md / domain glossary / decision pack (or N/A: ___ )
- [ ] Schema / migration notes (or N/A)
- [ ] Other docs impacted:

### Follow-ups (not in this PR)
-
-

## ⚠️ Ops, Migration & Post-Merge Notes
<!-- Deployment, data, monitoring. Single-user EC2/PGlite, env vars, backups, one-shot imports. -->
- **Data Migrations / PGlite / DB Changes:**
- **Post-Deploy / Setup Steps:** (`APP_TOKEN`, `WAYPOINT_PGLITE_DIR`, ports, systemd, proxy)
- **Monitoring / Risks / Follow-ups:**
- **Rollback:** (how to reverse safely)

## 🧾 Reviewer Focus
<!-- 2–5 things you most want eyes on. -->
1.
2.
3.

## ✅ Checklist
- [ ] Code follows project standards (style, types, tests passing)
- [ ] Validation / No silent failures / Auditability ensured
- [ ] Documentation complete and self-contained for future self-review
- [ ] Dependencies reviewed (licensing, security, versions)
- [ ] Branch up-to-date with main
- [ ] PR enables easy understanding 6+ months from now
- [ ] All relevant sections above completed (delete unused)
- [ ] No secrets, tokens, or local absolute paths committed
- [ ] Diff is the minimum coherent slice (no drive-by refactors unless called out)

## Additional Context / Open Questions
<!-- Links to research, AI sessions, RTX 5090 notes, deferred work, etc. -->
-

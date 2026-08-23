# 🔧 [type(scope)]: Short descriptive title
<!--
  Conventional Commits, <72 chars.
  e.g. feat(waypoint): hybrid readiness glance · fix(persist): sendBeacon 401 path
       refactor(rubric): derive levels · chore: update deps
-->

## 🧭 Why
- **Source:** <!-- issue / decision pack / `.scratch/…` / research note -->
- **Problem:**
- **Approach:**

## 🏗️ What changed
<!-- Group by layer. Skip the lines that don't apply. -->
- **Schema / data / migrations:**
- **Store / persistence / API** (PGlite, `lib/db`, `lib/persist`):
- **Surfaces / UI** (nav, tokens, themes):
- **Shared packages** (`packages/rubric`, `packages/qbank`, `packages/practice-types`):
- **Config / dependencies:**

## 📌 Placement & scope
- **Target:** ☐ `apps/waypoint` (live) ☐ `packages/*` ☐ tooling / CI
- **Breaking changes / migration needed:**
- **Deliberately out of scope:**
- **Debt or gotchas introduced:**

## ✅ Verification

Every command below exists in this repo — `pnpm run` to list them, or see
`.github/workflows/ci.yml`, which runs exactly this sequence on push and PR.

| Gate | Command | Result |
|------|---------|--------|
| Install | `pnpm install --frozen-lockfile` | ☐ pass |
| Lint | `pnpm lint` | ☐ pass |
| Typecheck | `pnpm typecheck` | ☐ pass |
| Tests | `pnpm test` | ☐ pass |
| Waypoint build | `pnpm --filter waypoint build` | ☐ pass |

<!--
  Narrower reruns while iterating:
    pnpm typecheck:waypoint
    pnpm test:watch           pnpm lint:fix
-->

### Beyond the automated gates
- [ ] **New or updated tests** cover the behaviour this PR changes
      <!-- tests live in packages/*/src/*.test.ts and apps/waypoint/**/*.test.ts -->
- [ ] **Manual check** in a running app (`pnpm dev`) — steps:
- [ ] **Edge cases / failure modes** exercised (empty DB, 401 / token gate, import of a malformed backup)
- [ ] **No secrets or absolute local paths** in the diff; no live LLM or gateway call added to a test path
- [ ] N/A — explain:

### Evidence
```bash
# Paste the commands you ran and their real output / exit codes.
```

### Visuals
<!-- Screenshots, GIFs, before/after. Required for any UI or surface change. -->

## ⚠️ Ops & post-merge
- **Migrations / PGlite:** <!-- `pnpm --filter waypoint db:generate` then `pnpm db:migrate` -->
- **Env / setup steps:** <!-- APP_TOKEN, WAYPOINT_PGLITE_DIR, ports, systemd, proxy -->
- **Rollback:**

## 📚 Docs
- [ ] README / CONTEXT.md / CLAUDE.md / inline comments updated (or N/A)
- [ ] Scoring docs resynced if the rubric or grading changed (or N/A)

## 🧾 Reviewer focus
<!-- 2–5 things you most want eyes on. -->
1.
2.

## Follow-ups (not in this PR)
-

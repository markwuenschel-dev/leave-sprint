# Re-land standalone output to shrink the deploy image

Type: plan
Status: open
Supersedes: revert 74f71c5 (of a14e623)

## Goal

Ship a smaller, faster-to-build deploy image on the shared EC2 box by serving Next's
standalone bundle (`.next/standalone`, ~74 MB traced deps) instead of `next start` over the
whole workspace `node_modules`. This is a **coordinated app + infra change**; enabling the
flag in the app alone is a no-op (infra still runs `next start`) and only arms latent breakage.

## Why the first attempt was reverted (context)

`a14e623` added `output: "standalone"` + `outputFileTracingRoot`. Correctly reverted in
`74f71c5` because, on its own, it:
- delivered **zero benefit** — `infra/Dockerfile.leave-sprint` still boots `pnpm db:migrate && next start`; and
- armed **three tripwires** that fire the moment infra switches to `node server.js`.

### The three tripwires (verified against current code)

1. **Provider keys + APP_TOKEN vanish.** `apps/waypoint/next.config.ts:10–26` reads the repo-root
   `.env` at *config-eval* time and injects into `process.env`. The standalone `server.js` does
   **not** re-execute `next.config.ts`, so nothing loads root `.env` at runtime. Runtime consumers
   that read `process.env` directly then get `undefined`:
   - `lib/llm/registry.ts:8–11` — `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `XAI_API_KEY`, `GEMINI_API_KEY` → every provider becomes "unavailable".
   - `lib/llm/transcribe.ts:29` — `OPENAI_API_KEY` → dictation/transcribe 500s.
   - `proxy.ts:16` — `APP_TOKEN` → unlock/auth gate breaks.
   Root `.env` (gitignored, ~540 B) is the current single source of these secrets.

2. **Migration breaks.** Container boot runs `db:migrate` = `tsx lib/db/migrate.ts`
   (`apps/waypoint/package.json:10`). Standalone traces only what the *server* imports; the `tsx`
   CLI and `migrate.ts` are not in the bundle → migrate step fails and `next start`/server never serves.
   Note `migrate.ts` also reads `drizzle/*.sql` via `fs` at `process.cwd()/drizzle` — that folder
   must be present in the runtime image too (or fall through to the inline `BOOTSTRAP_SQL`).

3. **Dockerfile still serves the wrong thing.** `infra/Dockerfile.leave-sprint` runs `next start`;
   the standalone layout requires copying `.next/standalone` + `.next/static` + `public/` and
   running `node apps/waypoint/server.js`.

## The change

### Part A — App repo (`leave-sprint`), makes standalone *safe*; still a no-op under `next start`

A1. **Decouple secret loading from config-eval.** Stop relying on `next.config.ts` to load root
    `.env`. Options (pick one):
    - **A1a (recommended): inject via compose.** Infra passes `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`,
      `XAI_API_KEY`, `GEMINI_API_KEY`, `APP_TOKEN`, `WAYPOINT_PGLITE_DIR` as container env. Delete the
      config-time autoload (or guard it to dev only). Simplest; keys already read straight from
      `process.env` at runtime, so no code churn beyond removing the autoload.
    - **A1b: runtime dotenv.** Load `.env` at server entry (an `instrumentation.ts` register hook or
      a small `--import` preload copied into the image). Keeps single-file secrets but adds a runtime
      dep + must ensure the file lands in the image. Prefer A1a for a shared box.

A2. **Bundle-safe migration.** Replace the `tsx`-at-runtime migrate with one of:
    - **A2a (recommended): run migrate as a build/CI step or a separate one-shot** that has dev deps,
      writing to the mounted PGlite volume before the server container boots; server `start` becomes
      just `node server.js`. Cleanest separation.
    - **A2b: compile migrate** to plain JS (`tsc`/`esbuild` to `dist/migrate.js`), copy it + `drizzle/`
      into the image, boot with `node dist/migrate.js && node apps/waypoint/server.js`.
    - **A2c: keep `tsx`** but explicitly add it + `migrate.ts` + `drizzle/` to the image and
      `outputFileTracingIncludes` so they survive tracing. Most fragile; avoid.
    Keep the existing explicit `process.exit(0)` (PGlite keeps the event loop alive — see
    `migrate.ts:159–169`).

A3. **Re-add the flag.** Restore `output: "standalone"` and `outputFileTracingRoot: ../..`
    (the reverted hunk in `next.config.ts:33–34`). `images.unoptimized` is already set, good for standalone.

A4. **Verify locally before infra.** `pnpm build`, then from repo root:
    `node apps/waypoint/.next/standalone/apps/waypoint/server.js` with the env vars exported and
    `.next/static` + `public/` copied into the standalone tree. Confirm: page loads, a provider call
    works (keys present), unlock works (APP_TOKEN), DB reads/writes hit the PGlite dir.

### Part B — Infra repo (`/opt/stack/infra`), lands the savings

B1. Rewrite `Dockerfile.leave-sprint` multi-stage: build stage runs `pnpm build`; runtime stage
    copies `.next/standalone`, `.next/static`, `public/`, and (per A2) the migration artifact +
    `drizzle/`. `CMD` runs migrate (or rely on the one-shot) then `node apps/waypoint/server.js`.
B2. Compose: add the provider keys + `APP_TOKEN` to the `leave-sprint` service env
    (`docker compose` `environment:`/`env_file:`), keep `WAYPOINT_PGLITE_DIR=/data/pglite` and the
    `leavesprint_pglite` volume mount.
B3. Health: existing `deploy.ps1` retries `$Url/` through warmup — unchanged.

## Rollout order (must be app-first)

1. Land Part A on `main` (safe no-op — `next start` still works, so old Dockerfile keeps running).
2. Deploy once to confirm no regression (still on `next start`).
3. Land Part B in infra; deploy; verify image size drop + all four tripwire areas (providers,
   transcribe, unlock, migrate) green against `$Url`.
4. Rollback for B is `deploy.ps1 -Ref <prev-sha>` + revert the infra Dockerfile/compose.

## Open decisions for the user

- **A1a vs A1b** — compose env (recommended) vs runtime dotenv.
- **A2a vs A2b** — one-shot/CI migrate (recommended) vs compiled `dist/migrate.js` in-image.
- Do the repo/URL still say `leave-sprint` after this, or fold in the deferred
  `leave-sprint → waypoint` rename (see `issues/01-name-the-hub.md`) while touching infra? Currently deferred.

## Notes

- This doc lives in untracked `.scratch/`. Move to `docs/` or commit if it should survive a clean.
- App-side files touched: `apps/waypoint/next.config.ts`, `apps/waypoint/package.json`,
  possibly a new migrate entry + `instrumentation.ts`. No infra files exist in this repo.

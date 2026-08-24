import type { NextConfig } from "next";
import path from "path";
import fs from "fs";

// ── Shared cost-kill logic ───────────────────────────────────────────────────
// The cost-key list, the hermetic predicate, and the credential-blanking routine
// live in exactly ONE place — lib/llm/hermetic.ts — so this config and the app
// runtime can never disagree about which credentials are billable.
//
// Loading it here needs an ABSOLUTE require, not a normal import. Next 16
// transpiles next.config.ts to CommonJS on its own and evaluates it through
// `requireFromString` (next/dist/build/next-config-ts/require-hook.js:77-83),
// which builds a Module whose `filename` is never set. Node therefore has no
// base directory for a relative specifier, and BOTH `./lib/llm/hermetic` and
// `@/lib/llm/hermetic` (SWC rewrites the alias to a relative path) fail with
// MODULE_NOT_FOUND. An absolute path sidesteps resolution entirely; the `.ts`
// extension is picked up because the same loader registers a `require.extensions`
// hook for `.ts` (require-hook.js:36-72) that SWC-transpiles it on the way in.
//
// Consequence for hermetic.ts: it MUST stay free of runtime imports (no npm
// packages, no `@/` aliases) — see the DEPENDENCY RULE note at the top of it.
import type * as Hermetic from "./lib/llm/hermetic";
const { blankCostCredentials, isCostEnvKey, isHermeticEnv } = require(
  path.join(__dirname, "lib/llm/hermetic"),
) as typeof Hermetic;

// Single source of truth for secrets in this monorepo: load the repo-root .env
// into the server process. Next only auto-loads env files from this app's folder
// (apps/waypoint), not the repo root — this bridges that gap so keys live in one
// place at the root. An apps/waypoint/.env.local, if you add one, still wins
// (we only set vars that aren't already defined).
// Under hermetic/test, never inject cost credentials from .env (billable leak).
const hermeticBoot = isHermeticEnv();
if (hermeticBoot) blankCostCredentials();
try {
  const rootEnv = path.join(__dirname, "../../.env");
  for (const raw of fs.readFileSync(rootEnv, "utf8").split(/\r?\n/)) {
    const m = raw.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    if (hermeticBoot && isCostEnvKey(m[1])) continue;
    let val = m[2];
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[m[1]] === undefined) process.env[m[1]] = val;
  }
} catch {
  /* no repo-root .env — that's fine */
}

const nextConfig: NextConfig = {
  images: { unoptimized: true },
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: [
    "@waypoint/rubric",
    "@waypoint/qbank",
    "@waypoint/practice-types",
    "@waypoint/competency",
  ],
  // monorepo: silence wrong-lockfile root warning
  outputFileTracingRoot: path.join(__dirname, "../.."),
};

export default nextConfig;

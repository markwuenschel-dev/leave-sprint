import type { NextConfig } from "next";
import path from "path";
import fs from "fs";

/** Provider/gateway secrets — skipped when hermetic so tests never load billable keys from .env. */
const COST_ENV_KEYS = new Set([
  "LITELLM_VIRTUAL_KEY",
  "LITELLM_BASE_URL",
  "LITELLM_MODEL",
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "XAI_API_KEY",
  "GEMINI_API_KEY",
  "GOOGLE_API_KEY",
]);

function isHermeticBoot(): boolean {
  if ((process.env.LLG_ALLOW_LIVE ?? "").trim() === "1") return false;
  const flag = (process.env.LLG_HERMETIC ?? "").trim().toLowerCase();
  if (flag === "1" || flag === "true" || flag === "yes" || flag === "on") return true;
  if ((process.env.VITEST ?? "").trim() !== "") return true;
  if ((process.env.NODE_ENV ?? "").trim() === "test") return true;
  return false;
}

// Single source of truth for secrets in this monorepo: load the repo-root .env
// into the server process. Next only auto-loads env files from this app's folder
// (apps/waypoint), not the repo root — this bridges that gap so keys live in one
// place at the root. An apps/waypoint/.env.local, if you add one, still wins
// (we only set vars that aren't already defined).
// Under hermetic/test, never inject cost credentials from .env (billable leak).
const hermeticBoot = isHermeticBoot();
if (hermeticBoot) {
  for (const k of COST_ENV_KEYS) process.env[k] = "";
  process.env.LLG_HERMETIC = "1";
}
try {
  const rootEnv = path.join(__dirname, "../../.env");
  for (const raw of fs.readFileSync(rootEnv, "utf8").split(/\r?\n/)) {
    const m = raw.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    if (hermeticBoot && COST_ENV_KEYS.has(m[1])) continue;
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
  transpilePackages: ["@waypoint/rubric", "@waypoint/qbank", "@waypoint/practice-types"],
  // monorepo: silence wrong-lockfile root warning
  outputFileTracingRoot: path.join(__dirname, "../.."),
};

export default nextConfig;

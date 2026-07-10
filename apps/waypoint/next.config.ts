import type { NextConfig } from "next";
import path from "path";
import fs from "fs";

// Single source of truth for secrets in this monorepo: load the repo-root .env
// into the server process. Next only auto-loads env files from this app's folder
// (apps/waypoint), not the repo root — this bridges that gap so keys live in one
// place at the root. An apps/waypoint/.env.local, if you add one, still wins
// (we only set vars that aren't already defined).
try {
  const rootEnv = path.join(__dirname, "../../.env");
  for (const raw of fs.readFileSync(rootEnv, "utf8").split(/\r?\n/)) {
    const m = raw.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
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

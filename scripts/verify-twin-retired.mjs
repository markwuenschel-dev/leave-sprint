#!/usr/bin/env node
/**
 * INT-001 acceptance check: proves the frozen Leave Sprint Twin is fully
 * retired — its source paths are gone, no script/CI/doc reference to it
 * survives, and Waypoint itself is unaffected (test, typecheck, build).
 *
 * This is the sole proof for REQ-1/2/3 of INT-001's Slice Contract, so per
 * the verification-escape-hatch rule it stays in the repo rather than being
 * deleted after use. It has no ongoing purpose once the removal has shipped
 * and stayed shipped for a while — safe to delete in a later cleanup once
 * nobody expects a regression here.
 */
import { existsSync } from "node:fs";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = process.cwd();
let failed = false;

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  failed = true;
}

function ok(msg) {
  console.log(`OK: ${msg}`);
}

// --- REQ-1: root twin source paths must not exist ---
const removedPaths = [
  "app",
  "lib",
  "data",
  "drizzle",
  "drizzle.config.ts",
  "middleware.ts",
  "next.config.ts",
  "tsconfig.json",
  "next-env.d.ts",
];
for (const p of removedPaths) {
  const full = join(repoRoot, p);
  if (existsSync(full)) {
    fail(`root twin path still exists: ${p}`);
  } else {
    ok(`removed: ${p}`);
  }
}

// --- REQ-2/3: no stale script/CI reference to the twin survives ---
const stalePatterns = [
  /build:twin/i,
  /dev:twin/i,
  /start:twin/i,
  /typecheck:twin/i,
  /db:migrate:twin/i,
  /db:generate:twin/i,
  /Build frozen twin/i,
];
const skipDirs = new Set(["node_modules", ".git", ".next", "out", ".worktrees", ".pglite", ".scratch"]);
const textExt = new Set([".ts", ".tsx", ".js", ".mjs", ".json", ".md", ".yml", ".yaml", ".mts"]);

const selfPath = join(repoRoot, "scripts", "verify-twin-retired.mjs");

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (skipDirs.has(entry)) continue;
    const full = join(dir, entry);
    if (full === selfPath) continue; // this file's own pattern list isn't a stale reference
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full);
    } else {
      const ext = entry.slice(entry.lastIndexOf("."));
      if (!textExt.has(ext)) continue;
      const text = readFileSync(full, "utf8");
      for (const pattern of stalePatterns) {
        if (pattern.test(text)) {
          fail(`stale twin reference (${pattern}) in ${relative(repoRoot, full)}`);
        }
      }
    }
  }
}
walk(repoRoot);
if (!failed) ok("no stale twin script/CI references found");

// --- REQ-4/5/6: Waypoint itself is unaffected ---
function run(label, cmd, args) {
  const res = spawnSync(cmd, args, { cwd: repoRoot, stdio: "inherit", shell: process.platform === "win32" });
  if (res.status !== 0) {
    fail(`${label} exited ${res.status}`);
  } else {
    ok(`${label} passed`);
  }
}

run("pnpm test", "pnpm", ["test"]);
run("pnpm typecheck", "pnpm", ["typecheck"]);
run("pnpm --filter waypoint build", "pnpm", ["--filter", "waypoint", "build"]);

if (failed) {
  console.error("\nverify-twin-retired: FAILED");
  process.exit(1);
} else {
  console.log("\nverify-twin-retired: PASSED");
  process.exit(0);
}

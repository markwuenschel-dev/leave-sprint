#!/usr/bin/env node
/**
 * INT-004 D-003(a): the gate that makes schema drift impossible rather than unlikely.
 *
 * Generated migrations do NOT prevent drift on their own. Drift returns the moment
 * someone edits `schema.ts` and does not regenerate — the declaration and the SQL
 * that actually runs quietly disagree again, which is the exact failure INT-004
 * exists to end.
 *
 * So: regenerate, then require that nothing under the migrations folder changed. A
 * schema edit without a regenerated migration leaves a new .sql file and a modified
 * journal, the check sees a dirty tree, and CI fails with the fix spelled out.
 *
 * Scoped deliberately to apps/waypoint/drizzle: an unrelated dirty file elsewhere
 * is not this gate's business and must not make it flap.
 *
 *   node scripts/check-schema-drift.mjs
 *
 * Exit 0 — the committed migrations match schema.ts.
 * Exit 1 — they do not, or the generator could not be run.
 */
import { execFileSync, execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { existsSync } from "node:fs";
import path from "node:path";

const REPO = process.cwd();
const SCOPE = "apps/waypoint/drizzle";
// Optional receipt path. A gate that leaves no artifact cannot be cited as
// evidence for anything, so the check records what it actually observed.
const OUT = process.argv[2] ?? null;

function receipt(status, detail) {
  if (!OUT) return;
  mkdirSync(path.dirname(OUT), { recursive: true });
  writeFileSync(
    OUT,
    JSON.stringify(
      { check: "schema-drift", scope: SCOPE, status, detail, at: new Date().toISOString() },
      null,
      2,
    ) + "\n",
    "utf8",
  );
}
const APP = path.join(REPO, "apps", "waypoint");

function git(args) {
  return execFileSync("git", args, { cwd: REPO, encoding: "utf8" }).trim();
}

function fail(message) {
  console.error(`\n✗ schema drift check FAILED\n\n${message}\n`);
  process.exit(1);
}

if (!existsSync(path.join(APP, "drizzle", "meta", "_journal.json"))) {
  fail(
    `No migration journal at ${SCOPE}/meta/_journal.json.\n` +
      "The generated migrations are the schema's only executable form; without them\n" +
      "there is nothing for this gate to compare against.\n\n" +
      "Fix: pnpm --filter waypoint db:generate  (then commit the result)",
  );
}

// A pre-existing dirty scope would make the post-generate check meaningless: we
// could not tell a stale migration from an unrelated edit already in the tree.
const before = git(["status", "--porcelain", "--", SCOPE]);
if (before) {
  fail(
    `${SCOPE} already has uncommitted changes before regeneration:\n\n${before}\n\n` +
      "Commit or stash them first — this gate cannot distinguish them from drift.",
  );
}

console.log("• regenerating migrations from apps/waypoint/lib/db/schema.ts …");
try {
  // A single static command string rather than argv + shell: on Windows `pnpm` is a
  // .cmd shim that cannot be spawned directly, and argv-with-shell concatenates
  // without escaping (Node DEP0190). Nothing here is interpolated.
  execSync("pnpm --filter waypoint db:generate", {
    cwd: REPO,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
} catch (err) {
  fail(
    "Could not run `pnpm --filter waypoint db:generate`.\n\n" +
      `${err instanceof Error ? err.message : String(err)}`,
  );
}

const after = git(["status", "--porcelain", "--", SCOPE]);
if (after) {
  // Leave the regenerated files in place: seeing them is how the author fixes it.
  fail(
    "schema.ts and the committed migrations disagree. Regenerating produced changes:\n\n" +
      `${after}\n\n` +
      "This means the schema was edited without generating a migration for it, so the\n" +
      "database would never receive that change.\n\n" +
      "Fix: pnpm --filter waypoint db:generate  (then commit the generated files)",
  );
}

receipt("IN_SYNC", `${SCOPE} regenerated with no resulting change`);
console.log(`✓ ${SCOPE} is in sync with schema.ts — no drift`);

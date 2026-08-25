/**
 * The single migration executor for the Waypoint PGlite database.
 *
 * One authority (schema.ts), one generated migration folder (drizzle/), one
 * executor (this file). There is deliberately no second path: the lazy per-request
 * bootstrap and the inline hand-written DDL that used to live here are both gone,
 * because three hand-synchronised copies of a schema drift and did (INT-004).
 *
 * Invariants this file carries:
 *
 *   - Exactly one migrator per PGlite data directory. Deployment is single-writer;
 *     a second concurrent starter is not supported and is not defended against here.
 *   - A failed migration is never retried automatically. It exits nonzero and the
 *     process does not go on to serve traffic (`db:migrate && next start`).
 *   - A database with no ledger is adopted only when its catalog is demonstrably
 *     identical to the initial migration's. Otherwise it aborts before any write.
 *   - Failure output names the migration and the error class. Never data, never
 *     connection strings, never secrets.
 */
import path from "node:path";

import { migrate } from "drizzle-orm/pglite/migrator";

import {
  type MigrationIdentity,
  decideBaseline,
  readInitialMigration,
  stampStatements,
} from "./baseline";
import type { QueryableClient } from "./catalog";
import { getDb } from "./index";

/** PGlite exposes both; drizzle hangs it off the db instance as `$client`. */
type PgliteClient = QueryableClient & {
  exec(sql: string): Promise<unknown>;
  close?(): Promise<void>;
};

function clientOf(db: unknown): PgliteClient {
  const c = (db as { $client?: PgliteClient }).$client;
  if (!c?.query || !c?.exec) {
    throw new Error("[migrate] could not reach the PGlite client on the drizzle instance");
  }
  return c;
}

async function scratchDatabase(): Promise<PgliteClient> {
  const { PGlite } = await import("@electric-sql/pglite");
  // No path argument: in-memory, discarded as soon as the predicate is answered.
  return new PGlite() as unknown as PgliteClient;
}

function describe(m: MigrationIdentity): string {
  return `${m.tag} (created_at=${m.createdAt}, hash=${m.hash.slice(0, 12)}…)`;
}

async function main(): Promise<void> {
  const migrationsFolder = path.join(process.cwd(), "drizzle");
  const initial = readInitialMigration(migrationsFolder);

  const db = await getDb();
  const client = clientOf(db);

  const decision = await decideBaseline(client, initial, scratchDatabase);

  switch (decision.kind) {
    case "already-managed":
      console.log(`[migrate] ledger present (${decision.rows} applied); continuing`);
      break;
    case "empty":
      console.log("[migrate] empty database; applying migrations from scratch");
      break;
    case "stamp":
      // Validation is complete by the time we get here, so this writes only the
      // ledger row — no DDL — recording the migration the schema already matches.
      console.log(
        `[migrate] existing schema matches ${describe(initial)} exactly; ` +
          "adopting it by recording that migration as applied",
      );
      for (const stmt of stampStatements(initial)) await client.exec(stmt);
      break;
    case "abort":
      throw new Error(`[migrate] refusing to adopt this database.\n\n${decision.reason}`);
  }

  await migrate(db as never, { migrationsFolder });
  console.log("[migrate] up to date");
}

// PGlite's embedded WASM runtime keeps the event loop alive, so the process never
// exits on its own after migrations finish. In `pnpm db:migrate && next start` that
// hangs the migrate step forever and `next start` never runs (container serves nothing
// → 502). Exit explicitly once migrations complete. Queries are already awaited, so the
// file-backed DB is durably flushed by this point (verified: survives even SIGKILL).
main()
  .then(() => process.exit(0))
  .catch((e: unknown) => {
    // Identity and error class only. A migration failure is an operational event,
    // not a place to spill row data or configuration into a container log.
    const cls = e instanceof Error ? e.constructor.name : typeof e;
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[migrate] FAILED (${cls})`);
    console.error(msg);
    console.error("[migrate] the server will not start; no automatic retry.");
    process.exit(1);
  });

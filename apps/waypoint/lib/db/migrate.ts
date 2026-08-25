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
import { pathToFileURL } from "node:url";

import { migrate } from "drizzle-orm/pglite/migrator";

import {
  type MigrationIdentity,
  decideBaseline,
  readInitialMigration,
  stampSql,
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

/**
 * The whole migration sequence, with its inputs injectable.
 *
 * Exported and parameterised so a test can drive the real ordering — decide, then
 * stamp, then migrate — against an in-memory database. Previously this logic was
 * only reachable by running the file, so nothing could cover it.
 */
export async function runMigrations(opts: {
  db?: unknown;
  migrationsFolder?: string;
  makeScratch?: () => Promise<PgliteClient>;
} = {}): Promise<void> {
  const migrationsFolder = opts.migrationsFolder ?? path.join(process.cwd(), "drizzle");
  const initial = readInitialMigration(migrationsFolder);

  const db = opts.db ?? (await getDb());
  const client = clientOf(db);
  const makeScratch = opts.makeScratch ?? scratchDatabase;

  const decision = await decideBaseline(client, initial, makeScratch);

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
      await client.exec(stampSql(initial));
      break;
    case "abort":
      throw new Error(`[migrate] refusing to adopt this database.\n\n${decision.reason}`);
  }

  await migrate(db as never, { migrationsFolder });
  console.log("[migrate] up to date");
}

/**
 * Only self-execute when this file IS the entry point. Importing it (a test, a
 * tool) must not start a migration as a side effect.
 */
const isEntryPoint =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

// PGlite's embedded WASM runtime keeps the event loop alive, so the process never
// exits on its own after migrations finish. In `pnpm db:migrate && next start` that
// hangs the migrate step forever and `next start` never runs (container serves nothing
// → 502). Exit explicitly once migrations complete. Queries are already awaited, so the
// file-backed DB is durably flushed by this point (verified: survives even SIGKILL).
if (isEntryPoint) {
  runMigrations()
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
}

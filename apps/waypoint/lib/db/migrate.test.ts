/**
 * INT-004's proof burden (D-003). Three things must be mechanically true, not
 * merely believed:
 *
 *   (b) the generated migration, applied to an empty database, produces the
 *       CATALOG we expect — not merely "exit zero";
 *   (c) a demonstrably-compatible legacy database is adopted by stamping, and an
 *       incompatible one is REFUSED with the ledger left untouched;
 *       plus the empty and already-managed paths.
 *
 * (a) — regenerate and reject a diff — is a CI step, not a unit test: it needs the
 * drizzle-kit CLI. See scripts/check-schema-drift.mjs.
 *
 * Every database here is in-memory PGlite, created and dropped inside the test, so
 * nothing touches a real data directory and there is no temp dir to leak (R-008).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterEach, describe, expect, it } from "vitest";

import { LEDGER_SCHEMA, LEDGER_TABLE, decideBaseline, readInitialMigration, stampSql } from "./baseline";
import { readCatalog } from "./catalog";
import { runMigrations } from "./migrate";
import { schema } from "./schema";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS = path.join(HERE, "..", "..", "drizzle");
const LEGACY_SQL = readFileSync(path.join(HERE, "__fixtures__", "legacy-bootstrap.sql"), "utf8");

const EXPECTED_TABLES = [
  "wp_app_meta",
  "wp_applications",
  "wp_campaigns",
  "wp_file_defense",
  "wp_job_targets",
  "wp_problems",
  "wp_projects",
  "wp_qbank_status",
  "wp_resumes",
  "wp_rhythm_days",
  "wp_rubric_entries",
  "wp_weekly_reviews",
];

/** Named (non-primary-key) indexes the schema declares. */
const EXPECTED_NAMED_INDEXES = [
  "wp_campaigns_target_idx",
  "wp_job_targets_app_idx",
  "wp_rubric_date_idx",
];

const open: PGlite[] = [];
function fresh(): PGlite {
  const db = new PGlite();
  open.push(db);
  return db;
}
afterEach(async () => {
  // Closed even when a test throws, so a failing run cannot leak WASM instances.
  // Tolerant of double-close: the baseline predicate closes its own scratch
  // database as soon as it has the reference catalog, and that one is tracked here
  // too so a thrown predicate still cannot leak it.
  while (open.length) {
    try {
      await open.pop()?.close();
    } catch {
      /* already closed by the code under test */
    }
  }
});

const scratch = async () => fresh() as never;

async function tableNames(client: PGlite): Promise<string[]> {
  const r = await client.query<{ table_name: string }>(
    "select table_name from information_schema.tables where table_schema='public' order by table_name",
  );
  return r.rows.map((x) => x.table_name);
}

async function ledgerRows(client: PGlite): Promise<{ hash: string; created_at: string | number }[]> {
  const r = await client.query<{ hash: string; created_at: string | number }>(
    `select hash, created_at from ${LEDGER_SCHEMA}.${LEDGER_TABLE} order by created_at`,
  );
  return r.rows;
}

async function ledgerExists(client: PGlite): Promise<boolean> {
  const r = await client.query<{ reg: string | null }>(
    `select to_regclass('${LEDGER_SCHEMA}.${LEDGER_TABLE}') as reg`,
  );
  return Boolean(r.rows[0]?.reg);
}

describe("the migration folder is readable and singular", () => {
  it("exposes one initial migration with a journal timestamp and a real hash", () => {
    const m = readInitialMigration(MIGRATIONS);
    expect(m.createdAt).toBeGreaterThan(0);
    expect(m.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(m.sql.length).toBeGreaterThan(0);
  });
});

describe("(b) an empty database migrates to the expected catalog", () => {
  it("creates exactly the declared tables", async () => {
    const client = fresh();
    await migrate(drizzle(client, { schema }) as never, { migrationsFolder: MIGRATIONS });
    expect(await tableNames(client)).toEqual(EXPECTED_TABLES);
  });

  it("creates every named index the schema declares", async () => {
    const client = fresh();
    await migrate(drizzle(client, { schema }) as never, { migrationsFolder: MIGRATIONS });
    const cat = await readCatalog(client);
    for (const idx of EXPECTED_NAMED_INDEXES) {
      expect(cat.indexes.some((i) => i.startsWith(`${idx} ::`)), idx).toBe(true);
    }
  });

  it("records the migration in the ledger with the journal's own timestamp", async () => {
    const client = fresh();
    await migrate(drizzle(client, { schema }) as never, { migrationsFolder: MIGRATIONS });
    const initial = readInitialMigration(MIGRATIONS);
    const rows = await ledgerRows(client);
    expect(rows).toHaveLength(1);
    expect(Number(rows[0].created_at)).toBe(initial.createdAt);
    expect(rows[0].hash).toBe(initial.hash);
  });

  it("is idempotent — a second run applies nothing", async () => {
    const client = fresh();
    const db = drizzle(client, { schema }) as never;
    await migrate(db, { migrationsFolder: MIGRATIONS });
    await migrate(db, { migrationsFolder: MIGRATIONS });
    expect(await ledgerRows(client)).toHaveLength(1);
  });
});

describe("(c) baseline adoption of databases that predate the ledger", () => {
  it("reports an empty database as empty", async () => {
    const client = fresh();
    const decision = await decideBaseline(client, readInitialMigration(MIGRATIONS), scratch);
    expect(decision.kind).toBe("empty");
  });

  it("adopts a demonstrably compatible legacy database by stamping it", async () => {
    const client = fresh();
    await client.exec(LEGACY_SQL);
    const initial = readInitialMigration(MIGRATIONS);

    const decision = await decideBaseline(client, initial, scratch);
    expect(decision.kind).toBe("stamp");

    await client.exec(stampSql(initial));
    const rows = await ledgerRows(client);
    expect(rows).toHaveLength(1);
    expect(Number(rows[0].created_at)).toBe(initial.createdAt);
    expect(rows[0].hash).toBe(initial.hash);
  });

  it("leaves a stamped legacy database untouched on the next migrate", async () => {
    const client = fresh();
    await client.exec(LEGACY_SQL);
    const initial = readInitialMigration(MIGRATIONS);
    await client.exec(stampSql(initial));

    const before = await readCatalog(client);
    await migrate(drizzle(client, { schema }) as never, { migrationsFolder: MIGRATIONS });
    const after = await readCatalog(client);

    // The whole point of stamping: the initial migration must NOT run again.
    expect(after).toEqual(before);
    expect(await ledgerRows(client)).toHaveLength(1);
  });

  it("treats an already-managed database as managed", async () => {
    const client = fresh();
    await migrate(drizzle(client, { schema }) as never, { migrationsFolder: MIGRATIONS });
    const decision = await decideBaseline(client, readInitialMigration(MIGRATIONS), scratch);
    expect(decision.kind).toBe("already-managed");
  });

  it("REFUSES a partially-upgraded legacy database and writes no ledger", async () => {
    const client = fresh();
    await client.exec(LEGACY_SQL);
    // A partial upgrade: the table is present, one column it should carry is not.
    await client.exec("ALTER TABLE wp_app_meta DROP COLUMN mock_asked");

    const decision = await decideBaseline(client, readInitialMigration(MIGRATIONS), scratch);
    expect(decision.kind).toBe("abort");
    if (decision.kind !== "abort") throw new Error("unreachable");
    expect(decision.diff.missing.some((m) => m.includes("mock_asked"))).toBe(true);
    expect(decision.reason).toContain("Nothing has been changed");
    // Ledger state unchanged is the load-bearing half of this test.
    expect(await ledgerExists(client)).toBe(false);
  });

  it("REFUSES a legacy database missing a named index, not just a column", async () => {
    const client = fresh();
    await client.exec(LEGACY_SQL);
    await client.exec("DROP INDEX wp_campaigns_target_idx");

    const decision = await decideBaseline(client, readInitialMigration(MIGRATIONS), scratch);
    expect(decision.kind).toBe("abort");
    if (decision.kind !== "abort") throw new Error("unreachable");
    expect(decision.diff.missing.some((m) => m.includes("wp_campaigns_target_idx"))).toBe(true);
    expect(await ledgerExists(client)).toBe(false);
  });

  it("REFUSES a database carrying objects the migration does not describe", async () => {
    const client = fresh();
    await client.exec(LEGACY_SQL);
    await client.exec("CREATE TABLE wp_not_ours (id text primary key)");

    const decision = await decideBaseline(client, readInitialMigration(MIGRATIONS), scratch);
    expect(decision.kind).toBe("abort");
    if (decision.kind !== "abort") throw new Error("unreachable");
    expect(decision.diff.extra.some((m) => m.includes("wp_not_ours"))).toBe(true);
    expect(await ledgerExists(client)).toBe(false);
  });
});

describe("the archived legacy DDL still matches the generated migration", () => {
  // This is the regression that would have broken production: the two indexes the
  // raw DDL created were never declared in schema.ts, so the generated migration
  // omitted them and the compatibility predicate could never have passed.
  it("produces a catalog identical to the initial migration's", async () => {
    const legacy = fresh();
    await legacy.exec(LEGACY_SQL);

    const generated = fresh();
    await migrate(drizzle(generated, { schema }) as never, { migrationsFolder: MIGRATIONS });

    const a = await readCatalog(legacy);
    const b = await readCatalog(generated);
    expect(a.columns).toEqual(b.columns);
    expect(a.indexes).toEqual(b.indexes);
    expect(a.tableCount).toBe(EXPECTED_TABLES.length);
  });
});

describe("runMigrations — the real sequencing, not a re-issue of its steps", () => {
  const run = (client: PGlite) =>
    runMigrations({
      db: drizzle(client, { schema }),
      migrationsFolder: MIGRATIONS,
      makeScratch: async () => fresh() as never,
    });

  it("migrates an empty database and records the ledger", async () => {
    const client = fresh();
    await run(client);
    expect(await tableNames(client)).toEqual(EXPECTED_TABLES);
    expect(await ledgerRows(client)).toHaveLength(1);
  });

  it("adopts a legacy database without touching its data", async () => {
    const client = fresh();
    await client.exec(LEGACY_SQL);
    await client.exec("insert into wp_app_meta (id, phase) values (1,'B')");

    await run(client);

    const rows = await ledgerRows(client);
    expect(rows).toHaveLength(1);
    expect(Number(rows[0].created_at)).toBe(readInitialMigration(MIGRATIONS).createdAt);
    // The point of adoption: the row that was there before is still there after.
    const meta = await client.query<{ id: number; phase: string }>("select id, phase from wp_app_meta");
    expect(meta.rows).toEqual([{ id: 1, phase: "B" }]);
  });

  it("is idempotent across repeated runs", async () => {
    const client = fresh();
    await run(client);
    await run(client);
    expect(await ledgerRows(client)).toHaveLength(1);
  });

  it("throws and writes no ledger when the database cannot be adopted", async () => {
    const client = fresh();
    await client.exec(LEGACY_SQL);
    await client.exec("ALTER TABLE wp_app_meta DROP COLUMN mock_asked");

    await expect(run(client)).rejects.toThrow(/refusing to adopt/);
    expect(await ledgerExists(client)).toBe(false);
  });
});

describe("a half-written ledger is not mistaken for an adopted database", () => {
  // The crash window: if the process dies between creating the ledger table and
  // inserting its row, an empty ledger is left behind. Reading that as "managed"
  // would let drizzle replay the initial migration against a populated schema.
  it("treats a ledger table with no rows as un-adopted", async () => {
    const client = fresh();
    await client.exec(LEGACY_SQL);
    await client.exec(`CREATE SCHEMA IF NOT EXISTS ${LEDGER_SCHEMA}`);
    await client.exec(
      `CREATE TABLE IF NOT EXISTS ${LEDGER_SCHEMA}.${LEDGER_TABLE} (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at bigint)`,
    );

    const decision = await decideBaseline(client, readInitialMigration(MIGRATIONS), scratch);
    expect(decision.kind).toBe("stamp");
  });

  it("stamps atomically — the ledger row and its table arrive together", async () => {
    const client = fresh();
    await client.exec(LEGACY_SQL);
    const initial = readInitialMigration(MIGRATIONS);
    await client.exec(stampSql(initial));
    const rows = await ledgerRows(client);
    expect(rows).toHaveLength(1);
    expect(rows[0].hash).toBe(initial.hash);
  });

  it("leaves NOTHING behind when the stamp is interrupted mid-transaction", async () => {
    // Atomicity demonstrated rather than argued from BEGIN/COMMIT: inject a
    // failing statement before the COMMIT and assert the ledger table itself
    // never comes into existence. This is the crash the transaction exists for.
    const client = fresh();
    await client.exec(LEGACY_SQL);
    const initial = readInitialMigration(MIGRATIONS);
    const interrupted = stampSql(initial).replace("COMMIT;", "SELECT 1 / 0; COMMIT;");

    await expect(client.exec(interrupted)).rejects.toThrow(/division by zero/i);
    // The session is left inside an aborted transaction block; a real process
    // would have died and reconnected. Clear it, then look at what persisted.
    await client.exec("ROLLBACK;").catch(() => undefined);
    expect(await ledgerExists(client)).toBe(false);
  });
});

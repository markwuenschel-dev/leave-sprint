/**
 * The baseline decision: what to do with a database that predates the migration ledger.
 *
 * Waypoint's schema was created for months by hand-written DDL with no ledger, so
 * the first run of a real migrator meets databases it has no history for. Running
 * the initial migration against one would fail (its `CREATE TABLE` statements are
 * not `IF NOT EXISTS`); stamping one blindly would permanently skip DDL it needs.
 *
 * Four outcomes, and the unsafe one is an abort rather than a guess:
 *
 *   already-managed  a ledger exists — nothing to decide, migrate normally
 *   empty            no application tables — migrate normally
 *   stamp            catalog is demonstrably identical to the initial migration's,
 *                    so record that migration as applied and move on
 *   abort            anything else: partial, unrecognised, or carrying objects the
 *                    migration does not describe
 *
 * The reference catalog is materialised by applying the migration to a throwaway
 * database rather than hand-written, so the predicate cannot drift from the
 * migration it describes. Validation completes before any ledger write.
 */
import { readMigrationFiles } from "drizzle-orm/migrator";

import {
  type Catalog,
  type CatalogDiff,
  type QueryableClient,
  describeMismatch,
  diffCatalog,
  isEmptyOfAppTables,
  readCatalog,
} from "./catalog";

export const LEDGER_SCHEMA = "drizzle";
export const LEDGER_TABLE = "__drizzle_migrations";

export interface MigrationIdentity {
  tag: string;
  hash: string;
  /** Journal `when`; the migrator compares only this when deciding what to apply. */
  createdAt: number;
  sql: string[];
}

export type BaselineDecision =
  | { kind: "already-managed"; rows: number }
  | { kind: "empty" }
  | { kind: "stamp"; migration: MigrationIdentity }
  | { kind: "abort"; reason: string; diff: CatalogDiff };

/**
 * Read the initial migration's identity from the journal.
 *
 * Uses drizzle's own reader so the hash and timestamp are exactly the ones the
 * migrator will compare against — never a hardcoded "0000" or a re-derived hash.
 */
export function readInitialMigration(migrationsFolder: string): MigrationIdentity {
  const files = readMigrationFiles({ migrationsFolder }) as Array<{
    sql: string[];
    hash: string;
    folderMillis: number;
  }>;
  if (files.length === 0) {
    throw new Error(`[baseline] no migrations found in ${migrationsFolder}`);
  }
  const first = files[0];
  return {
    tag: `migration@${first.folderMillis}`,
    hash: first.hash,
    createdAt: first.folderMillis,
    sql: first.sql,
  };
}

/** Does the drizzle ledger table exist, and how many rows does it carry? */
export async function readLedger(client: QueryableClient): Promise<number | null> {
  const present = await client.query<{ reg: string | null }>(
    `select to_regclass('${LEDGER_SCHEMA}.${LEDGER_TABLE}') as reg`,
  );
  if (!present.rows[0]?.reg) return null;
  const count = await client.query<{ n: number | string }>(
    `select count(*)::int as n from ${LEDGER_SCHEMA}.${LEDGER_TABLE}`,
  );
  return Number(count.rows[0]?.n ?? 0);
}

/**
 * Build the catalog the initial migration produces, by applying it to a scratch
 * database the caller supplies and then throwing that database away.
 */
export async function referenceCatalog(
  migration: MigrationIdentity,
  makeScratch: () => Promise<QueryableClient & { exec(sql: string): Promise<unknown>; close?(): Promise<void> }>,
): Promise<Catalog> {
  const scratch = await makeScratch();
  try {
    for (const stmt of migration.sql) {
      const trimmed = stmt.trim();
      if (trimmed) await scratch.exec(trimmed);
    }
    return await readCatalog(scratch);
  } finally {
    await scratch.close?.();
  }
}

export async function decideBaseline(
  client: QueryableClient,
  migration: MigrationIdentity,
  makeScratch: () => Promise<QueryableClient & { exec(sql: string): Promise<unknown>; close?(): Promise<void> }>,
): Promise<BaselineDecision> {
  const ledgerRows = await readLedger(client);
  if (ledgerRows !== null) return { kind: "already-managed", rows: ledgerRows };

  const live = await readCatalog(client);
  if (isEmptyOfAppTables(live)) return { kind: "empty" };

  const reference = await referenceCatalog(migration, makeScratch);
  const diff = diffCatalog(live, reference);
  if (diff.identical) return { kind: "stamp", migration };

  return {
    kind: "abort",
    diff,
    reason:
      "This database has no migration ledger and its schema is not identical to the " +
      "initial migration's, so it cannot be safely adopted.\n\n" +
      describeMismatch(diff) +
      "\n\nNothing has been changed. Resolve by hand: bring the schema to the " +
      "expected shape, or start from an empty data directory, then re-run.",
  };
}

/** SQL that records the initial migration as applied. Ledger write only — no DDL. */
export function stampStatements(migration: MigrationIdentity): string[] {
  return [
    `CREATE SCHEMA IF NOT EXISTS "${LEDGER_SCHEMA}"`,
    `CREATE TABLE IF NOT EXISTS "${LEDGER_SCHEMA}"."${LEDGER_TABLE}" (` +
      `id SERIAL PRIMARY KEY, hash text NOT NULL, created_at bigint)`,
    `INSERT INTO "${LEDGER_SCHEMA}"."${LEDGER_TABLE}" ("hash", "created_at") ` +
      `VALUES ('${migration.hash}', ${migration.createdAt})`,
  ];
}

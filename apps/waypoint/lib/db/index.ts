/**
 * PGlite-only DB for Waypoint Day-1 (local-first; no remote Postgres / Railway).
 */

import type { PgDatabase } from "drizzle-orm/pg-core";
import path from "path";
import { schema } from "./schema";

export type AppDb = PgDatabase<any, typeof schema>;

declare global {
  // eslint-disable-next-line no-var
  var __WP_DB__: Promise<AppDb> | undefined;
}

async function init(): Promise<AppDb> {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const dir =
    process.env.WAYPOINT_PGLITE_DIR ||
    path.join(process.cwd(), ".pglite");
  console.log(`[waypoint db] pglite at ${dir}`);
  const client = new PGlite(dir);
  return drizzle(client, { schema }) as unknown as AppDb;
}

export function getDb(): Promise<AppDb> {
  if (!globalThis.__WP_DB__) globalThis.__WP_DB__ = init();
  return globalThis.__WP_DB__;
}

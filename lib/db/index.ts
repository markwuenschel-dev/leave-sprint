/**
 * Driver-aware Drizzle connection, cached on globalThis (survives HMR, avoids
 * connection storms). Uses postgres.js when DATABASE_URL is a real Postgres URL
 * (Railway/prod), otherwise falls back to an embedded PGlite instance for local
 * dev — so `pnpm dev` works with zero database setup.
 */

import type { PgDatabase } from 'drizzle-orm/pg-core';
import { schema } from './schema';

export type AppDb = PgDatabase<any, typeof schema>;

declare global {
  // eslint-disable-next-line no-var
  var __LS_DB__: Promise<AppDb> | undefined;
}

function isPostgresUrl(url: string | undefined): url is string {
  return !!url && /^postgres(ql)?:\/\//.test(url);
}

async function init(): Promise<AppDb> {
  const url = process.env.DATABASE_URL;
  console.log(
    isPostgresUrl(url)
      ? "[db] using postgres (persistent)"
      : "[db] using pglite fallback (EPHEMERAL — set DATABASE_URL to a persistent Postgres to keep data across restarts)",
  );
  if (isPostgresUrl(url)) {
    const postgres = (await import('postgres')).default;
    const { drizzle } = await import('drizzle-orm/postgres-js');
    const local = /localhost|127\.0\.0\.1/.test(url);
    const client = postgres(url, { max: 5, ssl: local ? undefined : 'require' });
    return drizzle(client, { schema }) as unknown as AppDb;
  }
  // Local dev fallback: embedded Postgres (file-backed).
  const { PGlite } = await import('@electric-sql/pglite');
  const { drizzle } = await import('drizzle-orm/pglite');
  const dir = process.env.PGLITE_DIR || '.pglite';
  const client = new PGlite(dir);
  return drizzle(client, { schema }) as unknown as AppDb;
}

export function getDb(): Promise<AppDb> {
  if (!globalThis.__LS_DB__) globalThis.__LS_DB__ = init();
  return globalThis.__LS_DB__;
}

export function usingPostgres(): boolean {
  return isPostgresUrl(process.env.DATABASE_URL);
}

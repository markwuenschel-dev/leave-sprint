/**
 * Programmatic migration runner (run at deploy start via tsx). Driver-aware:
 * uses the postgres-js migrator for Railway/prod and the PGlite migrator for
 * local dev. Applies the committed SQL in ./drizzle idempotently.
 *
 *   pnpm db:migrate            # local (PGlite)
 *   DATABASE_URL=... pnpm db:migrate   # against a real Postgres
 */

import { getDb, usingPostgres } from './index';

async function main() {
  const db = await getDb();
  const migrationsFolder = './drizzle';

  if (usingPostgres()) {
    const { migrate } = await import('drizzle-orm/postgres-js/migrator');
    await migrate(db as never, { migrationsFolder });
  } else {
    const { migrate } = await import('drizzle-orm/pglite/migrator');
    await migrate(db as never, { migrationsFolder });
  }

  // eslint-disable-next-line no-console
  console.log(`Migrations applied (${usingPostgres() ? 'postgres' : 'pglite'}).`);
  process.exit(0);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Migration failed:', err);
  process.exit(1);
});

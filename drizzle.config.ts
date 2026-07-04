import type { Config } from "drizzle-kit";

/**
 * drizzle-kit config — used at dev time to generate SQL migrations from the
 * schema (`pnpm db:generate`). Migrations are applied at runtime by
 * lib/db/migrate.ts (driver-aware), not by drizzle-kit.
 */
export default {
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
} satisfies Config;

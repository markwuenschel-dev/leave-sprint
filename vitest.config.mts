import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const abs = (p: string) => fileURLToPath(new URL(p, import.meta.url));

/**
 * Single root project. The workspace packages are TS-source-only (no build step),
 * so `@waypoint/*` is aliased straight at `src/index.ts` — the same mapping
 * apps/waypoint/tsconfig.json:8-11 declares for tsc and next.config.ts declares
 * via transpilePackages.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@waypoint/rubric': abs('./packages/rubric/src/index.ts'),
      '@waypoint/qbank': abs('./packages/qbank/src/index.ts'),
      '@waypoint/practice-types': abs('./packages/practice-types/src/index.ts'),
      '@/': `${abs('./apps/waypoint')}/`,
    },
  },
  test: {
    environment: 'node',
    include: ['packages/*/src/**/*.test.ts', 'apps/waypoint/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/.next/**', '**/out/**', '**/.scratch/**'],
    // Deterministic clock-free assertions: tests that need "today" pass it in.
    passWithNoTests: false,
  },
});

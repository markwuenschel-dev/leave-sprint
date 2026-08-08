/**
 * Hermetic / cost-kill helpers — the single source of truth for the cost-key
 * list, the hermetic predicate, and credential blanking.
 *
 * Unit tests, vitest, and CI must never bill LiteLLM or raw providers via a
 * developer .env that contains LITELLM_VIRTUAL_KEY / OPENAI_API_KEY / …
 *
 * Live gateway traffic is allowed in normal `next dev` (NODE_ENV=development)
 * unless LLG_HERMETIC=1 is set. Opt back into live calls under test with
 * LLG_ALLOW_LIVE=1 (explicit only).
 *
 * ── DEPENDENCY RULE (load-bearing) ───────────────────────────────────────────
 * apps/waypoint/next.config.ts imports this module with a RELATIVE specifier
 * (`./lib/llm/hermetic`) so the cost-kill list exists in exactly one place.
 * Next compiles the config before the app's module graph exists, so tsconfig
 * `paths` aliases (`@/…`, `@waypoint/…`) do NOT resolve there. Therefore this
 * file MUST stay free of runtime imports — no npm packages, no aliases, no
 * relative imports of aliased modules. Type-only references are fine (erased).
 */

export const COST_ENV_KEYS = [
  "LITELLM_VIRTUAL_KEY",
  "LITELLM_BASE_URL",
  "LITELLM_MODEL",
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "XAI_API_KEY",
  "GEMINI_API_KEY",
  "GOOGLE_API_KEY",
] as const;

export type CostEnvKey = (typeof COST_ENV_KEYS)[number];

const COST_ENV_KEY_SET: ReadonlySet<string> = new Set<string>(COST_ENV_KEYS);

/** Membership test against the one cost-key list (used by the repo-root .env loader). */
export function isCostEnvKey(name: string): boolean {
  return COST_ENV_KEY_SET.has(name);
}

/**
 * Trimmed value of `name`, or undefined when unset, empty, or whitespace-only.
 *
 * An env var that is *defined but empty* — `SERVICE_NAME=` in a .env file, a
 * bare `-e SERVICE_NAME` in Docker, an empty CI variable — is not a value. It
 * is absence with a different type, and `??` chains do not see it as absence.
 * Reading env through this helper is what keeps the two identical.
 */
export function envValue(name: string, env: NodeJS.ProcessEnv = process.env): string | undefined {
  const raw = env[name];
  if (raw === undefined) return undefined;
  const trimmed = raw.trim();
  return trimmed === "" ? undefined : trimmed;
}

/** First env var in `names` with a real (non-empty) value; undefined if none has one. */
export function firstEnvValue(
  names: readonly string[],
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  for (const name of names) {
    const value = envValue(name, env);
    if (value !== undefined) return value;
  }
  return undefined;
}

export function isHermeticEnv(env: NodeJS.ProcessEnv = process.env): boolean {
  if (envValue("LLG_ALLOW_LIVE", env) === "1") return false;
  const flag = envValue("LLG_HERMETIC", env)?.toLowerCase();
  if (flag === "1" || flag === "true" || flag === "yes" || flag === "on") return true;
  if (envValue("VITEST", env) !== undefined) return true;
  if (envValue("NODE_ENV", env) === "test") return true;
  return false;
}

/** Blank cost credentials in-process (process env wins over later .env loads). */
export function blankCostCredentials(env: NodeJS.ProcessEnv = process.env): void {
  for (const key of COST_ENV_KEYS) {
    env[key] = "";
  }
  env.LLG_HERMETIC = "1";
}

export function assertNotHermeticLiveCall(context: string, env: NodeJS.ProcessEnv = process.env): void {
  if (!isHermeticEnv(env)) return;
  throw new Error(
    `${context}: refusing live LLM call under hermetic mode ` +
      `(LLG_HERMETIC / NODE_ENV=test / VITEST). Set LLG_ALLOW_LIVE=1 only for intentional paid runs.`,
  );
}

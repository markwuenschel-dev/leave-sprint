/**
 * Hermetic / cost-kill helpers.
 *
 * Unit tests, vitest, and CI must never bill LiteLLM or raw providers via a
 * developer .env that contains LITELLM_VIRTUAL_KEY / OPENAI_API_KEY / …
 *
 * Live gateway traffic is allowed in normal `next dev` (NODE_ENV=development)
 * unless LLG_HERMETIC=1 is set. Opt back into live calls under test with
 * LLG_ALLOW_LIVE=1 (explicit only).
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

export function isHermeticEnv(env: NodeJS.ProcessEnv = process.env): boolean {
  if ((env.LLG_ALLOW_LIVE ?? "").trim() === "1") return false;
  const flag = (env.LLG_HERMETIC ?? "").trim().toLowerCase();
  if (flag === "1" || flag === "true" || flag === "yes" || flag === "on") return true;
  if ((env.VITEST ?? "").trim() !== "") return true;
  if ((env.NODE_ENV ?? "").trim() === "test") return true;
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

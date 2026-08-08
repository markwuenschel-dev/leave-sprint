/**
 * AI Interviewer provider seam (ADR-0002). Server-side only.
 *
 * One active provider per session behind a common interface; the pipeline owns
 * the observations intake + monotonicity retry. Adapters normalize each vendor's
 * structured output to OBSERVATIONS_JSON_SCHEMA.
 *
 * When LITELLM_VIRTUAL_KEY is set, all four providers route through the local
 * LiteLLM gateway (OpenAI-compatible aliases). Otherwise direct provider keys.
 */
export * from "./types";
export * from "./pipeline";
export * from "./registry";
// Hermetic cost-kill seam. App code should reach it through this barrel;
// apps/waypoint/next.config.ts is the one exception — it imports
// ./lib/llm/hermetic directly, because tsconfig `@/…` aliases are not available
// at Next config load time. hermetic.ts is therefore the single declaration of
// the cost-key list and the predicate, consumed by both.
export {
  isHermeticEnv,
  blankCostCredentials,
  assertNotHermeticLiveCall,
  envValue,
  firstEnvValue,
  isCostEnvKey,
  COST_ENV_KEYS,
  type CostEnvKey,
} from "./hermetic";
export { anthropicProvider } from "./adapters/anthropic";
export {
  openaiProvider,
  grokProvider,
  gatewayProvider,
  GATEWAY_MODEL_ALIAS,
} from "./adapters/openai";
export { geminiProvider } from "./adapters/gemini";

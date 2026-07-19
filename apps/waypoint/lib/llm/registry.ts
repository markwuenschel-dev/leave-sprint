/** Provider registry — a provider is "available" iff its key is set, or the LiteLLM gateway is configured. */
import type { InterviewProvider, ProviderId } from "./types";
import { anthropicProvider } from "./adapters/anthropic";
import {
  openaiProvider,
  grokProvider,
  gatewayProvider,
  GATEWAY_MODEL_ALIAS,
} from "./adapters/openai";
import { geminiProvider } from "./adapters/gemini";

export const PROVIDER_ENV_KEY: Record<ProviderId, string> = {
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  grok: "XAI_API_KEY",
  gemini: "GEMINI_API_KEY",
};

const ALL_PROVIDERS = Object.keys(PROVIDER_ENV_KEY) as ProviderId[];

/** True when a real LiteLLM virtual key is configured (must start with sk-). */
export function gatewayEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const key = (env.LITELLM_VIRTUAL_KEY ?? "").trim();
  return key.startsWith("sk-");
}

export function gatewayBaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  const base = (env.LITELLM_BASE_URL ?? "http://localhost:4000/v1").trim();
  return base.replace(/\/$/, "") || "http://localhost:4000/v1";
}

/** Providers whose API key is configured, or all four when the gateway virtual key is set. */
export function availableProviders(env: NodeJS.ProcessEnv = process.env): ProviderId[] {
  if (gatewayEnabled(env)) return [...ALL_PROVIDERS];
  return ALL_PROVIDERS.filter((id) => !!env[PROVIDER_ENV_KEY[id]]);
}

/**
 * Construct the active provider for a session.
 * When LITELLM_VIRTUAL_KEY is set, all providers go through the local LiteLLM
 * gateway (OpenAI-compatible) using stable aliases — no raw provider keys needed
 * in this app. Dictation (transcribe) still uses OPENAI_API_KEY separately.
 */
export function getProvider(id: ProviderId, env: NodeJS.ProcessEnv = process.env): InterviewProvider {
  if (gatewayEnabled(env)) {
    const apiKey = (env.LITELLM_VIRTUAL_KEY ?? "").trim();
    // Optional single override for all gateway traffic (e.g. llm-general)
    const modelOverride = (env.LITELLM_MODEL ?? "").trim() || undefined;
    return gatewayProvider({
      id,
      apiKey,
      baseURL: gatewayBaseUrl(env),
      model: modelOverride ?? GATEWAY_MODEL_ALIAS[id],
    });
  }

  const key = env[PROVIDER_ENV_KEY[id]];
  if (!key) throw new Error(`Provider "${id}" unavailable: ${PROVIDER_ENV_KEY[id]} is not set.`);
  switch (id) {
    case "anthropic":
      return anthropicProvider({ apiKey: key });
    case "openai":
      return openaiProvider({ apiKey: key });
    case "grok":
      return grokProvider({ apiKey: key });
    case "gemini":
      return geminiProvider({ apiKey: key });
  }
}

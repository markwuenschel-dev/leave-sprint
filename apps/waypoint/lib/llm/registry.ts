/** Provider registry — a provider is "available" iff its server-side key is set. */
import type { InterviewProvider, ProviderId } from "./types";
import { anthropicProvider } from "./adapters/anthropic";
import { openaiProvider, grokProvider } from "./adapters/openai";
import { geminiProvider } from "./adapters/gemini";

export const PROVIDER_ENV_KEY: Record<ProviderId, string> = {
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  grok: "XAI_API_KEY",
  gemini: "GEMINI_API_KEY",
};

const ALL_PROVIDERS = Object.keys(PROVIDER_ENV_KEY) as ProviderId[];

/** Providers whose API key is configured in the environment. */
export function availableProviders(env: NodeJS.ProcessEnv = process.env): ProviderId[] {
  return ALL_PROVIDERS.filter((id) => !!env[PROVIDER_ENV_KEY[id]]);
}

/** Construct the active provider for a session. Throws if its key is unset. */
export function getProvider(id: ProviderId, env: NodeJS.ProcessEnv = process.env): InterviewProvider {
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

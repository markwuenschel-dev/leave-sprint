/**
 * OpenAI-compatible adapter — one shape for OpenAI, Grok, and the LiteLLM gateway.
 * Grok and the local gateway are OpenAI-API-compatible; they differ only in
 * baseURL / key / model id. Structured output via response_format json_schema (strict).
 *
 * When routing through the gateway, every call attaches origin metadata
 * (SERVICE_NAME / feature / model_alias) so Langfuse can attribute traffic.
 */
import { randomUUID } from "node:crypto";
import OpenAI from "openai";
import { OBSERVATIONS_JSON_SCHEMA } from "@waypoint/rubric";
import { assertNotHermeticLiveCall, firstEnvValue } from "../hermetic";
import { parseObservations, userContent, type GradeInput, type InterviewProvider, type ProviderId } from "../types";

/**
 * LiteLLM/Langfuse origin fields for ONE call.
 *
 * Gateway-path only: the caller supplies `service`, and only the gateway
 * construction path does (see `gatewayProvider`). Direct OpenAI/Grok clients
 * never reach here, so vendor APIs never receive our internal attribution.
 *
 * Every env read goes through `firstEnvValue`, which treats empty and
 * whitespace-only values as absent — a bare `ENVIRONMENT=` in .env must fall
 * through to the next source, not short-circuit the chain (WP-C09).
 */
function callAttribution(model: string, feature: string, service: string): Record<string, string> {
  return {
    request_id: randomUUID(),
    service,
    feature,
    environment: firstEnvValue(["ENVIRONMENT", "LLG_ENVIRONMENT"]) ?? "development",
    release: firstEnvValue(["GIT_SHA", "RELEASE", "LLG_RELEASE"]) ?? "dev",
    model_alias: model,
  };
}

/** Shared OpenAI-compatible client (OpenAI, Grok, LiteLLM proxy). */
export function openAICompatible(opts: {
  id: ProviderId;
  apiKey: string;
  model: string;
  baseURL?: string;
  /**
   * Gateway path only. When (and only when) this is a non-empty service name,
   * every call carries attribution metadata. Direct-vendor factories
   * (`openaiProvider`, `grokProvider`) leave it unset, so their requests are
   * sent without it.
   */
  attributionService?: string;
}): InterviewProvider {
  const client = new OpenAI({ apiKey: opts.apiKey, baseURL: opts.baseURL });
  const service = (opts.attributionService ?? "").trim();
  const attachMeta = (feature: string) =>
    service ? callAttribution(opts.model, feature, service) : undefined;

  return {
    id: opts.id,
    model: opts.model,
    async grade(input: GradeInput) {
      assertNotHermeticLiveCall("openai-compatible.grade");
      const metadata = attachMeta("grade");
      const res = await client.chat.completions.create({
        model: opts.model,
        messages: [
          { role: "system", content: input.system },
          { role: "user", content: userContent(input) },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: "observations", schema: OBSERVATIONS_JSON_SCHEMA, strict: true },
        },
        ...(metadata ? { metadata } : {}),
      });
      return parseObservations(res.choices[0]?.message?.content ?? "");
    },
    async complete(input: GradeInput) {
      assertNotHermeticLiveCall("openai-compatible.complete");
      const metadata = attachMeta("complete");
      const res = await client.chat.completions.create({
        model: opts.model,
        messages: [
          { role: "system", content: input.system },
          { role: "user", content: userContent(input) },
        ],
        ...(metadata ? { metadata } : {}),
      });
      return res.choices[0]?.message?.content ?? "";
    },
  };
}

export function openaiProvider(opts: { apiKey: string; model?: string }): InterviewProvider {
  return openAICompatible({ id: "openai", apiKey: opts.apiKey, model: opts.model ?? "gpt-5.6" });
}

export function grokProvider(opts: { apiKey: string; model?: string }): InterviewProvider {
  return openAICompatible({
    id: "grok",
    apiKey: opts.apiKey,
    model: opts.model ?? "grok-4.5",
    baseURL: "https://api.x.ai/v1",
  });
}

/** Map interview provider ids → LiteLLM stable aliases (gateway model_list). */
export const GATEWAY_MODEL_ALIAS: Record<ProviderId, string> = {
  openai: "openai-general",
  grok: "grok-general",
  anthropic: "anthropic-general",
  gemini: "gemini-general",
};

/**
 * Route any provider through the local LiteLLM OpenAI-compatible proxy.
 * Requires LITELLM_VIRTUAL_KEY (sk-…) and a running gateway; optional LITELLM_BASE_URL.
 * Always sends SERVICE_NAME metadata (default leave-sprint).
 */
export function gatewayProvider(opts: {
  id: ProviderId;
  apiKey: string;
  baseURL?: string;
  model?: string;
}): InterviewProvider {
  return openAICompatible({
    id: opts.id,
    apiKey: opts.apiKey,
    model: opts.model ?? GATEWAY_MODEL_ALIAS[opts.id],
    baseURL: opts.baseURL ?? "http://localhost:4000/v1",
    // Empty/whitespace SERVICE_NAME counts as unset, so the default still applies.
    attributionService: firstEnvValue(["SERVICE_NAME", "LLG_SERVICE"]) ?? "leave-sprint",
  });
}

/**
 * Regression tests for the OpenAI-compatible adapter's call attribution.
 *
 * WP-C09 — empty/whitespace-only SERVICE_NAME / ENVIRONMENT / GIT_SHA must be
 *          treated as ABSENT so the next fallback in each chain applies.
 * WP-C17 — attribution metadata must attach on the GATEWAY path only; direct
 *          OpenAI / Grok calls must never carry it, even when SERVICE_NAME is set.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const stub = vi.hoisted(() => {
  const calls: Array<Record<string, unknown>> = [];
  return {
    calls,
    create: async (params: Record<string, unknown>) => {
      calls.push(params);
      return { choices: [{ message: { content: "ok" } }] };
    },
  };
});

vi.mock("openai", () => ({
  default: class MockOpenAI {
    chat = { completions: { create: stub.create } };
    constructor(_opts?: unknown) {}
  },
}));

import { gatewayProvider, grokProvider, openaiProvider } from "./openai";

const ATTRIBUTION_ENV = [
  "SERVICE_NAME",
  "LLG_SERVICE",
  "ENVIRONMENT",
  "LLG_ENVIRONMENT",
  "GIT_SHA",
  "RELEASE",
  "LLG_RELEASE",
] as const;

const saved = new Map<string, string | undefined>();

beforeEach(() => {
  stub.calls.length = 0;
  saved.clear();
  for (const k of [...ATTRIBUTION_ENV, "LLG_ALLOW_LIVE"]) saved.set(k, process.env[k]);
  for (const k of ATTRIBUTION_ENV) delete process.env[k];
  // The adapters refuse live calls under hermetic mode (vitest sets VITEST=…).
  // The OpenAI client is mocked above, so nothing leaves the process.
  process.env.LLG_ALLOW_LIVE = "1";
});

afterEach(() => {
  for (const [k, v] of saved) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

/** Metadata the adapter passed to the OpenAI-compatible `create` call. */
async function metadataOf(provider: { complete(i: { system: string; user: string }): Promise<string> }) {
  await provider.complete({ system: "s", user: "u" });
  const params = stub.calls.at(-1);
  expect(params).toBeDefined();
  return params?.metadata as Record<string, string> | undefined;
}

describe("WP-C17 — attribution is gateway-only", () => {
  it("direct OpenAI calls carry NO metadata even when SERVICE_NAME is set", async () => {
    process.env.SERVICE_NAME = "leave-sprint";
    const meta = await metadataOf(openaiProvider({ apiKey: "sk-test" }));
    expect(meta).toBeUndefined();
  });

  it("direct Grok calls carry NO metadata even when SERVICE_NAME is set", async () => {
    process.env.SERVICE_NAME = "leave-sprint";
    const meta = await metadataOf(grokProvider({ apiKey: "sk-test" }));
    expect(meta).toBeUndefined();
  });

  it("gateway calls DO carry metadata even when no SERVICE_NAME is set at all", async () => {
    const meta = await metadataOf(gatewayProvider({ id: "openai", apiKey: "sk-test" }));
    expect(meta).toBeDefined();
    expect(meta?.service).toBe("leave-sprint");
    expect(meta?.feature).toBe("complete");
    expect(meta?.model_alias).toBe("openai-general");
    expect(meta?.request_id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("gateway grade() calls are tagged with the grade feature", async () => {
    const p = gatewayProvider({ id: "grok", apiKey: "sk-test" });
    await p.complete({ system: "s", user: "u" });
    expect((stub.calls.at(-1)?.metadata as Record<string, string>)?.model_alias).toBe("grok-general");
  });
});

describe("WP-C09 — empty env values are treated as absent", () => {
  it("empty SERVICE_NAME does not suppress gateway attribution", async () => {
    process.env.SERVICE_NAME = "";
    const meta = await metadataOf(gatewayProvider({ id: "openai", apiKey: "sk-test" }));
    expect(meta).toBeDefined();
    expect(meta?.service).toBe("leave-sprint");
  });

  it("whitespace-only SERVICE_NAME does not suppress gateway attribution", async () => {
    process.env.SERVICE_NAME = "   ";
    process.env.LLG_SERVICE = "fallback-service";
    const meta = await metadataOf(gatewayProvider({ id: "openai", apiKey: "sk-test" }));
    expect(meta?.service).toBe("fallback-service");
  });

  it("empty ENVIRONMENT falls through to LLG_ENVIRONMENT, not the hardcoded default", async () => {
    process.env.SERVICE_NAME = "svc";
    process.env.ENVIRONMENT = "";
    process.env.LLG_ENVIRONMENT = "staging";
    const meta = await metadataOf(gatewayProvider({ id: "openai", apiKey: "sk-test" }));
    expect(meta?.environment).toBe("staging");
  });

  it("empty GIT_SHA falls through to RELEASE, not the hardcoded default", async () => {
    process.env.SERVICE_NAME = "svc";
    process.env.GIT_SHA = "";
    process.env.RELEASE = "v1.2.3";
    const meta = await metadataOf(gatewayProvider({ id: "openai", apiKey: "sk-test" }));
    expect(meta?.release).toBe("v1.2.3");
  });

  it("all three unset still yields the documented defaults", async () => {
    const meta = await metadataOf(gatewayProvider({ id: "openai", apiKey: "sk-test" }));
    expect(meta?.service).toBe("leave-sprint");
    expect(meta?.environment).toBe("development");
    expect(meta?.release).toBe("dev");
  });
});

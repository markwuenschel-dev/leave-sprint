/**
 * INT-015 — hermetic cost-kill at the getProvider() call site.
 *
 * Source-text checks on next.config.ts prove the list is declared; they do not
 * prove a live provider cannot be constructed under hermetic env. The registry
 * is the construction seam — refuse must fire here, before any adapter/SDK.
 */
import { describe, expect, it } from "vitest";

import { getProvider } from "./registry";
import type { ProviderId } from "./types";

/**
 * Hermetic env with no opt-out and no provider keys.
 * NODE_ENV is "development" so the only hermetic signal is LLG_HERMETIC=1
 * (see hermetic.test.ts env() helper).
 */
function hermeticEnv(): NodeJS.ProcessEnv {
  return { NODE_ENV: "development", LLG_HERMETIC: "1" } as NodeJS.ProcessEnv;
}

const LIVE_PROVIDERS = ["openai", "anthropic", "gemini"] as const satisfies readonly ProviderId[];

describe("INT-015 — getProvider refuses live providers under hermetic env", () => {
  it.each(LIVE_PROVIDERS)(
    "getProvider(%j) throws /hermetic/ when LLG_HERMETIC=1 and LLG_ALLOW_LIVE is unset",
    (id) => {
      expect(() => getProvider(id, hermeticEnv())).toThrow(/hermetic/);
    },
  );
});

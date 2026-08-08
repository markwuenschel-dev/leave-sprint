/**
 * Regression tests for the hermetic cost-kill seam.
 *
 * WP-C07 — the cost-key list, the hermetic predicate, and the credential-blanking
 *          routine must be declared ONCE, in this module, and CONSUMED by
 *          apps/waypoint/next.config.ts. Two copies of a safety list can drift;
 *          an exported-but-uncalled implementation is dead code pretending to be
 *          the safety property. Both are asserted structurally below because the
 *          defect is precisely that two independent copies agree *today*.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  COST_ENV_KEYS,
  blankCostCredentials,
  envValue,
  firstEnvValue,
  isCostEnvKey,
  isHermeticEnv,
} from "./hermetic";

const NEXT_CONFIG_PATH = fileURLToPath(new URL("../../next.config.ts", import.meta.url));
const nextConfigSource = readFileSync(NEXT_CONFIG_PATH, "utf8");
const hermeticSource = readFileSync(fileURLToPath(new URL("./hermetic.ts", import.meta.url)), "utf8");

/**
 * Build a ProcessEnv literal. This project's `NodeJS.ProcessEnv` requires
 * NODE_ENV (Next augments it), so tests default it to "development" — the
 * non-hermetic value — and override only where the case is about NODE_ENV.
 */
function env(over: Record<string, string> = {}): NodeJS.ProcessEnv {
  return { NODE_ENV: "development", ...over } as NodeJS.ProcessEnv;
}

describe("WP-C07 — one authoritative cost-kill declaration", () => {
  it("next.config.ts consumes the shared hermetic module rather than re-declaring it", () => {
    expect(nextConfigSource).toMatch(/lib\/llm\/hermetic/);
  });

  it("next.config.ts loads it by ABSOLUTE path — relative specifiers do not resolve there", () => {
    // Next 16 evaluates the compiled config through `requireFromString`
    // (next/dist/build/next-config-ts/require-hook.js:77-83), which creates a
    // Module with `filename === null`. Node then has no base directory, so a
    // plain `./lib/llm/hermetic` — and an `@/…` alias, which SWC rewrites to
    // exactly that — throw MODULE_NOT_FOUND and the whole build dies.
    // Verified by loading the config through Next's own `loadConfig`.
    expect(nextConfigSource).toMatch(/require\(\s*\n?\s*path\.join\(__dirname,\s*"lib\/llm\/hermetic"\)/);
  });

  it("hermetic.ts stays free of runtime imports, so the config loader can require it", () => {
    const runtimeImports = hermeticSource
      .split(/\r?\n/)
      .filter((l) => /^\s*(import|export)\s/.test(l) && !/^\s*(import|export)\s+type\s/.test(l))
      .filter((l) => /\bfrom\b|^\s*import\s+["']/.test(l));
    expect(runtimeImports).toEqual([]);
  });

  it("next.config.ts declares no cost-env-key string literals of its own", () => {
    const ownLiterals = COST_ENV_KEYS.filter((k) => nextConfigSource.includes(`"${k}"`));
    expect(ownLiterals).toEqual([]);
  });

  it("next.config.ts does not re-declare the hermetic predicate", () => {
    expect(nextConfigSource).not.toMatch(/function\s+isHermeticBoot/);
    expect(nextConfigSource).toMatch(/isHermeticEnv\s*\(/);
  });

  it("blankCostCredentials is live code — next.config.ts calls it", () => {
    expect(nextConfigSource).toMatch(/blankCostCredentials\s*\(/);
  });

  it("blankCostCredentials blanks every cost key and latches hermetic mode", () => {
    const e = env({ LITELLM_VIRTUAL_KEY: "sk-real", OPENAI_API_KEY: "sk-real", KEEP_ME: "untouched" });
    blankCostCredentials(e);
    for (const key of COST_ENV_KEYS) expect(e[key]).toBe("");
    expect(e.LLG_HERMETIC).toBe("1");
    expect(e.KEEP_ME).toBe("untouched");
  });

  it("isCostEnvKey answers membership for the same single list", () => {
    for (const key of COST_ENV_KEYS) expect(isCostEnvKey(key)).toBe(true);
    expect(isCostEnvKey("APP_TOKEN")).toBe(false);
    expect(isCostEnvKey("SERVICE_NAME")).toBe(false);
  });
});

describe("isHermeticEnv", () => {
  it("is hermetic under VITEST / NODE_ENV=test / LLG_HERMETIC truthy flags", () => {
    expect(isHermeticEnv(env({ VITEST: "true" }))).toBe(true);
    expect(isHermeticEnv(env({ NODE_ENV: "test" }))).toBe(true);
    for (const flag of ["1", "true", "yes", "on", "ON", " True "]) {
      expect(isHermeticEnv(env({ LLG_HERMETIC: flag }))).toBe(true);
    }
  });

  it("LLG_ALLOW_LIVE=1 wins over every hermetic signal", () => {
    expect(isHermeticEnv(env({ VITEST: "true", NODE_ENV: "test", LLG_HERMETIC: "1", LLG_ALLOW_LIVE: "1" }))).toBe(false);
  });

  it("empty / whitespace-only values are not hermetic signals", () => {
    expect(isHermeticEnv(env({ VITEST: "" }))).toBe(false);
    expect(isHermeticEnv(env({ VITEST: "   " }))).toBe(false);
    expect(isHermeticEnv(env({ LLG_HERMETIC: "" }))).toBe(false);
    expect(isHermeticEnv(env())).toBe(false);
    // …and an empty opt-out is not an opt-out.
    expect(isHermeticEnv(env({ NODE_ENV: "test", LLG_ALLOW_LIVE: "" }))).toBe(true);
  });
});

describe("WP-C09 — envValue / firstEnvValue treat empty as absent", () => {
  it("envValue returns undefined for unset, empty, and whitespace-only", () => {
    const e = env({ A: "x", B: "", C: "   ", D: "  y  " });
    expect(envValue("A", e)).toBe("x");
    expect(envValue("B", e)).toBeUndefined();
    expect(envValue("C", e)).toBeUndefined();
    expect(envValue("D", e)).toBe("y");
    expect(envValue("MISSING", e)).toBeUndefined();
  });

  it("firstEnvValue skips empty entries instead of short-circuiting on them", () => {
    const e = env({ SERVICE_NAME: "", LLG_SERVICE: "gateway-svc" });
    expect(firstEnvValue(["SERVICE_NAME", "LLG_SERVICE"], e)).toBe("gateway-svc");
    expect(firstEnvValue(["SERVICE_NAME"], e)).toBeUndefined();
    expect(firstEnvValue([], e)).toBeUndefined();
  });
});

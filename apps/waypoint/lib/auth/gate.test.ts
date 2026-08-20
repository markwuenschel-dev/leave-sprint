import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { decideGate, isApiPath, isHealthPath, isUnlockPath, type GateInput } from "./gate";
import {
  AUTH_COOKIE,
  AUTH_COOKIE_MAX_AGE,
  createSession,
  safeEqual,
  SESSION_TTL_SECONDS,
} from "./token";

const TOKEN = "s3cret-app-token";
/** Fixed test clock — INT-003: decideGate takes time as an input, so tests never touch a live clock. */
const NOW = 1_700_000_000;

/** Locked-out visitor: gate on, no cookie, no ?token=, not a production build. */
function anon(pathname: string, over: Partial<GateInput> = {}): GateInput {
  return {
    pathname,
    token: TOKEN,
    cookie: undefined,
    queryToken: null,
    isProduction: false,
    nowUnixSeconds: NOW,
    ...over,
  };
}

describe("safeEqual", () => {
  it("accepts identical strings", () => {
    expect(safeEqual(TOKEN, TOKEN)).toBe(true);
    expect(safeEqual("", "")).toBe(true);
  });

  it("rejects same-length mismatches, including a first-character-only difference", () => {
    // A short-circuiting compare would be indistinguishable here by result but
    // not by time; this pins the *result* for both ends of the string.
    expect(safeEqual("Xs3cret-app-token", "as3cret-app-token")).toBe(false);
    expect(safeEqual("s3cret-app-tokeX", TOKEN.slice(0, 16))).toBe(false);
  });

  it("rejects length mismatches without throwing", () => {
    expect(safeEqual("", TOKEN)).toBe(false);
    expect(safeEqual(TOKEN, `${TOKEN}x`)).toBe(false);
    expect(safeEqual(TOKEN.slice(0, 5), TOKEN)).toBe(false);
  });
});

describe("cookie contract", () => {
  it("names the cookie the proxy reads (Waypoint's own, not the frozen twin's ls_token)", () => {
    expect(AUTH_COOKIE).toBe("wp_token");
    // INT-003: was 365 days when the cookie held the raw APP_TOKEN; now
    // matches the signed session's own absolute TTL.
    expect(AUTH_COOKIE_MAX_AGE).toBe(60 * 60 * 24 * 30);
    expect(AUTH_COOKIE_MAX_AGE).toBe(SESSION_TTL_SECONDS);
  });
});

describe("path classification", () => {
  it("treats only /api and /api/* as API", () => {
    expect(isApiPath("/api")).toBe(true);
    expect(isApiPath("/api/state")).toBe(true);
    expect(isApiPath("/api/interview/stream")).toBe(true);
    expect(isApiPath("/")).toBe(false);
    expect(isApiPath("/apidocs")).toBe(false);
    expect(isApiPath("/rubric/api")).toBe(false);
  });

  it("exempts the unlock endpoints exactly, not by prefix", () => {
    expect(isUnlockPath("/unlock")).toBe(true);
    expect(isUnlockPath("/unlock/")).toBe(true);
    expect(isUnlockPath("/api/unlock")).toBe(true);
    expect(isUnlockPath("/api/unlock/")).toBe(true);
    expect(isUnlockPath("/unlocked")).toBe(false);
    expect(isUnlockPath("/unlock/secret")).toBe(false);
    expect(isUnlockPath("/api/unlockme")).toBe(false);
    expect(isUnlockPath("/api/unlock/all")).toBe(false);
  });

  it("exempts /api/health exactly, not by prefix", () => {
    expect(isHealthPath("/api/health")).toBe(true);
    expect(isHealthPath("/api/health/")).toBe(true);
    expect(isHealthPath("/api/healthcare")).toBe(false);
    expect(isHealthPath("/api/health/foo")).toBe(false);
    expect(isHealthPath("/api/healthz")).toBe(false);
  });
});

// INT-002: decideGate must take isProduction as caller-supplied input, never
// read process.env itself -- proxy.ts is the one place that's allowed to
// compute it from NODE_ENV, so the decision stays a pure, unit-testable
// function. A regression test rather than a rule stated only in a comment.
describe("gate.ts stays free of process.env (INT-002 purity)", () => {
  it("reads no environment variables directly", () => {
    const src = readFileSync(fileURLToPath(new URL("./gate.ts", import.meta.url)), "utf8");
    // Strip comments first -- the doc comments *talk about* process.env
    // (explaining what the caller computes), which isn't the same as this
    // file reading it.
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    expect(code).not.toMatch(/process\.env/);
  });
});

// INT-003: same purity rule, applied to the clock. verifySession needs
// "now" — decideGate must take it as an input, never call Date.now() itself
// (directly or transitively through something gate.ts reads unconditionally).
describe("gate.ts stays free of Date.now (INT-003 purity)", () => {
  it("reads no live clock directly", () => {
    const src = readFileSync(fileURLToPath(new URL("./gate.ts", import.meta.url)), "utf8");
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    expect(code).not.toMatch(/Date\.now/);
  });
});

describe("decideGate — gate disabled", () => {
  it("is fully open when APP_TOKEN is unset (documented dev behaviour, deliberately preserved)", () => {
    for (const p of ["/", "/api/state", "/api/unlock", "/unlock", "/rubric"]) {
      expect(
        decideGate({
          pathname: p,
          token: undefined,
          cookie: undefined,
          queryToken: null,
          isProduction: false,
          nowUnixSeconds: NOW,
        }),
      ).toEqual({ kind: "open" });
    }
  });

  it("treats an empty-string APP_TOKEN as unset rather than as a valid secret", () => {
    expect(
      decideGate({
        pathname: "/api/state",
        token: "",
        cookie: "",
        queryToken: null,
        isProduction: false,
        nowUnixSeconds: NOW,
      }),
    ).toEqual({ kind: "open" });
  });
});

// INT-002: an unset APP_TOKEN must not open a production build. Unlike the
// non-production case above, this is the exact posture a public deploy is in
// if the token env var is ever missing/forgotten — see gate.ts's `isProduction`
// branch.
describe("decideGate — production, gate disabled (INT-002 fail-closed)", () => {
  it("does NOT open the app when APP_TOKEN is unset in production", () => {
    expect(decideGate(anon("/", { token: undefined, isProduction: true })))
      .not.toEqual({ kind: "open" });
    expect(decideGate(anon("/api/state", { token: undefined, isProduction: true })))
      .not.toEqual({ kind: "open" });
  });

  it("still exempts /api/health so a public deploy probe keeps working", () => {
    expect(decideGate(anon("/api/health", { token: undefined, isProduction: true })))
      .toEqual({ kind: "exempt" });
    expect(decideGate(anon("/api/health/", { token: undefined, isProduction: true })))
      .toEqual({ kind: "exempt" });
    // Near-miss stays gated, same rule as the token-set case.
    expect(decideGate(anon("/api/healthcare", { token: undefined, isProduction: true })))
      .toEqual({ kind: "unauthorized" });
  });

  it("still exempts /unlock and /api/unlock — reachable, but cannot actually unlock (the route 401s: no expected token to match)", () => {
    expect(decideGate(anon("/unlock", { token: undefined, isProduction: true })))
      .toEqual({ kind: "exempt" });
    expect(decideGate(anon("/api/unlock", { token: undefined, isProduction: true })))
      .toEqual({ kind: "exempt" });
  });

  it("401s API calls instead of opening them", () => {
    expect(decideGate(anon("/api/state", { token: undefined, isProduction: true })))
      .toEqual({ kind: "unauthorized" });
    expect(decideGate(anon("/api/interview", { token: undefined, isProduction: true })))
      .toEqual({ kind: "unauthorized" });
  });

  it("redirects page requests to /unlock instead of opening them", () => {
    expect(decideGate(anon("/", { token: undefined, isProduction: true })))
      .toEqual({ kind: "challenge" });
    expect(decideGate(anon("/rubric", { token: undefined, isProduction: true })))
      .toEqual({ kind: "challenge" });
  });

  it("cannot be forged: a cookie or ?token= cannot grant access when there is no expected token to match", () => {
    expect(
      decideGate(anon("/api/state", { token: undefined, isProduction: true, cookie: "anything" })),
    ).toEqual({ kind: "unauthorized" });
    expect(
      decideGate(
        anon("/", { token: undefined, isProduction: true, queryToken: "anything" }),
      ),
    ).toEqual({ kind: "challenge" });
  });

  it("treats an empty-string APP_TOKEN the same as unset in production", () => {
    expect(decideGate(anon("/api/state", { token: "", isProduction: true })))
      .toEqual({ kind: "unauthorized" });
  });
});

describe("decideGate — authenticated", () => {
  it("allows any path when the session cookie is valid", () => {
    const session = createSession(TOKEN, NOW);
    for (const p of ["/", "/api/state", "/api/unlock", "/unlock"]) {
      expect(decideGate(anon(p, { cookie: session }))).toEqual({ kind: "allow" });
    }
  });

  it("does not accept a session with a tampered MAC, even a single character off", () => {
    const session = createSession(TOKEN, NOW);
    const lastChar = session.at(-1);
    const swapped = lastChar === "A" ? "B" : "A";
    const tampered = session.slice(0, -1) + swapped;
    expect(decideGate(anon("/api/state", { cookie: tampered }))).toEqual({ kind: "unauthorized" });
    expect(decideGate(anon("/", { cookie: tampered }))).toEqual({ kind: "challenge" });
  });
});

// INT-003: the whole point of the change — the cookie is no longer
// credential-equivalent to APP_TOKEN, and a leaked/stolen session is
// self-bounding rather than durable.
describe("decideGate — INT-003 session cookie", () => {
  it("no longer accepts the raw APP_TOKEN itself as a cookie value", () => {
    expect(decideGate(anon("/api/state", { cookie: TOKEN }))).toEqual({ kind: "unauthorized" });
    expect(decideGate(anon("/", { cookie: TOKEN }))).toEqual({ kind: "challenge" });
  });

  it("accepts a freshly issued session at issuance time", () => {
    expect(decideGate(anon("/api/state", { cookie: createSession(TOKEN, NOW) })))
      .toEqual({ kind: "allow" });
  });

  it("accepts a session right up to (but not at) its expiry", () => {
    const session = createSession(TOKEN, NOW);
    expect(
      decideGate(
        anon("/api/state", { cookie: session, nowUnixSeconds: NOW + SESSION_TTL_SECONDS - 1 }),
      ),
    ).toEqual({ kind: "allow" });
  });

  it("treats an expired session the same as no cookie", () => {
    const session = createSession(TOKEN, NOW);
    const atExpiry = NOW + SESSION_TTL_SECONDS;
    expect(decideGate(anon("/api/state", { cookie: session, nowUnixSeconds: atExpiry })))
      .toEqual({ kind: "unauthorized" });
    expect(decideGate(anon("/", { cookie: session, nowUnixSeconds: atExpiry })))
      .toEqual({ kind: "challenge" });
  });

  it("rejects a session signed for a different APP_TOKEN", () => {
    const session = createSession("a-different-token", NOW);
    expect(decideGate(anon("/api/state", { cookie: session }))).toEqual({ kind: "unauthorized" });
  });
});

describe("decideGate — unauthenticated", () => {
  it("401s API calls instead of redirecting them to HTML", () => {
    expect(decideGate(anon("/api/state"))).toEqual({ kind: "unauthorized" });
    expect(decideGate(anon("/api/interview"))).toEqual({ kind: "unauthorized" });
    expect(decideGate(anon("/api/study"))).toEqual({ kind: "unauthorized" });
    expect(decideGate(anon("/api/transcribe"))).toEqual({ kind: "unauthorized" });
    expect(decideGate(anon("/api"))).toEqual({ kind: "unauthorized" });
  });

  it("KEEPS /api/unlock reachable — otherwise the unlock flow is a dead end", () => {
    expect(decideGate(anon("/api/unlock"))).toEqual({ kind: "exempt" });
    expect(decideGate(anon("/api/unlock/"))).toEqual({ kind: "exempt" });
    // ...and with a wrong cookie in the body path there is still no redirect/401
    // from the proxy: the route itself decides.
    expect(decideGate(anon("/api/unlock", { cookie: "wrong-cookie-value" })))
      .toEqual({ kind: "exempt" });
  });

  it("keeps the /unlock page itself reachable", () => {
    expect(decideGate(anon("/unlock"))).toEqual({ kind: "exempt" });
    expect(decideGate(anon("/unlock/"))).toEqual({ kind: "exempt" });
  });

  it("keeps /api/health reachable when locked out so a public deploy probe works", () => {
    expect(decideGate(anon("/api/health"))).toEqual({ kind: "exempt" });
    expect(decideGate(anon("/api/health/"))).toEqual({ kind: "exempt" });
    // Prefix/near-miss paths stay gated — startsWith would leak /api/healthcare.
    expect(decideGate(anon("/api/healthcare"))).toEqual({ kind: "unauthorized" });
    expect(decideGate(anon("/api/health/foo"))).toEqual({ kind: "unauthorized" });
  });

  it("redirects page requests to /unlock", () => {
    expect(decideGate(anon("/"))).toEqual({ kind: "challenge" });
    expect(decideGate(anon("/rubric"))).toEqual({ kind: "challenge" });
    // Near-misses on the exempt paths are gated, not exempt.
    expect(decideGate(anon("/unlocked"))).toEqual({ kind: "challenge" });
    expect(decideGate(anon("/api/unlockme"))).toEqual({ kind: "unauthorized" });
  });
});

describe("decideGate — ?token= query path (must keep working)", () => {
  it("grants on a matching query token, on pages and API paths alike", () => {
    expect(decideGate(anon("/", { queryToken: TOKEN }))).toEqual({ kind: "grant" });
    expect(decideGate(anon("/rubric", { queryToken: TOKEN }))).toEqual({ kind: "grant" });
    expect(decideGate(anon("/api/state", { queryToken: TOKEN }))).toEqual({ kind: "grant" });
    // Grant is checked before the exemption so /unlock?token= still mints a cookie.
    expect(decideGate(anon("/unlock", { queryToken: TOKEN }))).toEqual({ kind: "grant" });
  });

  it("does not grant on a wrong query token", () => {
    expect(decideGate(anon("/", { queryToken: "nope" }))).toEqual({ kind: "challenge" });
    expect(decideGate(anon("/api/state", { queryToken: "nope" })))
      .toEqual({ kind: "unauthorized" });
  });
});

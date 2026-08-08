import { describe, expect, it } from "vitest";

import { decideGate, isApiPath, isUnlockPath, type GateInput } from "./gate";
import { AUTH_COOKIE, AUTH_COOKIE_MAX_AGE, safeEqual } from "./token";

const TOKEN = "s3cret-app-token";

/** Locked-out visitor: gate on, no cookie, no ?token=. */
function anon(pathname: string, over: Partial<GateInput> = {}): GateInput {
  return { pathname, token: TOKEN, cookie: undefined, queryToken: null, ...over };
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
    expect(AUTH_COOKIE_MAX_AGE).toBe(60 * 60 * 24 * 365);
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
});

describe("decideGate — gate disabled", () => {
  it("is fully open when APP_TOKEN is unset (documented dev behaviour, deliberately preserved)", () => {
    for (const p of ["/", "/api/state", "/api/unlock", "/unlock", "/rubric"]) {
      expect(decideGate({ pathname: p, token: undefined, cookie: undefined, queryToken: null }))
        .toEqual({ kind: "open" });
    }
  });

  it("treats an empty-string APP_TOKEN as unset rather than as a valid secret", () => {
    expect(decideGate({ pathname: "/api/state", token: "", cookie: "", queryToken: null }))
      .toEqual({ kind: "open" });
  });
});

describe("decideGate — authenticated", () => {
  it("allows any path when the cookie matches", () => {
    for (const p of ["/", "/api/state", "/api/unlock", "/unlock"]) {
      expect(decideGate(anon(p, { cookie: TOKEN }))).toEqual({ kind: "allow" });
    }
  });

  it("does not accept a cookie that merely shares a prefix", () => {
    expect(decideGate(anon("/api/state", { cookie: TOKEN.slice(0, 5) })))
      .toEqual({ kind: "unauthorized" });
    expect(decideGate(anon("/", { cookie: `${TOKEN}extra` }))).toEqual({ kind: "challenge" });
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
    // ...and with a wrong token in the body path there is still no redirect/401
    // from the proxy: the route itself decides.
    expect(decideGate(anon("/api/unlock", { cookie: "wrong-cookie-value" })))
      .toEqual({ kind: "exempt" });
  });

  it("keeps the /unlock page itself reachable", () => {
    expect(decideGate(anon("/unlock"))).toEqual({ kind: "exempt" });
    expect(decideGate(anon("/unlock/"))).toEqual({ kind: "exempt" });
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

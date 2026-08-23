import { describe, expect, it } from "vitest";

import {
  AUTH_COOKIE_MAX_AGE,
  createSession,
  SESSION_TTL_SECONDS,
  signSessionFieldsForTest,
  verifySession,
} from "./token";

const TOKEN = "s3cret-app-token";
const OTHER_TOKEN = "a-different-secret";
/** Fixed test clock — every test here passes nowUnixSeconds explicitly. */
const NOW = 1_700_000_000;

describe("SESSION_TTL_SECONDS / AUTH_COOKIE_MAX_AGE", () => {
  it("is 30 days, and the cookie's own Max-Age matches it", () => {
    expect(SESSION_TTL_SECONDS).toBe(60 * 60 * 24 * 30);
    expect(AUTH_COOKIE_MAX_AGE).toBe(SESSION_TTL_SECONDS);
  });
});

describe("createSession / verifySession round-trip", () => {
  it("verifies a freshly created session at issuance time", () => {
    const session = createSession(TOKEN, NOW);
    expect(verifySession(session, TOKEN, NOW)).toBe(true);
  });

  it("has the documented shape: 1.<iat>.<exp>.<43-char base64url mac>", () => {
    const session = createSession(TOKEN, NOW);
    const parts = session.split(".");
    expect(parts).toHaveLength(4);
    expect(parts[0]).toBe("1");
    expect(parts[1]).toBe(String(NOW));
    expect(parts[2]).toBe(String(NOW + SESSION_TTL_SECONDS));
    expect(parts[3]).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("verifies right up to, but not at, expiry", () => {
    const session = createSession(TOKEN, NOW);
    expect(verifySession(session, TOKEN, NOW + SESSION_TTL_SECONDS - 1)).toBe(true);
  });

  it("rejects at and after expiry", () => {
    const session = createSession(TOKEN, NOW);
    expect(verifySession(session, TOKEN, NOW + SESSION_TTL_SECONDS)).toBe(false);
    expect(verifySession(session, TOKEN, NOW + SESSION_TTL_SECONDS + 1000)).toBe(false);
  });

  it("rejects one second before issuance (iat is a lower bound too)", () => {
    const session = createSession(TOKEN, NOW);
    expect(verifySession(session, TOKEN, NOW - 1)).toBe(false);
  });

  it("rejects a session signed for a different APP_TOKEN", () => {
    const session = createSession(TOKEN, NOW);
    expect(verifySession(session, OTHER_TOKEN, NOW)).toBe(false);
  });

  it("no clock-skew tolerance: one process issues and verifies with its own clock", () => {
    const session = createSession(TOKEN, NOW);
    expect(verifySession(session, TOKEN, NOW - 1)).toBe(false);
    expect(verifySession(session, TOKEN, NOW + SESSION_TTL_SECONDS)).toBe(false);
  });
});

describe("verifySession — structural rejection (fails closed, never throws)", () => {
  it("rejects the raw APP_TOKEN itself — no legacy compatibility branch", () => {
    expect(verifySession(TOKEN, TOKEN, NOW)).toBe(false);
  });

  it("rejects malformed shapes", () => {
    for (const bad of ["", "1", "1.2.3", "1.2.3.4.5", "not-a-session-at-all", "..."]) {
      expect(verifySession(bad, TOKEN, NOW)).toBe(false);
    }
  });

  it("rejects a version other than 1", () => {
    const session = createSession(TOKEN, NOW);
    expect(verifySession(session.replace(/^1\./, "2."), TOKEN, NOW)).toBe(false);
  });

  it("rejects non-canonical timestamp encodings: leading zeros and explicit signs", () => {
    const session = createSession(TOKEN, NOW);
    const [, iat, exp, mac] = session.split(".");
    for (const badIat of [`0${iat}`, `+${iat}`, `-${iat}`]) {
      expect(verifySession(`1.${badIat}.${exp}.${mac}`, TOKEN, NOW)).toBe(false);
    }
  });

  it("rejects a non-numeric timestamp", () => {
    const session = createSession(TOKEN, NOW);
    const [, , exp, mac] = session.split(".");
    expect(verifySession(`1.notanumber.${exp}.${mac}`, TOKEN, NOW)).toBe(false);
  });

  it("rejects an overflowing timestamp instead of coercing it", () => {
    const hugeDigits = "9".repeat(400);
    const macLikeField = "A".repeat(43);
    expect(verifySession(`1.${hugeDigits}.${hugeDigits}.${macLikeField}`, TOKEN, NOW)).toBe(false);
  });

  it("rejects a tampered iat even though the string still parses", () => {
    const session = createSession(TOKEN, NOW);
    const [v, iat, exp, mac] = session.split(".");
    const tampered = [v, String(Number(iat) - 1), exp, mac].join(".");
    expect(verifySession(tampered, TOKEN, NOW)).toBe(false);
  });

  it("rejects a correctly signed pair whose TTL isn't exactly 30 days (structural check, independent of the MAC)", () => {
    // signSessionFieldsForTest signs whatever iat/exp it's given — createSession
    // never produces a wrong TTL, so this proves verifySession checks the TTL
    // itself rather than trusting a valid MAC to imply a valid lifetime.
    const iat = NOW;
    const exp = NOW + SESSION_TTL_SECONDS + 1; // one second too long
    const mac = signSessionFieldsForTest(TOKEN, iat, exp);
    expect(verifySession(`1.${iat}.${exp}.${mac}`, TOKEN, NOW)).toBe(false);
  });

  it("rejects a MAC of the wrong length", () => {
    const session = createSession(TOKEN, NOW);
    const [v, iat, exp] = session.split(".");
    expect(verifySession(`${v}.${iat}.${exp}.short`, TOKEN, NOW)).toBe(false);
    expect(verifySession(`${v}.${iat}.${exp}.${"A".repeat(44)}`, TOKEN, NOW)).toBe(false);
  });

  it("rejects a MAC containing characters outside the base64url alphabet", () => {
    const session = createSession(TOKEN, NOW);
    const [v, iat, exp] = session.split(".");
    expect(verifySession(`${v}.${iat}.${exp}.${"!".repeat(43)}`, TOKEN, NOW)).toBe(false);
  });

  it("rejects a single-character MAC tamper", () => {
    const session = createSession(TOKEN, NOW);
    const lastChar = session.at(-1);
    const swapped = lastChar === "A" ? "B" : "A";
    expect(verifySession(session.slice(0, -1) + swapped, TOKEN, NOW)).toBe(false);
  });
});

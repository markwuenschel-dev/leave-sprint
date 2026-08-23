/**
 * Shared pieces of Waypoint's single-token gate.
 *
 * The proxy (apps/waypoint/proxy.ts) and the unlock route
 * (apps/waypoint/app/api/unlock/route.ts) MUST agree on the cookie name and
 * attributes — a mismatch means the unlock POST "succeeds" while the proxy
 * keeps redirecting to /unlock. Both import from here so there is exactly one
 * definition.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

/** Cookie the proxy reads. Waypoint's own name (the frozen twin used `ls_token`). */
export const AUTH_COOKIE = "wp_token";

/**
 * Session lifetime: 30 days, absolute — no sliding renewal (INT-003). A
 * stolen session self-expires; a sliding window would let periodic reuse of
 * a stolen cookie keep it alive indefinitely, which defeats the point.
 */
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

/**
 * The cookie's own browser-enforced Max-Age, kept in lockstep with
 * SESSION_TTL_SECONDS so the browser never holds a cookie past the session
 * artifact's own expiry (INT-003; was 365 days when the cookie held the raw
 * APP_TOKEN directly).
 */
export const AUTH_COOKIE_MAX_AGE = SESSION_TTL_SECONDS;

/**
 * Length-then-XOR compare. Not a true constant-time primitive — it leaks the
 * length of the expected token — but it does not short-circuit on the first
 * differing character, which is the leak that matters for a guessable secret.
 * Used for raw-secret comparisons that remain in this app (the submitted
 * unlock token, the `?token=` query grant). The HMAC session artifact below
 * uses crypto.timingSafeEqual instead (INT-003) — a dedicated primitive
 * exists for authenticator comparison, and apps/waypoint/proxy.ts always runs
 * on the Node.js runtime (Next 16 guarantees this for proxy.ts files), so
 * node:crypto is available wherever this is called from.
 */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

/** Cookie attributes. `secure` is resolved per call so tests and dev behave correctly. */
export function authCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: AUTH_COOKIE_MAX_AGE,
    path: "/",
  };
}

// --- INT-003 session artifact ------------------------------------------
//
// Cookie value used to be the raw APP_TOKEN: any cookie disclosure was an
// APP_TOKEN disclosure, and revocation meant rotating the app secret. This
// replaces it with a signed, expiring artifact — the raw secret never sits
// in the browser.
//
// Format: "1.<iat>.<exp>.<mac>", flat and dot-delimited, not JSON — no
// parser needed beyond a regex and a numeric range check.

const SESSION_VERSION = "1";

/** version.iat.exp.mac — iat/exp canonical decimal (no signs, no leading zeros). */
const SESSION_FORMAT = /^1\.(0|[1-9]\d*)\.(0|[1-9]\d*)\.([A-Za-z0-9_-]+)$/;

/** HMAC-SHA256 digest, base64url, no padding: always exactly 43 characters. */
const MAC_LENGTH = 43;

/**
 * Domain-separated signing key derived from APP_TOKEN. This does NOT reduce
 * how often APP_TOKEN is read into process memory — deriving a key from a
 * secret requires reading the secret — it only keeps the session-signing key
 * distinct from APP_TOKEN itself, in case the raw token is ever reused for a
 * second purpose later.
 */
function signingKey(appToken: string): Buffer {
  return createHmac("sha256", appToken).update("waypoint-session-v1").digest();
}

function macFor(appToken: string, iat: number, exp: number): string {
  return createHmac("sha256", signingKey(appToken))
    .update(`${SESSION_VERSION}.${iat}.${exp}`)
    .digest("base64url");
}

/**
 * Exported for tests only: lets a test construct a session with fields
 * verifySession must reject structurally (e.g. a wrong TTL) even when the
 * MAC is correctly signed for that exact pair — proving the structural check
 * is a real guard, not just incidental to the MAC failing anyway.
 */
export function signSessionFieldsForTest(appToken: string, iat: number, exp: number): string {
  return macFor(appToken, iat, exp);
}

/**
 * Mints a session artifact. Absolute 30-day expiry, no sliding renewal.
 * nowUnixSeconds is caller-supplied — never Date.now() here — so every
 * issuer call site (proxy.ts's grant branch, the unlock route) is explicit
 * about its own clock read.
 */
export function createSession(appToken: string, nowUnixSeconds: number): string {
  const iat = nowUnixSeconds;
  const exp = iat + SESSION_TTL_SECONDS;
  return `${SESSION_VERSION}.${iat}.${exp}.${macFor(appToken, iat, exp)}`;
}

/**
 * Verifies a session artifact. Fails closed on anything malformed: wrong
 * shape, wrong version, non-canonical timestamps, wrong TTL, expired/not-yet-
 * valid, or a MAC mismatch — every path returns false, none throws.
 *
 * nowUnixSeconds is caller-supplied for the same purity reason as
 * createSession: decideGate (lib/auth/gate.ts) must stay a pure function of
 * its inputs, the same way INT-002 made it take isProduction as an input
 * instead of reading process.env.NODE_ENV itself. A hidden Date.now() here
 * would reintroduce that exact impurity via the clock instead of the env.
 */
export function verifySession(
  cookieValue: string,
  appToken: string,
  nowUnixSeconds: number,
): boolean {
  const match = SESSION_FORMAT.exec(cookieValue);
  if (!match) return false;

  const iat = Number(match[1]);
  const exp = Number(match[2]);
  const suppliedMac = match[3];

  if (!Number.isSafeInteger(iat) || !Number.isSafeInteger(exp)) return false;
  if (exp - iat !== SESSION_TTL_SECONDS) return false;
  if (!(iat <= nowUnixSeconds && nowUnixSeconds < exp)) return false;
  if (suppliedMac.length !== MAC_LENGTH) return false;

  const expectedMac = macFor(appToken, iat, exp);
  try {
    const supplied = Buffer.from(suppliedMac, "ascii");
    const expected = Buffer.from(expectedMac, "ascii");
    if (supplied.length !== expected.length) return false;
    return timingSafeEqual(supplied, expected);
  } catch {
    return false;
  }
}

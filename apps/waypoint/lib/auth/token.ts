/**
 * Shared pieces of Waypoint's single-token gate.
 *
 * The proxy (apps/waypoint/proxy.ts) and the unlock route
 * (apps/waypoint/app/api/unlock/route.ts) MUST agree on the cookie name and
 * attributes — a mismatch means the unlock POST "succeeds" while the proxy
 * keeps redirecting to /unlock. Both import from here so there is exactly one
 * definition.
 */

/** Cookie the proxy reads. Waypoint's own name (the frozen twin used `ls_token`). */
export const AUTH_COOKIE = "wp_token";

/** One year, matching the twin's middleware/route. */
export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Length-then-XOR compare. Not a true constant-time primitive — it leaks the
 * length of the expected token — but it does not short-circuit on the first
 * differing character, which is the leak that matters for a guessable secret.
 * Same implementation the proxy has always used (proxy.ts, pre-change lines
 * 8-13); the unlock route now uses it too instead of `===`.
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

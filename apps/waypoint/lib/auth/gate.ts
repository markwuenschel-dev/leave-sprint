/**
 * Pure decision function behind apps/waypoint/proxy.ts.
 *
 * Kept free of `next/server` so the routing rules — in particular "does an
 * unauthenticated /api/* call get a 401, and does /api/unlock itself stay
 * reachable" — can be unit-tested without booting a server.
 */

import { safeEqual, verifySession } from "./token";

export type GateDecision =
  /** APP_TOKEN unset → the gate is disabled entirely (see FAIL-OPEN note below). */
  | { kind: "open" }
  /** Cookie matches the expected token. */
  | { kind: "allow" }
  /** Unlock flow or public health probe — never gated. */
  | { kind: "exempt" }
  /** `?token=` matched: caller should set the cookie and redirect to the cleaned URL. */
  | { kind: "grant" }
  /** Unauthenticated API call → JSON 401, never an HTML redirect. */
  | { kind: "unauthorized" }
  /** Unauthenticated page request → redirect to /unlock. */
  | { kind: "challenge" };

export interface GateInput {
  pathname: string;
  /**
   * process.env.APP_TOKEN. Undefined/empty means no secret is configured —
   * see `isProduction` below for what that does to the gate.
   */
  token: string | undefined;
  /** Current value of the auth cookie, if any. */
  cookie: string | undefined;
  /** `?token=` from the request URL, if any. */
  queryToken: string | null;
  /**
   * process.env.NODE_ENV === "production", computed by the caller so this
   * function stays a pure decision (see INT-002: an unset APP_TOKEN must not
   * silently open a production build the way it opens local dev/test).
   */
  isProduction: boolean;
  /**
   * Math.floor(Date.now() / 1000), computed by the caller so this function
   * stays a pure decision (INT-003: verifySession needs a clock reading; a
   * hidden Date.now() inside decideGate would reintroduce the same
   * impurity INT-002 removed for isProduction, just via the clock instead
   * of the env).
   */
  nowUnixSeconds: number;
}

/** Exactly one path segment deep: `/p` or `/p/`, never `/pfoo`. */
function isExactPath(pathname: string, p: string): boolean {
  return pathname === p || pathname === `${p}/`;
}

/**
 * Every Next route handler in this app lives under app/api (verified: the only
 * route.ts files are app/api/{interview,state,study,transcribe,unlock,health}/route.ts),
 * so `/api` is the complete API surface.
 */
export function isApiPath(pathname: string): boolean {
  return pathname === "/api" || pathname.startsWith("/api/");
}

/**
 * The unlock flow must stay reachable while unauthenticated, otherwise there is
 * no way in and the gate is a dead end. Exact-match only: `/unlockfoo` and
 * `/api/unlockfoo` are NOT exempt (the pre-change proxy used `startsWith`,
 * which exempted them; narrowing it tightens the gate, never loosens it).
 */
export function isUnlockPath(pathname: string): boolean {
  return isExactPath(pathname, "/unlock") || isExactPath(pathname, "/api/unlock");
}

/**
 * Public deploy probe. Exact-match only: `/api/healthcare` and `/api/health/foo`
 * stay gated. Do not use startsWith — that would exempt `/api/healthz-attack`.
 */
export function isHealthPath(pathname: string): boolean {
  return isExactPath(pathname, "/api/health");
}

export function decideGate(input: GateInput): GateDecision {
  const { pathname, token, cookie, queryToken, isProduction, nowUnixSeconds } = input;

  if (!token) {
    // FAIL-OPEN, preserved deliberately for local dev/test only: with no
    // APP_TOKEN the whole app is open. This is the documented local-dev
    // behaviour (.env.example: "empty .env ... open access gate").
    //
    // INT-002: that default must not extend to a production build. An unset
    // token in production falls through to the same exempt/unauthorized/
    // challenge logic below as "a token is configured but nothing matched" —
    // there is no secret to compare against, so cookie/query-token cannot
    // grant access either.
    if (!isProduction) return { kind: "open" };
  } else {
    if (cookie && verifySession(cookie, token, nowUnixSeconds)) return { kind: "allow" };

    // Checked before the exemptions so `/unlock?token=…` still mints the cookie.
    if (queryToken && safeEqual(queryToken, token)) return { kind: "grant" };
  }

  if (isUnlockPath(pathname) || isHealthPath(pathname)) return { kind: "exempt" };

  if (isApiPath(pathname)) return { kind: "unauthorized" };

  return { kind: "challenge" };
}

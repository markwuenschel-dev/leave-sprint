import { NextResponse } from "next/server";

import { AUTH_COOKIE, authCookieOptions, createSession, safeEqual } from "@/lib/auth/token";
import { BODY_LIMITS, readJsonBody } from "@/lib/http/parse";
import { failureResponse } from "@/lib/http/respond";
import { parseUnlockBody } from "@/lib/http/schemas";

/**
 * Sets the access cookie when the submitted token matches APP_TOKEN.
 *
 * Reachable while unauthenticated — see `isUnlockPath` in lib/auth/gate.ts.
 * The token is never logged and never echoed back: both "no APP_TOKEN
 * configured" and "wrong token" return the same opaque 401, so the response
 * cannot be used to probe whether the gate is even enabled.
 */

export const runtime = "nodejs";

export async function POST(req: Request) {
  const raw = await readJsonBody(req, BODY_LIMITS.unlock);
  if (!raw.ok) return failureResponse(raw.failure);
  const parsed = parseUnlockBody(raw.value);
  if (!parsed.ok) return failureResponse(parsed.failure);
  const submitted = parsed.value.token;

  const expected = process.env.APP_TOKEN;
  if (expected && safeEqual(submitted, expected)) {
    const res = NextResponse.json({ ok: true });
    // Mints a signed session (INT-003) instead of writing the raw APP_TOKEN
    // into the cookie — see lib/auth/token.ts.
    const nowUnixSeconds = Math.floor(Date.now() / 1000);
    res.cookies.set(AUTH_COOKIE, createSession(expected, nowUnixSeconds), authCookieOptions());
    return res;
  }

  return NextResponse.json({ error: "invalid_token" }, { status: 401 });
}

import { NextResponse } from "next/server";

import { AUTH_COOKIE, authCookieOptions, safeEqual } from "@/lib/auth/token";

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
  let submitted = "";
  try {
    const body: unknown = await req.json();
    const t = (body as { token?: unknown } | null)?.token;
    submitted = typeof t === "string" ? t : "";
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const expected = process.env.APP_TOKEN;
  if (expected && safeEqual(submitted, expected)) {
    const res = NextResponse.json({ ok: true });
    res.cookies.set(AUTH_COOKIE, expected, authCookieOptions());
    return res;
  }

  return NextResponse.json({ error: "invalid_token" }, { status: 401 });
}

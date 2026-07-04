import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Single-user token gate. The public Railway URL isn't wide open: every request
 * (except static assets + the unlock flow) must carry a cookie matching APP_TOKEN.
 * `?token=<APP_TOKEN>` sets the cookie once, then redirects to a clean URL.
 *
 * No auth accounts, no DB access here (runs on the Edge) — just an env compare.
 * If APP_TOKEN is unset (local dev), everything is open.
 */

const COOKIE = "ls_token";
const YEAR = 60 * 60 * 24 * 365;

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export function middleware(req: NextRequest) {
  const token = process.env.APP_TOKEN;
  if (!token) return NextResponse.next(); // unset → open (dev)

  const cookie = req.cookies.get(COOKIE)?.value;
  if (cookie && safeEqual(cookie, token)) return NextResponse.next();

  const url = req.nextUrl.clone();
  const qp = url.searchParams.get("token");
  if (qp && safeEqual(qp, token)) {
    url.searchParams.delete("token");
    const res = NextResponse.redirect(url);
    res.cookies.set(COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: YEAR,
      path: "/",
    });
    return res;
  }

  if (url.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/unlock", req.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/unlock|unlock).*)"],
};

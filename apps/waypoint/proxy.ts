import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Optional local token gate. Unset APP_TOKEN → open. */
const COOKIE = "wp_token";
const YEAR = 60 * 60 * 24 * 365;

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export function proxy(req: NextRequest) {
  const token = process.env.APP_TOKEN;
  if (!token) return NextResponse.next();

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

  if (url.pathname.startsWith("/unlock")) return NextResponse.next();

  url.pathname = "/unlock";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

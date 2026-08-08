import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { decideGate } from "@/lib/auth/gate";
import { AUTH_COOKIE, authCookieOptions } from "@/lib/auth/token";

/**
 * Optional local token gate. Unset APP_TOKEN → open.
 *
 * All routing rules live in the pure `decideGate` (lib/auth/gate.ts) so they are
 * unit-testable; this file only turns a decision into a NextResponse.
 */
export function proxy(req: NextRequest) {
  const token = process.env.APP_TOKEN;
  const url = req.nextUrl.clone();

  const decision = decideGate({
    pathname: url.pathname,
    token,
    cookie: req.cookies.get(AUTH_COOKIE)?.value,
    queryToken: url.searchParams.get("token"),
  });

  switch (decision.kind) {
    case "grant": {
      url.searchParams.delete("token");
      const res = NextResponse.redirect(url);
      if (token) res.cookies.set(AUTH_COOKIE, token, authCookieOptions());
      return res;
    }
    case "unauthorized":
      // JSON, not a 302 to HTML — a fetch() from the app can act on this.
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    case "challenge":
      // Built from the origin only: drops the query string so a rejected
      // `?token=` is not echoed into the /unlock URL, history or Referer.
      return NextResponse.redirect(new URL("/unlock", req.url));
    default:
      return NextResponse.next();
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

import { NextResponse } from "next/server";

/** Sets the access cookie when the submitted token matches APP_TOKEN. */

export const runtime = "nodejs";

const COOKIE = "ls_token";
const YEAR = 60 * 60 * 24 * 365;

export async function POST(req: Request) {
  let token = "";
  try {
    const body = (await req.json()) as { token?: string };
    token = body.token ?? "";
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const expected = process.env.APP_TOKEN;
  if (expected && token === expected) {
    const res = NextResponse.json({ ok: true });
    res.cookies.set(COOKIE, expected, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: YEAR,
      path: "/",
    });
    return res;
  }
  return NextResponse.json({ error: "invalid_token" }, { status: 401 });
}

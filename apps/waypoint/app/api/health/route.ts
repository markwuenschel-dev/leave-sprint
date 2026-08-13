import { NextResponse } from "next/server";

/** Public deploy probe. No DB — opening PGlite here races migrate. */
export const runtime = "nodejs";

export function GET() {
  return NextResponse.json({ ok: true });
}

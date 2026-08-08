/**
 * State load/save endpoint — the SOLE write path for every persisted slice,
 * grade history included. The body is size-capped and PARSED (never cast) before
 * it reaches saveState: see lib/http/schemas.ts:parseStateBody for exactly what
 * is checked and why the check stops where it does.
 */

import { NextResponse } from "next/server";
import { loadState, saveState } from "@/lib/db/state";
import { BODY_LIMITS, readJsonBody } from "@/lib/http/parse";
import { failureResponse } from "@/lib/http/respond";
// The body type clients should import is `StateSaveRequestBody` from
// @/lib/http/schemas — a route file may not re-export it (Next constrains what a
// route module exports).
import { parseStateBody } from "@/lib/http/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // ensure schema exists on first request
    try {
      const { default: migrate } = await import("@/lib/db/ensure");
      await migrate();
    } catch {
      /* ensure optional */
    }
    const state = await loadState();
    return NextResponse.json(
      { ...state, driver: "pglite" },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (err) {
    console.error("GET /api/state failed:", err);
    return NextResponse.json({ error: "load_failed" }, { status: 500 });
  }
}

async function persist(req: Request) {
  const raw = await readJsonBody(req, BODY_LIMITS.state);
  if (!raw.ok) return failureResponse(raw.failure);
  const parsed = parseStateBody(raw.value);
  if (!parsed.ok) return failureResponse(parsed.failure);
  const body = parsed.value;

  // Deletions only apply on an authoritative (client-hydrated) save. A save
  // without the flag is upsert-only, so a pre-hydration / empty slice can add
  // but never wipe. saveState ignores the extra __authoritative field.
  const authoritative = body.__authoritative === true;
  try {
    try {
      const { default: migrate } = await import("@/lib/db/ensure");
      await migrate();
    } catch {
      /* */
    }
    const { lastUpdated } = await saveState(body, authoritative);
    return NextResponse.json({ ok: true, lastUpdated });
  } catch (err) {
    console.error("Save /api/state failed [internal]:", err);
    return NextResponse.json({ error: "save_failed", kind: "internal" }, { status: 500 });
  }
}

export const PUT = persist;
export const POST = persist;

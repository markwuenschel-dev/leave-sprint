/**
 * /api/state — the single persistence endpoint (single-user, no auth here; the
 * whole route tree is gated by middleware.ts).
 *
 *   GET → the full persisted store slice recomposed from Postgres, plus `empty`.
 *   PUT → the full slice, decomposed into tables in one transaction.
 *
 * Mirrors the Zustand `persist` contract 1:1 so the client stays unchanged.
 */

import { NextResponse } from "next/server";
import { loadState, saveState, type PersistedSlice } from "@/lib/db/state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const state = await loadState();
    return NextResponse.json(state, { headers: { "cache-control": "no-store" } });
  } catch (err) {
    console.error("GET /api/state failed:", err);
    return NextResponse.json({ error: "load_failed" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  let body: PersistedSlice;
  try {
    body = (await req.json()) as PersistedSlice;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  try {
    const { lastUpdated } = await saveState(body);
    return NextResponse.json({ ok: true, lastUpdated });
  } catch (err) {
    console.error("PUT /api/state failed:", err);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }
}

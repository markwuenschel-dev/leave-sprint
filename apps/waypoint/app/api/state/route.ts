import { NextResponse } from "next/server";
import { loadState, saveState, type PersistedSlice } from "@/lib/db/state";

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
  let body: PersistedSlice & { __authoritative?: boolean };
  try {
    body = (await req.json()) as PersistedSlice & { __authoritative?: boolean };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  // Deletions only apply on an authoritative (client-hydrated) save. A save
  // without the flag is upsert-only, so a pre-hydration / empty slice can add
  // but never wipe. saveState ignores the extra __authoritative field.
  const authoritative = body?.__authoritative === true;
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
    console.error("Save /api/state failed:", err);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }
}

export const PUT = persist;
export const POST = persist;

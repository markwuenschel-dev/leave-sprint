/**
 * Study Guide synthesis endpoint. Stateless like /api/interview: the client
 * builds the deterministic digest from its own store and posts it here; the
 * provider writes the "learn next / this week" narrative on top and must cite
 * reps only from the digest (hallucinated ids are dropped server-side).
 * Persistence stays client-side via /api/state.
 */

import { NextResponse } from "next/server";
import { availableProviders, getProvider, type ProviderId } from "@/lib/llm";
import {
  validRepIds,
  type StudyDigest,
  type StudyGuideLearnItem,
  type StudyGuideWeekItem,
  type StudyRep,
} from "@/lib/study";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    { providers: availableProviders() },
    { headers: { "cache-control": "no-store" } },
  );
}

const SYSTEM = `You are a study coach building a short, per-role study guide for a software/data career switcher, from a deterministic digest of their graded interview practice history. Be specific and evidence-bound: every claim must trace to the digest, every rep must cite an id from it. No filler, no generic advice.

Reply with ONLY a JSON object, no markdown fences:
{
  "learn": [
    {
      "title": "concept to learn, phrased as the underlying model to acquire",
      "why": "2-3 sentences: the evidence (which misses/trends), and why learning this collapses several misses at once",
      "reps": [{ "kind": "qbank" | "defense" | "retest", "id": "<id from digest>", "label": "short human label" }]
    }
  ],
  "week": [{ "id": "w1", "text": "one concrete checkable action mixing study + reps" }]
}

Rules:
- 2 to 4 learn items, ordered by leverage (most recurring misses collapsed first).
- 1 to 4 reps per learn item. kind "qbank" ids come from qbankCandidates or retrainCards; "retest" ids from dueRetests; "defense" ids from defenseStories. Never invent an id.
- 4 to 6 week items, small enough to finish in a week alongside a job search; reference the learn items and reps by name.
- If the digest has almost no signal (few misses), say so in the single learn item's "why" and build the week from retrain cards, due retests, and unpracticed defense stories instead.`;

interface StudyBody {
  provider: ProviderId;
  digest: StudyDigest;
}

interface RawGuide {
  learn?: Partial<StudyGuideLearnItem>[];
  week?: Partial<StudyGuideWeekItem>[];
}

function parseGuide(text: string, digest: StudyDigest): { learn: StudyGuideLearnItem[]; week: StudyGuideWeekItem[] } | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  let raw: RawGuide;
  try {
    raw = JSON.parse(text.slice(start, end + 1)) as RawGuide;
  } catch {
    return null;
  }
  const allowed = validRepIds(digest);
  const learn: StudyGuideLearnItem[] = (raw.learn ?? [])
    .filter((l) => typeof l?.title === "string" && typeof l?.why === "string")
    .slice(0, 4)
    .map((l) => ({
      title: l.title!.slice(0, 140),
      why: l.why!.slice(0, 500),
      reps: ((l.reps ?? []) as StudyRep[])
        .filter(
          (r) =>
            (r?.kind === "qbank" || r?.kind === "defense" || r?.kind === "retest") &&
            typeof r.id === "string" &&
            allowed.has(`${r.kind}:${r.id}`),
        )
        .slice(0, 4)
        .map((r) => ({ kind: r.kind, id: r.id, label: String(r.label ?? r.id).slice(0, 80) })),
    }));
  const week: StudyGuideWeekItem[] = (raw.week ?? [])
    .filter((w) => typeof w?.text === "string")
    .slice(0, 6)
    .map((w, i) => ({ id: String(w.id ?? `w${i + 1}`), text: w.text!.slice(0, 240) }));
  if (!learn.length && !week.length) return null;
  return { learn, week };
}

export async function POST(req: Request) {
  let body: StudyBody;
  try {
    body = (await req.json()) as StudyBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!body?.provider || !body?.digest) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  if (!availableProviders().includes(body.provider)) {
    return NextResponse.json({ error: "provider_unavailable", provider: body.provider }, { status: 400 });
  }

  try {
    const p = getProvider(body.provider);
    const raw = await p.complete({
      system: SYSTEM,
      user: `DIGEST (role scope: ${body.digest.role}):\n${JSON.stringify(body.digest)}`,
    });
    const guide = parseGuide(raw, body.digest);
    if (!guide) return NextResponse.json({ error: "unparseable_guide" }, { status: 502 });
    return NextResponse.json({ ...guide, model: p.model });
  } catch (err) {
    console.error("POST /api/study failed:", err);
    return NextResponse.json(
      { error: "study_failed", message: String((err as Error).message).slice(0, 300) },
      { status: 502 },
    );
  }
}

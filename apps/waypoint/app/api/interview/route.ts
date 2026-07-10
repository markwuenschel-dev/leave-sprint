/**
 * AI Interviewer grading endpoint (ADR-0003). Stateless: grades one turn through
 * the provider seam and returns the scored RubricEntry. Persistence stays
 * client-side — the store adds the entry via addRubricEntry and saves through
 * /api/state (same as manual grades). Server-side so provider keys never ship
 * to the browser. NOTE: keys must be in the waypoint process env
 * (apps/waypoint/.env.local or the deploy env) — Next does not load the repo-root .env.
 */

import { NextResponse } from "next/server";
import { availableProviders, getProvider, gradeToEntry, type ProviderId } from "@/lib/llm";
import { buildGradeInput } from "@/lib/interview/prompt";
import type { ObservationContext } from "@waypoint/rubric";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Which providers are configured (for the UI provider selector). */
export async function GET() {
  return NextResponse.json(
    { providers: availableProviders() },
    { headers: { "cache-control": "no-store" } },
  );
}

interface GradeBody {
  provider: ProviderId;
  /** Classification + provenance from the Q-bank question (graderModel is added by the seam). */
  ctx: Omit<ObservationContext, "graderModel">;
  question: string;
  answer: string;
  probingTranscript?: string;
  knownTags?: string[];
}

export async function POST(req: Request) {
  let body: GradeBody;
  try {
    body = (await req.json()) as GradeBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { provider, ctx, question, answer, probingTranscript, knownTags } = body ?? {};
  if (!provider || !ctx || !question || !answer) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  if (!availableProviders().includes(provider)) {
    return NextResponse.json({ error: "provider_unavailable", provider }, { status: 400 });
  }

  try {
    const result = await gradeToEntry(
      getProvider(provider),
      buildGradeInput({ question, answer, probingTranscript, knownTags }),
      ctx,
    );
    return NextResponse.json(result);
  } catch (err) {
    console.error("POST /api/interview failed:", err);
    return NextResponse.json(
      { error: "grade_failed", message: String((err as Error).message).slice(0, 300) },
      { status: 502 },
    );
  }
}

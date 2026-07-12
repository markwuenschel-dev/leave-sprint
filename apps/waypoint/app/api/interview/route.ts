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
import {
  buildGradeInput,
  buildQuestionPrompt,
  buildProbePrompt,
  buildHintPrompt,
  parseProbeReply,
} from "@/lib/interview/prompt";
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

interface InterviewBody {
  action?: "question" | "slate" | "probe" | "hint" | "grade";
  provider: ProviderId;
  // action: "question" | "slate"
  role?: string;
  domain?: string;
  seed?: string;
  avoid?: string[];
  /** question/probe: which rung of the L1→L2→L3 ladder this turn is at. */
  level?: 1 | 2 | 3;
  // action: "probe"
  transcript?: string;
  /** probe: true when this is the candidate's last answer for the level — feedback only, no follow-up. */
  final?: boolean;
  // action: "grade" — classification + provenance (graderModel is added by the seam)
  ctx?: Omit<ObservationContext, "graderModel">;
  question?: string;
  answer?: string;
  probingTranscript?: string;
  knownTags?: string[];
}

export async function POST(req: Request) {
  let body: InterviewBody;
  try {
    body = (await req.json()) as InterviewBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const provider = body?.provider;
  if (!provider) return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  if (!availableProviders().includes(provider)) {
    return NextResponse.json({ error: "provider_unavailable", provider }, { status: 400 });
  }

  const action = body.action ?? "grade";
  try {
    const p = getProvider(provider);

    if (action === "question") {
      if (!body.role || !body.domain) return NextResponse.json({ error: "missing_fields" }, { status: 400 });
      const text = await p.complete(
        buildQuestionPrompt({ role: body.role, domain: body.domain, level: body.level, seed: body.seed, avoid: body.avoid }),
      );
      return NextResponse.json({ question: text.trim() });
    }

    if (action === "slate") {
      if (!body.role || !body.domain) return NextResponse.json({ error: "missing_fields" }, { status: 400 });
      const role = body.role;
      const domain = body.domain;
      const results = await Promise.allSettled(
        availableProviders().map(async (id) => ({
          provider: id,
          question: (
            await getProvider(id).complete(buildQuestionPrompt({ role, domain, seed: body.seed, avoid: body.avoid }))
          ).trim(),
        })),
      );
      const candidates = results.flatMap((r) => (r.status === "fulfilled" && r.value.question ? [r.value] : []));
      return NextResponse.json({ candidates });
    }

    if (action === "probe") {
      if (!body.transcript) return NextResponse.json({ error: "missing_fields" }, { status: 400 });
      const raw = await p.complete(buildProbePrompt(body.transcript, body.final, body.level));
      // Verdict-only feedback + one follow-up; probe is null on a DONE sentinel.
      const { feedback, probe } = parseProbeReply(raw);
      return NextResponse.json({ feedback, probe });
    }

    if (action === "hint") {
      if (!body.transcript) return NextResponse.json({ error: "missing_fields" }, { status: 400 });
      const hint = (await p.complete(buildHintPrompt(body.transcript))).trim();
      return NextResponse.json({ hint });
    }

    // action: "grade"
    const { ctx, question, answer, probingTranscript, knownTags } = body;
    if (!ctx || !question || !answer) return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    const result = await gradeToEntry(p, buildGradeInput({ question, answer, probingTranscript, knownTags }), ctx);
    return NextResponse.json(result);
  } catch (err) {
    console.error("POST /api/interview failed:", err);
    return NextResponse.json(
      { error: `${action}_failed`, message: String((err as Error).message).slice(0, 300) },
      { status: 502 },
    );
  }
}

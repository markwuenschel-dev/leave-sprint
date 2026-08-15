/**
 * AI Interviewer grading endpoint (ADR-0003). Stateless: grades one turn through
 * the provider seam and returns the scored RubricEntry. Persistence stays
 * client-side — the store adds the entry via addRubricEntry and saves through
 * /api/state (same as manual grades). Server-side so provider keys never ship
 * to the browser. NOTE: keys must be in the waypoint process env
 * (apps/waypoint/.env.local or the deploy env) — Next does not load the repo-root .env.
 *
 * The request body is parsed, not cast: the shape lives in lib/http/schemas.ts
 * (`InterviewRequestBody`) so the client imports the same declaration instead of
 * hand-mirroring it. Failures are classified — bad client input (4xx), an
 * unusable model response (502 kind=model_response), a provider failure
 * (502 kind=upstream), or our own fault (500 kind=internal) — see lib/http/respond.ts.
 */

import { NextResponse } from "next/server";
import { KGTAG_CLUSTERS } from "@waypoint/rubric";
import { availableProviders, getProvider, gradeToEntry } from "@/lib/llm";
import {
  buildGradeInput,
  buildQuestionPrompt,
  buildProbePrompt,
  buildHintPrompt,
  parseProbeReply,
  buildDebriefPrompt,
  parseDebriefReply,
} from "@/lib/interview/prompt";
import { BODY_LIMITS, readJsonBody } from "@/lib/http/parse";
import { errorResponse, failureResponse } from "@/lib/http/respond";
import { parseInterviewBody } from "@/lib/http/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Which providers are configured (for the UI provider selector). */
export async function GET() {
  return NextResponse.json(
    { providers: availableProviders() },
    { headers: { "cache-control": "no-store" } },
  );
}

export async function POST(req: Request) {
  const raw = await readJsonBody(req, BODY_LIMITS.interview);
  if (!raw.ok) return failureResponse(raw.failure);
  const parsed = parseInterviewBody(raw.value);
  if (!parsed.ok) return failureResponse(parsed.failure);
  const body = parsed.value;

  const provider = body.provider;
  if (!availableProviders().includes(provider)) {
    return NextResponse.json(
      { error: "provider_unavailable", provider, kind: "client_input" },
      { status: 400 },
    );
  }

  const action = body.action;
  try {
    const p = getProvider(provider);

    if (body.action === "slate") {
      const { role, domain, seed, avoid } = body;
      const results = await Promise.allSettled(
        availableProviders().map(async (id) => ({
          provider: id,
          question: (
            await getProvider(id).complete(buildQuestionPrompt({ role, domain, seed, avoid }))
          ).trim(),
        })),
      );
      const candidates = results.flatMap((r) => (r.status === "fulfilled" && r.value.question ? [r.value] : []));
      return NextResponse.json({ candidates });
    }

    if (body.action === "question") {
      const { role, domain, seed, avoid, level } = body;
      const text = await p.complete(buildQuestionPrompt({ role, domain, level, seed, avoid }));
      return NextResponse.json({ question: text.trim() });
    }

    if (body.action === "probe") {
      const reply = await p.complete(buildProbePrompt(body.transcript, body.final, body.level));
      // Verdict-only feedback + one follow-up; probe is null on a DONE sentinel.
      const { feedback, probe } = parseProbeReply(reply);
      return NextResponse.json({ feedback, probe });
    }

    if (body.action === "hint") {
      const hint = (await p.complete(buildHintPrompt(body.transcript))).trim();
      return NextResponse.json({ hint });
    }

    if (body.action === "debrief") {
      const reply = await p.complete(buildDebriefPrompt(body.session));
      // null when the model didn't return usable JSON — the client silently skips the card.
      return NextResponse.json({ debrief: parseDebriefReply(reply) });
    }

    // action: "grade" — the parser guarantees ctx/question/answer are present and typed.
    const { ctx, question, answer, probingTranscript, knownTags } = body;
    const result = await gradeToEntry(
      p,
      buildGradeInput({
        question,
        answer,
        probingTranscript,
        knownTags: knownTags?.length ? knownTags : Object.values(KGTAG_CLUSTERS).flat(),
      }),
      ctx,
    );
    return NextResponse.json(result);
  } catch (err) {
    return errorResponse("POST /api/interview", action, err);
  }
}

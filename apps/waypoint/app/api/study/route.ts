/**
 * Study Guide synthesis endpoint. Stateless like /api/interview: the client
 * builds the deterministic digest from its own store and posts it here; the
 * provider writes the "learn next / this week" narrative on top and must cite
 * reps only from the digest (hallucinated ids are dropped server-side).
 * Persistence stays client-side via /api/state.
 */

import { NextResponse } from "next/server";
import { availableProviders, getProvider } from "@/lib/llm";
import { STUDY_SYSTEM, parseGuide, studyUserPrompt } from "@/lib/study";
import { BODY_LIMITS, readJsonBody } from "@/lib/http/parse";
import { errorResponse, failureResponse } from "@/lib/http/respond";
// Clients should import the request type `StudyRequestBody` from
// @/lib/http/schemas rather than re-declaring it at the fetch site.
import { parseStudyBody } from "@/lib/http/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    { providers: availableProviders() },
    { headers: { "cache-control": "no-store" } },
  );
}

export async function POST(req: Request) {
  const rawBody = await readJsonBody(req, BODY_LIMITS.study);
  if (!rawBody.ok) return failureResponse(rawBody.failure);
  const parsed = parseStudyBody(rawBody.value);
  if (!parsed.ok) return failureResponse(parsed.failure);
  const body = parsed.value;

  if (!availableProviders().includes(body.provider)) {
    return NextResponse.json(
      { error: "provider_unavailable", provider: body.provider, kind: "client_input" },
      { status: 400 },
    );
  }

  try {
    const p = getProvider(body.provider);
    const raw = await p.complete({
      system: STUDY_SYSTEM,
      user: studyUserPrompt(body.digest),
    });
    const guide = parseGuide(raw, body.digest);
    if (!guide) {
      // The model replied, but with nothing we can ground — a model_response
      // failure, distinct from the provider itself failing.
      console.error("POST /api/study failed [model_response] action=study: unparseable guide");
      return NextResponse.json(
        { error: "unparseable_guide", kind: "model_response" },
        { status: 502 },
      );
    }
    return NextResponse.json({ ...guide, model: p.model });
  } catch (err) {
    return errorResponse("POST /api/study", "study", err);
  }
}

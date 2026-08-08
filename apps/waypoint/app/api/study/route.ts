/**
 * Study Guide synthesis endpoint. Stateless like /api/interview: the client
 * builds the deterministic digest from its own store and posts it here; the
 * provider writes the "learn next / this week" narrative on top and must cite
 * reps only from the digest (hallucinated ids are dropped server-side).
 * Persistence stays client-side via /api/state.
 */

import { NextResponse } from "next/server";
import { availableProviders, getProvider } from "@/lib/llm";
import {
  STUDY_SYSTEM,
  studyUserPrompt,
  validMissConcepts,
  validRepIds,
  type ProblemSource,
  type StudyConcept,
  type StudyDigest,
  type StudyGuideLearnItem,
  type StudyGuideWeekItem,
  type StudyProblem,
  type StudyRep,
} from "@/lib/study";
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

interface RawGuide {
  learn?: Partial<StudyGuideLearnItem>[];
  week?: Partial<StudyGuideWeekItem>[];
}

const PROBLEM_SOURCES = new Set<ProblemSource>([
  "leetcode",
  "neetcode",
  "hackerrank",
  "stratascratch",
  "other",
]);

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
  const concepts = validMissConcepts(digest);
  const learn: StudyGuideLearnItem[] = (raw.learn ?? [])
    .filter((l) => typeof l?.title === "string" && typeof l?.why === "string")
    .slice(0, 5)
    .map((l) => ({
      title: l.title!.slice(0, 140),
      why: l.why!.slice(0, 500),
      // Same contract as rep ids: a claim we can't tie back to the digest is dropped.
      collapses: ((l.collapses ?? []) as string[])
        .filter((c) => typeof c === "string" && concepts.has(c))
        .slice(0, 8),
      concepts: ((l.concepts ?? []) as StudyConcept[])
        .filter((c) => typeof c?.name === "string" && typeof c?.claim === "string")
        .slice(0, 4)
        .map((c) => ({
          name: c.name.slice(0, 100),
          claim: c.claim.slice(0, 240),
          ...(typeof c.lookup === "string" && c.lookup.trim()
            ? { lookup: c.lookup.slice(0, 160) }
            : {}),
        })),
      reps: ((l.reps ?? []) as StudyRep[])
        .filter(
          (r) =>
            (r?.kind === "qbank" || r?.kind === "defense" || r?.kind === "retest") &&
            typeof r.id === "string" &&
            allowed.has(`${r.kind}:${r.id}`),
        )
        .slice(0, 4)
        .map((r) => ({ kind: r.kind, id: r.id, label: String(r.label ?? r.id).slice(0, 80) })),
      problems: ((l.problems ?? []) as StudyProblem[])
        .filter((p) => typeof p?.name === "string" && PROBLEM_SOURCES.has(p?.source))
        .slice(0, 4)
        .map((p) => ({
          source: p.source,
          name: p.name.slice(0, 100),
          ...(typeof p.slug === "string" && p.slug.trim()
            ? { slug: p.slug.trim().slice(0, 80) }
            : {}),
          ...(p.difficulty === "easy" || p.difficulty === "medium" || p.difficulty === "hard"
            ? { difficulty: p.difficulty }
            : {}),
          ...(typeof p.targets === "string" && p.targets.trim()
            ? { targets: p.targets.slice(0, 120) }
            : {}),
        })),
    }));
  const week: StudyGuideWeekItem[] = (raw.week ?? [])
    .filter((w) => typeof w?.text === "string")
    .slice(0, 6)
    .map((w, i) => ({ id: String(w.id ?? `w${i + 1}`), text: w.text!.slice(0, 240) }));
  if (!learn.length && !week.length) return null;
  return { learn, week };
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

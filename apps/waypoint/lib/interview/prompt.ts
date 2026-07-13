/**
 * Grading-prompt assembly for the AI Interviewer (ADR-0003 / ADR-0004). Builds
 * the rubric-anchored system prompt + the turn content the provider seam grades.
 * The observations *shape* is enforced by OBSERVATIONS_JSON_SCHEMA (structured
 * output); this prompt supplies the rubric *anchors* so the judgment is calibrated.
 */

import { RD } from "@waypoint/rubric";
import type { GradeInput } from "@/lib/llm";

const DIMS = RD.universalDims.map((d) => `- ${d.id} (0–${d.max}): ${d.label}`).join("\n");
const GATES = RD.gates.map((g) => `- ${g.gate}: ${g.req}`).join("\n");

const SYSTEM_BASE = `You are an expert technical interviewer grading exactly ONE candidate answer against a competency rubric. Output ONLY the observations object matching the provided JSON schema. NEVER compute or mention a total or final grade — a deterministic engine derives it from your observations.

Evidence discipline (apply to every field):
- Score ONLY what the answer explicitly states. Base each score solely on text actually present — NEVER extrapolate, and NEVER credit knowledge, correctness, or skill the candidate did not demonstrate.
- Naming a concept without explaining it does NOT demonstrate it. Score vague, buzzword, or hand-wavy answers low and name the gap.
- When evidence is thin or ambiguous, score DOWN and widen scoreUncertainty — never give the benefit of the doubt.

Score bands — apply to every 0–100 field, and proportionally to each sub-score's own 0–max scale:
- 85–100: complete and correct — explains the "why," handles nuance and edge cases, no errors.
- 65–84: solid — core idea correct, minor gaps or imprecision.
- 45–64: partial — right direction but thin, incomplete, or partly wrong.
- 20–44: weak — mostly missing, vague, or notably incorrect.
- 0–19: absent or wrong — off-topic, empty, or fundamentally mistaken.

Universal sub-scores — score each on its own scale using the bands above:
${DIMS}

Level scores L1/L2/L3 (each 0–100) — how strongly the answer demonstrates each difficulty level. Derive them IN ORDER: score L1 (foundational mastery) first; then L2 (deeper tradeoffs and edge cases), which MUST be ≤ L1; then L3 (senior, systems-level judgment), which MUST be ≤ L2. The result MUST be monotonic (L3 ≤ L2 ≤ L1) — a candidate cannot demonstrate a harder level more strongly than an easier one. Weak fundamentals cap every level, even when the answer shows flashes of advanced insight.

Gates — verdict each Pass, Partial, or Fail. Award Pass ONLY on explicit evidence the requirement is met; Partial when partly met; default to Fail when the answer gives no evidence either way. Absence of evidence is NEVER a Pass.
${GATES}

Also provide gapTypes (from the allowed enum), severity, nextActionType, brief strengths / weaknesses / surviveProbing (how the answer held up under any follow-up probing), knowledge and weakness tags, a calibrationConfidence, and scoreUncertainty {range, reason}. Lower calibrationConfidence and widen scoreUncertainty for short, ambiguous, or partial answers; keep them tight only when the evidence is clear.`;

export interface GradeArgs {
  question: string;
  answer: string;
  /** Optional transcript of follow-up probes and the candidate's responses. */
  probingTranscript?: string;
  /** Existing tag vocabulary to prefer (ADR-0004 prompt-steering); new tags go to proposedNewTags. */
  knownTags?: string[];
}

/** Assemble the system + user prompt the provider seam grades. */
export function buildGradeInput(args: GradeArgs): GradeInput {
  const system = args.knownTags?.length
    ? `${SYSTEM_BASE}\n\nPrefer these existing tags where they genuinely fit; put only truly new ones in proposedNewTags: ${args.knownTags.join("; ")}.`
    : SYSTEM_BASE;

  let user = `Question asked (context only — do NOT grade the question itself):\n${args.question}\n\nCandidate answer to grade:\n${args.answer}`;
  if (args.probingTranscript) {
    user += `\n\nProbing follow-ups and the candidate's responses (additional evidence — weigh alongside the answer):\n${args.probingTranscript}`;
  }

  return { system, user };
}

/**
 * The three-level difficulty ladder (mirrors the Q Bank's q / l2q / l3q). Each
 * interview session climbs L1 → L2 → L3, generating a question at each level.
 */
export const LEVEL_BRIEF: Record<1 | 2 | 3, string> = {
  1: "a foundational question a competent mid-level candidate should answer comfortably — core concepts and correct fundamentals",
  2: "a harder stretch that goes a level deeper — tradeoffs, edge cases, and the 'why' behind the fundamentals, the kind that separates memorisation from real understanding",
  3: "an advanced, senior-level question — systems thinking, design at scale, failure modes, and nuanced judgment",
};

/** Prompt to generate one interview question at a given ladder level — the "ask" side (ADR-0003). */
export function buildQuestionPrompt(args: {
  role: string;
  domain: string;
  level?: 1 | 2 | 3;
  seed?: string;
  avoid?: string[];
}): GradeInput {
  const level = args.level ?? 1;
  const system = `You are a senior technical interviewer for a ${args.role} role. Ask ONE focused interview question on ${args.domain}, pitched at Level ${level} of a three-level ladder: ${LEVEL_BRIEF[level]}. It should be answerable verbally in 1–3 minutes and probe real understanding rather than trivia. Output only the question — no preamble, no answer, no numbering.`;
  let user = `Generate one Level ${level} ${args.domain} interview question.`;
  if (args.seed) user += `\n\nSame topic area, for inspiration (do not copy verbatim): ${args.seed}`;
  if (args.avoid?.length) {
    user += `\n\nDo not repeat any of these already-asked questions:\n- ${args.avoid.join("\n- ")}`;
  }
  return { system, user };
}

/**
 * Per-answer verdict + one adaptive follow-up (or DONE). The FEEDBACK line is
 * verdict-only — it says whether the answer landed, never what was missing — so
 * showing it in an unaided run leaks no content and is not coaching (ADR-0003).
 * `final` = the candidate's last answer: give feedback only, force FOLLOWUP: DONE.
 */
export function buildProbePrompt(transcript: string, final = false, level = 1): GradeInput {
  const system = `You are a technical interviewer evaluating a candidate mid-interview at Level ${level} of a three-level difficulty ladder. Any follow-up you ask MUST stay at Level ${level} difficulty — probe within this level (depth, an edge case, a tradeoff, or a specific claim they made); do NOT escalate to a harder level. Respond in EXACTLY this two-line format and nothing else:
FEEDBACK: <one short sentence on how the answer landed — e.g. "Solid, that holds up." or "Not fully there yet.". Give a VERDICT ONLY: never reveal what they missed, hint at the answer, or name a concept to add.>
FOLLOWUP: <${
    final
      ? "the single word DONE"
      : "DEFAULT to the single word DONE. Only ask ONE short, pointed Level " +
        level +
        " follow-up when it would MATERIALLY change the grade or resolve a genuine ambiguity in what they said. If the answer already stands on its own, or a further probe would only add marginal detail, output DONE."
  }>${
    final ? "\nThis is the candidate's FINAL answer for this level — output FOLLOWUP: DONE regardless." : ""
  }`;
  const user = `Interview so far (Level ${level}):\n\n${transcript}\n\nYour response (FEEDBACK then FOLLOWUP):`;
  return { system, user };
}

/**
 * Parse a FEEDBACK/FOLLOWUP reply tolerantly (the probe uses plain completion, not
 * structured output). probe = null when the follow-up is DONE or absent; if neither
 * label is present, the whole reply is treated as feedback with no follow-up.
 */
export function parseProbeReply(raw: string): { feedback: string; probe: string | null } {
  const fb = raw.match(/FEEDBACK:\s*([\s\S]*?)(?:\n\s*FOLLOWUP:|$)/i);
  const fu = raw.match(/FOLLOWUP:\s*([\s\S]*)$/i);
  const feedback = (fb?.[1] ?? (fu ? "" : raw)).trim();
  let probe: string | null = fu ? fu[1].trim() : null;
  if (probe && /^done\.?$/i.test(probe)) probe = null;
  return { feedback, probe };
}

/** Coaching hint mid-answer — a nudge, not the answer (coaching mode). */
export function buildHintPrompt(transcript: string): GradeInput {
  const system = `You are a supportive interview coach. The candidate is mid-answer and wants a hint. Give ONE short nudge — point at what to consider next, a missing angle, or a leading sub-question — WITHOUT giving the full answer. One or two sentences.`;
  const user = `Interview so far:\n\n${transcript}\n\nGive one coaching hint (do not answer for them):`;
  return { system, user };
}

/**
 * End-of-session debrief (ADR-0003). Generated once, AFTER the whole ladder is graded,
 * so full candor is safe — nothing leaks into an unaided run. One level per entry.
 */
export interface DebriefLevelInput {
  level: 1 | 2 | 3;
  finalScore: number;
  passed: boolean;
  question: string;
  answer: string;
  probing?: string;
  strengths?: string;
  weaknesses?: string;
}

/** The structured debrief the UI renders as a colour-coded card. */
export interface Debrief {
  headline: string;
  overall: string;
  levels: { level: 1 | 2 | 3; verdict: string; good: string; improve: string; next: string }[];
}

/** Build the debrief prompt from the graded session. Free-text completion returning strict JSON. */
export function buildDebriefPrompt(session: DebriefLevelInput[]): GradeInput {
  const system = `You are a supportive but candid expert interview coach writing a post-interview debrief. The interview is over, so be fully specific — name what to add and how to improve. Return ONLY strict JSON (no prose, no code fences) matching exactly this shape:
{"headline": string, "overall": string, "levels": [{"level": number, "verdict": string, "good": string, "improve": string, "next": string}]}
- headline: one short, encouraging line summarising the session.
- overall: 2–3 sentences on the biggest theme across all levels and where to focus.
- one levels[] entry per level provided, in order. For each: verdict = one short sentence on how the level landed; good = the strongest thing about the answer; improve = the single most important thing that was thin or missing; next = ONE concrete, actionable step to get better. Keep each field to one sentence. Ground everything in what the candidate actually said.`;

  const user = session
    .map((s) => {
      const parts = [
        `## Level ${s.level} — scored ${s.finalScore} (${s.passed ? "cleared" : "not cleared"})`,
        `Question: ${s.question}`,
        `Answer: ${s.answer}`,
      ];
      if (s.probing) parts.push(`Follow-ups and responses:\n${s.probing}`);
      if (s.strengths) parts.push(`Grader noted strengths: ${s.strengths}`);
      if (s.weaknesses) parts.push(`Grader noted weaknesses: ${s.weaknesses}`);
      return parts.join("\n");
    })
    .join("\n\n");

  return { system, user: `${user}\n\nWrite the debrief JSON now.` };
}

/**
 * Tolerantly parse the debrief JSON (strip code fences / surrounding prose, then JSON.parse
 * and validate). Returns null on any failure so the caller can silently skip the card.
 */
export function parseDebriefReply(raw: string): Debrief | null {
  try {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) return null;
    const obj = JSON.parse(raw.slice(start, end + 1)) as Partial<Debrief>;
    if (!obj || !Array.isArray(obj.levels)) return null;
    const levels = obj.levels
      .filter((l): l is Debrief["levels"][number] => !!l && typeof l.level === "number")
      .map((l) => ({
        level: (l.level === 2 ? 2 : l.level === 3 ? 3 : 1) as 1 | 2 | 3,
        verdict: String(l.verdict ?? "").trim(),
        good: String(l.good ?? "").trim(),
        improve: String(l.improve ?? "").trim(),
        next: String(l.next ?? "").trim(),
      }));
    if (!levels.length) return null;
    return {
      headline: String(obj.headline ?? "").trim(),
      overall: String(obj.overall ?? "").trim(),
      levels,
    };
  } catch {
    return null;
  }
}

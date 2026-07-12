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

const SYSTEM_BASE = `You are an expert technical interviewer grading ONE candidate answer against a competency rubric. Emit only the observations object matching the provided JSON schema — your raw judgment. A deterministic engine computes the final grade from it, so do not compute totals yourself.

Universal sub-scores — score each dimension on its own scale:
${DIMS}

Level scores L1/L2/L3 (each 0–100) — how strongly the answer demonstrates each difficulty level. They MUST be monotonic: L3 ≤ L2 ≤ L1 (a candidate cannot demonstrate a harder level more strongly than an easier one).

Gates — give each a verdict of Pass, Partial, or Fail:
${GATES}

Also provide gapTypes (from the allowed enum), severity, nextActionType, brief strengths / weaknesses / surviveProbing, knowledge and weakness tags, a calibrationConfidence, and scoreUncertainty {range, reason}. Grade strictly against what the answer actually contains — do not credit unstated knowledge.`;

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
    ? `${SYSTEM_BASE}\n\nPrefer these existing tags where they fit (put genuinely new ones in proposedNewTags): ${args.knownTags.join("; ")}.`
    : SYSTEM_BASE;

  let user = `Question:\n${args.question}\n\nCandidate answer:\n${args.answer}`;
  if (args.probingTranscript) user += `\n\nProbing follow-ups and responses:\n${args.probingTranscript}`;

  return { system, user };
}

/** Prompt to generate one interview question — the "ask" side (ADR-0003). */
export function buildQuestionPrompt(args: {
  role: string;
  domain: string;
  seed?: string;
  avoid?: string[];
}): GradeInput {
  const system = `You are a senior technical interviewer for a ${args.role} role. Ask ONE focused interview question on ${args.domain}. It should be answerable verbally in 1–3 minutes, probe real understanding rather than trivia, and suit a mid-level candidate. Output only the question — no preamble, no answer, no numbering.`;
  let user = `Generate one ${args.domain} interview question.`;
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
export function buildProbePrompt(transcript: string, final = false): GradeInput {
  const system = `You are a technical interviewer evaluating a candidate mid-interview. Respond in EXACTLY this two-line format and nothing else:
FEEDBACK: <one short sentence on how the answer landed — e.g. "Solid, that holds up." or "Not fully there yet.". Give a VERDICT ONLY: never reveal what they missed, hint at the answer, or name a concept to add.>
FOLLOWUP: <ONE short, pointed follow-up that tests depth, an edge case, a tradeoff, or a specific claim they made — the kind that separates a memorised answer from real understanding${final ? "" : ", OR the single word DONE if the exchange is already thorough and a further probe would add little"}.>${
    final ? "\nThis is the candidate's FINAL answer — output FOLLOWUP: DONE regardless." : ""
  }`;
  const user = `Interview so far:\n\n${transcript}\n\nYour response (FEEDBACK then FOLLOWUP):`;
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

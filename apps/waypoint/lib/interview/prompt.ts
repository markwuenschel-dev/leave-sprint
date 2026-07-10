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

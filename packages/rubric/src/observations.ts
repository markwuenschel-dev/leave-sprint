/**
 * AI Interviewer observations intake (ADR-0004).
 *
 * The LLM emits `Observations` — raw per-question judgment. The deterministic
 * engine (`normaliseEntry`) derives the grade. This module defines the emission
 * surface, its provider-neutral JSON Schema (the intersection all four providers'
 * structured output supports), and the intake that maps Observations → RubricEntry
 * with the tiered violation policy. It never re-calls the model — the caller (the
 * provider seam / interview API) owns the one-shot retry; here we detect and flag.
 */

import { normaliseEntry } from './normalize';
import { validateMonotonic } from './derive';
import { RD } from './referenceData';
import {
  GAP_TYPES,
  SEVERITY,
  NEXT_ACTION_TYPES,
  GATE_VERDICTS,
  CONFIDENCE,
  TAG_CLASSES,
} from './diagnostics';
import type {
  RubricEntry,
  RubricEntryInput,
  Gates,
  GateId,
  GateVerdict,
  UniversalSubScores,
  LevelScores,
  TaskType,
  Role,
  LevelId,
  Difficulty,
} from './types';
import type { AssessmentMode, ProposedNewTag } from './diagnostics';

const GATE_IDS = RD.gates.map((g) => g.gate);
const GATE_ID_SET = new Set<string>(GATE_IDS);

/** One gate verdict, as the model emits it (array form avoids spaced object keys). */
export interface GateObservation {
  gate: GateId;
  verdict: GateVerdict;
}

/** Raw per-question judgment the AI Interviewer emits (ADR-0004 §1). All fields
 *  are always present — empty arrays / strings where there is nothing to report. */
export interface Observations {
  /** The six universal competency dimensions, each 0..dim.max. */
  universalSubScores: UniversalSubScores;
  /** 0–100 per difficulty level. Must be monotonic (L3 ≤ L2 ≤ L1). */
  levelScores: { L1: number; L2: number; L3: number };
  /** 0–100 task-specific rubric score. */
  taskSpecificScore: number;
  gates: GateObservation[];
  gapTypes: string[];
  knowledgeGapTags: string[];
  weaknessTags: string[];
  severity: (typeof SEVERITY)[number];
  nextActionType: (typeof NEXT_ACTION_TYPES)[number];
  strengths: string;
  weaknesses: string;
  surviveProbing: string;
  calibrationConfidence: (typeof CONFIDENCE)[number];
  scoreUncertainty: { range: [number, number]; reason: string };
  proposedNewTags: ProposedNewTag[];
}

/** Classification + provenance the API supplies from the Q-bank question — not judged. */
export interface ObservationContext {
  task: string;
  date: string;
  taskType: TaskType;
  domain: string;
  primaryRole: Role;
  problemLevel: LevelId;
  difficulty: number;
  /** Provenance: exact grading model id. */
  graderModel: string;
  /** Provenance: 'qbank' | 'generated:<model>' | 'slate:<model>'. */
  questionSource: string;
  assessmentMode?: AssessmentMode['mode'];
  followUpsAsked?: number;
  /** Coaching mode: the model helped during the answer. Flags llmUsed + lowers
   *  the evidence class so a coached session can't inflate the readiness floor. */
  coached?: boolean;
}

export interface IntakeResult {
  entry: RubricEntry;
  /** false → the caller should retry the grade once; a second failure is flagged. */
  monotonicOk: boolean;
  /** true → non-monotonic even after a retry: confidence forced Low. */
  flagged: boolean;
  /**
   * Everything the intake removed from the model's response, prefixed by kind —
   * `gate:` / `gapType:` (off-enum small-vocab values), `malformedItem:` (an array
   * element that failed the schema) and `extraProperty:` (a key the schema does not
   * declare). Non-fatal by ADR-0004 §5; fatal violations throw instead (see
   * `checkObservations`). Empty on a fully compliant response — a non-empty list
   * means the grade you are looking at is missing signal the model tried to emit,
   * so a UI that renders grades MUST surface it.
   */
  droppedTags: string[];
}

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const clamp = (v: unknown, lo = 0, hi = 100): number => Math.max(lo, Math.min(hi, num(v)));

/**
 * The observations JSON Schema — the provider intersection (ADR-0004 §5): only
 * type/properties/required/enum/items/description, additionalProperties:false,
 * every property required, no numeric/length/pattern constraints. Reused by every
 * provider adapter as the structured-output target.
 */
const numberProp = (description: string) => ({ type: 'number', description });
const stringProp = (description: string) => ({ type: 'string', description });

export const OBSERVATIONS_JSON_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: [
    'universalSubScores', 'levelScores', 'taskSpecificScore', 'gates', 'gapTypes',
    'knowledgeGapTags', 'weaknessTags', 'severity', 'nextActionType', 'strengths',
    'weaknesses', 'surviveProbing', 'calibrationConfidence', 'scoreUncertainty', 'proposedNewTags',
  ],
  properties: {
    universalSubScores: {
      type: 'object',
      additionalProperties: false,
      required: RD.universalDims.map((d) => d.id),
      properties: Object.fromEntries(
        RD.universalDims.map((d) => [d.id, numberProp(`${d.label} (0–${d.max})`)]),
      ),
    },
    levelScores: {
      type: 'object',
      additionalProperties: false,
      required: ['L1', 'L2', 'L3'],
      properties: {
        L1: numberProp('0–100 demonstrated at L1'),
        L2: numberProp('0–100 demonstrated at L2 (≤ L1)'),
        L3: numberProp('0–100 demonstrated at L3 (≤ L2)'),
      },
    },
    taskSpecificScore: numberProp('0–100 task-specific rubric score'),
    gates: {
      type: 'array',
      description: 'One verdict per gate.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['gate', 'verdict'],
        properties: {
          gate: { type: 'string', enum: GATE_IDS },
          verdict: { type: 'string', enum: [...GATE_VERDICTS] },
        },
      },
    },
    gapTypes: { type: 'array', description: 'Gap categories.', items: { type: 'string', enum: [...GAP_TYPES] } },
    knowledgeGapTags: { type: 'array', description: 'Reuse existing cluster tags where they fit; new ones go in proposedNewTags.', items: { type: 'string' } },
    weaknessTags: { type: 'array', items: { type: 'string' } },
    severity: { type: 'string', enum: [...SEVERITY] },
    nextActionType: { type: 'string', enum: [...NEXT_ACTION_TYPES] },
    strengths: stringProp('What the answer got right.'),
    weaknesses: stringProp('What was thin or missing.'),
    surviveProbing: stringProp('How the answer held up under follow-up probing.'),
    calibrationConfidence: { type: 'string', enum: [...CONFIDENCE] },
    scoreUncertainty: {
      type: 'object',
      additionalProperties: false,
      required: ['range', 'reason'],
      properties: {
        range: { type: 'array', description: '[low, high] band around the final score.', items: { type: 'number' } },
        reason: stringProp('Why the score is uncertain.'),
      },
    },
    proposedNewTags: {
      type: 'array',
      description: 'Tags genuinely missing from the vocabulary.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['tagClass', 'proposedTag', 'reason'],
        properties: {
          tagClass: { type: 'string', enum: [...TAG_CLASSES] },
          proposedTag: { type: 'string' },
          reason: { type: 'string' },
        },
      },
    },
  },
};

/* ────────────────────────────────────────────────────────────────────────────
 * Presence validation (ADR-0004 §5, "Presence" tier).
 *
 * The engine's violation policy used to cover ranges, monotonicity and enums but
 * never PRESENCE, so an omitted `universalSubScores` block flowed through three
 * individually-defensible lenient coercions (`num()` → 0, `subTotal` → null,
 * `subsTotal ?? 0` in normalize.ts:88) and landed as a real, monotonic, all-zero
 * grade — indistinguishable in the persisted record from a candidate who scored 0.
 *
 * The contract that rejects it already exists in this file: OBSERVATIONS_JSON_SCHEMA,
 * derived from RD so it cannot drift and sent unchanged by every provider adapter.
 * `checkObservations` walks that same object rather than restating it, so the parse
 * boundary and the structured-output request can never disagree.
 *
 * Fatal (throws)  — a required property is absent/null, or a scalar/object has the
 *                   wrong JSON type, or a number is non-finite. These are score-bearing.
 * Non-fatal (drops) — a malformed ARRAY ITEM (array elements are independent
 *                   observations; one bad element must not void a whole grade) and an
 *                   undeclared property. Both are recorded in `droppedTags`.
 * Not checked here — enum membership stays deliberately non-fatal so the existing
 *                   tiered coercion below (drop unknown gates/gapTypes, fall back to
 *                   Medium/retest) keeps working exactly as before.
 * ──────────────────────────────────────────────────────────────────────────── */

type JsonSchema = Record<string, unknown>;

/** A contract violation the engine refuses to score. Distinguishes "the model
 *  returned garbage" from "the candidate scored 0" — catch this by `name` or
 *  `instanceof` and never persist the result. */
export class ObservationsValidationError extends Error {
  readonly issues: string[];
  constructor(issues: string[]) {
    const shown = issues.slice(0, 6).join('; ');
    super(
      `Model observations failed the ADR-0004 emission contract ` +
        `(${issues.length} issue${issues.length === 1 ? '' : 's'}): ${shown}` +
        (issues.length > 6 ? `; +${issues.length - 6} more` : ''),
    );
    this.name = 'ObservationsValidationError';
    this.issues = issues;
    Object.setPrototypeOf(this, ObservationsValidationError.prototype);
  }
}

export interface ObservationsCheck {
  /** Fatal contract violations. Non-empty ⇒ `value` is null and the grade must not be scored. */
  issues: string[];
  /** Non-fatal removals (malformed array items, undeclared properties) — feeds `droppedTags`. */
  dropped: string[];
  /** The response narrowed to the schema, or null when `issues` is non-empty. */
  value: Observations | null;
}

const MISSING = Symbol('missing');

const typeOf = (v: unknown): string =>
  v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v;

function walk(
  value: unknown,
  schema: JsonSchema,
  path: string,
  sink: { issues: string[]; dropped: string[] },
): unknown | typeof MISSING {
  switch (schema.type) {
    case 'object': {
      if (typeOf(value) !== 'object') {
        sink.issues.push(`${path}: expected object, got ${typeOf(value)}`);
        return MISSING;
      }
      const src = value as Record<string, unknown>;
      const props = (schema.properties as Record<string, JsonSchema> | undefined) ?? {};
      const required = (schema.required as string[] | undefined) ?? [];
      const out: Record<string, unknown> = {};
      for (const [key, sub] of Object.entries(props)) {
        const child = `${path}.${key}`;
        const raw = src[key];
        if (raw === undefined || raw === null) {
          // Presence, not range: absent must never silently become zero.
          if (required.includes(key)) sink.issues.push(`${child}: required property is absent`);
          continue;
        }
        const v = walk(raw, sub, child, sink);
        if (v !== MISSING) out[key] = v;
      }
      if (schema.additionalProperties === false) {
        for (const key of Object.keys(src)) {
          if (!(key in props)) sink.dropped.push(`extraProperty:${path}.${key}`);
        }
      }
      return out;
    }
    case 'array': {
      if (!Array.isArray(value)) {
        sink.issues.push(`${path}: expected array, got ${typeOf(value)}`);
        return MISSING;
      }
      const items = schema.items as JsonSchema | undefined;
      if (!items) return value;
      const out: unknown[] = [];
      value.forEach((el, i) => {
        const itemSink = { issues: [] as string[], dropped: [] as string[] };
        const v = walk(el, items, `${path}[${i}]`, itemSink);
        if (v === MISSING || itemSink.issues.length) {
          sink.dropped.push(`malformedItem:${path}[${i}] (${itemSink.issues[0] ?? 'invalid'})`);
          return;
        }
        sink.dropped.push(...itemSink.dropped);
        out.push(v);
      });
      return out;
    }
    case 'number': {
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        sink.issues.push(
          `${path}: expected a finite number, got ${typeof value === 'number' ? String(value) : typeOf(value)}`,
        );
        return MISSING;
      }
      return value;
    }
    case 'string': {
      if (typeof value !== 'string') {
        sink.issues.push(`${path}: expected string, got ${typeOf(value)}`);
        return MISSING;
      }
      // enum membership is intentionally NOT enforced here — ADR-0004 §5 coerces
      // off-vocab values downstream rather than losing the whole interview.
      return value;
    }
    default:
      return value;
  }
}

/** Validate a raw model response against OBSERVATIONS_JSON_SCHEMA (the same object
 *  the adapters send as the structured-output target — never a second contract). */
export function checkObservations(raw: unknown): ObservationsCheck {
  const sink = { issues: [] as string[], dropped: [] as string[] };
  const value = walk(raw, OBSERVATIONS_JSON_SCHEMA, 'observations', sink);
  return {
    issues: sink.issues,
    dropped: sink.dropped,
    value: sink.issues.length || value === MISSING ? null : (value as Observations),
  };
}

/** `checkObservations`, throwing `ObservationsValidationError` on a fatal violation.
 *  The parse boundary (`apps/waypoint/lib/llm/types.ts`) calls this. */
export function assertObservations(raw: unknown): Observations {
  const check = checkObservations(raw);
  if (!check.value) throw new ObservationsValidationError(check.issues);
  return check.value;
}

/**
 * Map Observations + context → a scored RubricEntry, applying the tiered violation
 * policy (ADR-0004 §5): reject absent/mistyped required fields, clamp score ranges,
 * coerce off-enum values, and detect monotonicity failures (retry-then-flag is the
 * caller's loop). The engine derives finalScore / levels / verdicts because we omit
 * them.
 *
 * @throws {ObservationsValidationError} when the response violates the emission
 *   contract in a score-bearing way. Revalidating here (the parse boundary already
 *   asserted) is what makes "absent ≠ zero" hold for *every* caller of the engine,
 *   not just the LLM path.
 */
export function intakeObservations(
  rawObs: Observations,
  ctx: ObservationContext,
  opts: { retried?: boolean } = {},
): IntakeResult {
  const check = checkObservations(rawObs);
  if (!check.value) throw new ObservationsValidationError(check.issues);
  const obs = check.value;
  const dropped: string[] = [...check.dropped];

  // Clamp: each universal sub-score to [0, dim.max], levels + task to [0, 100].
  // Presence is already guaranteed above, so a 0 here is a real 0.
  const universalSubScores: UniversalSubScores = {};
  for (const d of RD.universalDims) {
    const v = obs.universalSubScores?.[d.id];
    if (v !== undefined && v !== null) universalSubScores[d.id] = clamp(v, 0, d.max);
  }
  const levelScores: LevelScores = {
    L1: clamp(obs.levelScores?.L1),
    L2: clamp(obs.levelScores?.L2),
    L3: clamp(obs.levelScores?.L3),
  };
  const taskSpecificScore = clamp(obs.taskSpecificScore);

  // Coerce enums: keep valid, record dropped.
  const gates: Gates = {};
  for (const g of obs.gates ?? []) {
    if (GATE_ID_SET.has(g.gate) && (GATE_VERDICTS as readonly string[]).includes(g.verdict)) {
      gates[g.gate] = g.verdict;
    } else {
      dropped.push(`gate:${g.gate}=${g.verdict}`);
    }
  }
  const gapTypes = (obs.gapTypes ?? []).filter((t) => {
    const ok = (GAP_TYPES as readonly string[]).includes(t);
    if (!ok) dropped.push(`gapType:${t}`);
    return ok;
  });
  const severity = ((SEVERITY as readonly string[]).includes(obs.severity)
    ? obs.severity
    : 'Medium') as (typeof SEVERITY)[number];
  const nextActionType = ((NEXT_ACTION_TYPES as readonly string[]).includes(obs.nextActionType)
    ? obs.nextActionType
    : 'retest') as (typeof NEXT_ACTION_TYPES)[number];
  const proposedNewTags = (obs.proposedNewTags ?? []).filter((t) =>
    (TAG_CLASSES as readonly string[]).includes(t.tagClass),
  );

  // Monotonicity (L3 ≤ L2 ≤ L1). A first failure signals the caller to retry once;
  // a failure after retry is accepted but flagged (confidence forced Low).
  const monotonicOk = validateMonotonic(levelScores);
  const flagged = !monotonicOk && !!opts.retried;
  const calibrationConfidence = (flagged
    ? 'Low'
    : (CONFIDENCE as readonly string[]).includes(obs.calibrationConfidence)
      ? obs.calibrationConfidence
      : 'Medium') as (typeof CONFIDENCE)[number];

  const range = obs.scoreUncertainty?.range;
  const scoreRange: [number, number] = Array.isArray(range) && range.length >= 2
    ? [num(range[0]), num(range[1])]
    : [0, 0];

  const input: RubricEntryInput = {
    task: ctx.task,
    date: ctx.date,
    taskType: ctx.taskType,
    domain: ctx.domain,
    primaryDomain: ctx.domain,
    primaryRole: ctx.primaryRole,
    problemLevel: ctx.problemLevel,
    difficulty: Math.max(0, Math.min(5, Math.round(num(ctx.difficulty)))) as Difficulty,
    assistanceLevel: 0, // unaided by default (ADR-0003)
    // Coached sessions get a lower evidence class (classB 0.4 vs prospective 1.0).
    evidenceClass: ctx.coached ? 'classB' : 'prospective',
    loggingMode: 'fast',
    universalSubScores,
    levelScores,
    taskSpecificScore,
    gates,
    gapTypes,
    // Free-tag vocabularies (ADR-0004 §2/§5 as amended 2026-08-08): passed through,
    // NOT auto-routed to proposedNewTags. There is no closed vocabulary to test
    // membership against — `aliases.ts` is a retired→canonical rewrite map, not a
    // membership list — and a ProposedNewTag carries a required `reason`, which only
    // the model can author. `normaliseEntry` runs `normalizeTags` over both arrays,
    // which is the whole of the engine-side "soft constraint". Pinned by
    // observations.test.ts so the ADR and this code cannot silently drift again.
    knowledgeGapTags: obs.knowledgeGapTags ?? [],
    weaknessTags: obs.weaknessTags ?? [],
    strengths: obs.strengths ?? '',
    weaknesses: obs.weaknesses ?? '',
    surviveProbing: obs.surviveProbing ?? '',
    proposedNewTags,
    priority: { severity, nextActionType },
    calibration: {
      evaluatorType: 'AI grader',
      graderModel: ctx.graderModel,
      calibrationConfidence,
    },
    assessmentMode: {
      mode: ctx.assessmentMode ?? 'mock interview',
      questionSource: ctx.questionSource,
      followUpsAsked: ctx.followUpsAsked ?? 0,
    },
    scoreUncertainty: { range: scoreRange, reason: obs.scoreUncertainty?.reason ?? '' },
    // Unaided by default; coaching mode records that the model helped (ADR-0001/0003).
    llmIndependence: ctx.coached
      ? { llmUsed: true, llmUseType: ['coaching (mid-answer help)'] }
      : { llmUsed: false },
  };

  return { entry: normaliseEntry(input), monotonicOk, flagged, droppedTags: dropped };
}

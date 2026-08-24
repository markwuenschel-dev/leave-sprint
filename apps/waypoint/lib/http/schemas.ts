/**
 * The request-body contract for every API route, in one place (WP-C08).
 *
 * These interfaces used to live unexported inside each route file, so clients
 * hand-mirrored them at the fetch call site and drift was invisible. They are
 * exported here so both sides import the same declaration, and each one is
 * paired with the parser that produces it — a route may only obtain a body by
 * running the parser, never by casting.
 *
 * Type-only imports throughout (`import type`), so a client component can import
 * these types without pulling provider SDKs or drizzle into the browser bundle.
 * `RD` is the one runtime import: the rubric reference data whose enums the
 * observation context is checked against.
 */

import { RD } from "@waypoint/rubric";
import type { ObservationContext } from "@waypoint/rubric";
import type { ProviderId } from "@/lib/llm/types";
import type { DebriefLevelInput } from "@/lib/interview/prompt";
import type { StudyDigest } from "@/lib/study";
import type { WaypointState } from "@/lib/domain";
import {
  bool,
  everyValue,
  hasStringId,
  invalid,
  isRecord,
  missing,
  num,
  ok,
  oneOf,
  str,
  strArray,
  anyStr,
  type ParseResult,
} from "./parse";

// ── shared enums ──────────────────────────────────────────────────────────────

/** Compile-time drift guard: instantiating it with a non-empty union fails tsc. */
type AssertNever<T extends never> = T;

/** Runtime mirror of the `ProviderId` union (types.ts has no runtime list). */
export const PROVIDER_IDS = ["anthropic", "openai", "grok", "gemini"] as const;
/** Adding a ProviderId without listing it above is a type error, not a silent gap. */
export type ProvidersCovered = AssertNever<Exclude<ProviderId, (typeof PROVIDER_IDS)[number]>>;

export const INTERVIEW_ACTIONS = [
  "question",
  "slate",
  "probe",
  "hint",
  "grade",
  "debrief",
] as const;
export type InterviewAction = (typeof INTERVIEW_ACTIONS)[number];

/** Runtime mirror of `AssessmentMode['mode']` (not exported by the package index). */
const ASSESSMENT_MODES = [
  "written",
  "verbal",
  "live coding",
  "debugging session",
  "project walkthrough",
  "mock interview",
  "real interview",
] as const;
export type AssessmentModesCovered = AssertNever<
  Exclude<NonNullable<ObservationContext["assessmentMode"]>, (typeof ASSESSMENT_MODES)[number]>
>;

const TASK_TYPES = RD.taskTypes.map((t) => t.id);
const ROLES = RD.roles.map((r) => r.id);
const LEVEL_IDS = RD.levels.map((l) => l.id);

// ── /api/interview ────────────────────────────────────────────────────────────

/** Classification + provenance the client supplies; `graderModel` is added by the seam. */
export type InterviewObservationContext = Omit<ObservationContext, "graderModel">;

/** POST /api/interview. `action` defaults to "grade" when absent. */
export interface InterviewRequestBody {
  action?: InterviewAction;
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
  /** probe: true when this is the candidate's last answer for the level. */
  final?: boolean;
  // action: "grade"
  ctx?: InterviewObservationContext;
  question?: string;
  answer?: string;
  probingTranscript?: string;
  knownTags?: string[];
  // action: "debrief"
  session?: DebriefLevelInput[];
}

/**
 * The same body after parsing, narrowed per action — so the route reads
 * `body.question` only where the parser has already guaranteed it. The wire
 * shape above is what a client SENDS; this is what the server may USE.
 */
interface AskFields {
  provider: ProviderId;
  role: string;
  domain: string;
  seed?: string;
  avoid?: string[];
  level?: 1 | 2 | 3;
}

export type ParsedInterviewRequest =
  | ({ action: "question" } & AskFields)
  | ({ action: "slate" } & AskFields)
  | {
      action: "probe";
      provider: ProviderId;
      transcript: string;
      final?: boolean;
      level?: 1 | 2 | 3;
    }
  | { action: "hint"; provider: ProviderId; transcript: string }
  | { action: "debrief"; provider: ProviderId; session: DebriefLevelInput[] }
  | {
      action: "grade";
      provider: ProviderId;
      ctx: InterviewObservationContext;
      question: string;
      answer: string;
      probingTranscript?: string;
      knownTags?: string[];
    };

/**
 * Parse an observation context. This is the record whose fields land verbatim in
 * a persisted RubricEntry, so every field the intake reads is checked here:
 * before WP-C08 any truthy object reached `intakeObservations` unexamined.
 */
export function parseObservationContext(
  raw: unknown,
  path = "ctx",
): ParseResult<InterviewObservationContext> {
  if (!isRecord(raw)) return invalid(path, "an object");

  const task = str(raw.task);
  if (!task) return missing(`${path}.task`);
  const date = str(raw.date);
  if (!date) return missing(`${path}.date`);
  if (!/^\d{4}-\d{2}-\d{2}/.test(date)) return invalid(`${path}.date`, "an ISO date (YYYY-MM-DD)");

  const taskType = oneOf(raw.taskType, TASK_TYPES);
  if (!taskType) return invalid(`${path}.taskType`, `one of ${TASK_TYPES.join(", ")}`);
  const domain = str(raw.domain);
  if (!domain) return missing(`${path}.domain`);
  const primaryRole = oneOf(raw.primaryRole, ROLES);
  if (!primaryRole) return invalid(`${path}.primaryRole`, `one of ${ROLES.join(", ")}`);
  const problemLevel = oneOf(raw.problemLevel, LEVEL_IDS);
  if (!problemLevel) return invalid(`${path}.problemLevel`, `one of ${LEVEL_IDS.join(", ")}`);

  const difficulty = num(raw.difficulty);
  if (difficulty === undefined) return missing(`${path}.difficulty`);
  if (difficulty < 0 || difficulty > 5) return invalid(`${path}.difficulty`, "a number 0–5");

  const questionSource = str(raw.questionSource);
  if (!questionSource) return missing(`${path}.questionSource`);

  const ctx: InterviewObservationContext = {
    task,
    date,
    taskType,
    domain,
    primaryRole,
    problemLevel,
    difficulty,
    questionSource,
  };

  if (raw.assessmentMode !== undefined) {
    const mode = oneOf(raw.assessmentMode, ASSESSMENT_MODES);
    if (!mode) return invalid(`${path}.assessmentMode`, `one of ${ASSESSMENT_MODES.join(", ")}`);
    ctx.assessmentMode = mode;
  }
  if (raw.followUpsAsked !== undefined) {
    const n = num(raw.followUpsAsked);
    if (n === undefined || n < 0) return invalid(`${path}.followUpsAsked`, "a non-negative number");
    ctx.followUpsAsked = Math.floor(n);
  }
  if (raw.coached !== undefined) {
    const c = bool(raw.coached);
    if (c === undefined) return invalid(`${path}.coached`, "a boolean");
    ctx.coached = c;
  }
  return ok(ctx);
}

function parseSession(raw: unknown): ParseResult<DebriefLevelInput[]> {
  if (!Array.isArray(raw)) return invalid("session", "an array of graded levels");
  if (!raw.length) return missing("session");
  const out: DebriefLevelInput[] = [];
  for (let i = 0; i < raw.length; i++) {
    const s = raw[i];
    if (!isRecord(s)) return invalid(`session[${i}]`, "an object");
    const level = num(s.level);
    if (level !== 1 && level !== 2 && level !== 3) return invalid(`session[${i}].level`, "1, 2 or 3");
    const finalScore = num(s.finalScore);
    if (finalScore === undefined) return invalid(`session[${i}].finalScore`, "a number");
    const question = anyStr(s.question);
    const answer = anyStr(s.answer);
    if (question === undefined || answer === undefined) {
      return invalid(`session[${i}]`, "string `question` and `answer`");
    }
    out.push({
      level,
      finalScore,
      passed: bool(s.passed) ?? false,
      question,
      answer,
      ...(str(s.probing) ? { probing: str(s.probing)! } : {}),
      ...(str(s.strengths) ? { strengths: str(s.strengths)! } : {}),
      ...(str(s.weaknesses) ? { weaknesses: str(s.weaknesses)! } : {}),
    });
  }
  return ok(out);
}

/**
 * Parse a POST /api/interview body. Enforces the per-action required fields the
 * route used to check ad hoc, plus the types it never checked at all.
 * `provider` availability stays with the route (it needs the env-derived list).
 */
export function parseInterviewBody(raw: unknown): ParseResult<ParsedInterviewRequest> {
  if (!isRecord(raw)) return invalid("body", "a JSON object");

  const provider = oneOf(raw.provider, PROVIDER_IDS);
  if (!provider) {
    return str(raw.provider)
      ? invalid("provider", `one of ${PROVIDER_IDS.join(", ")}`)
      : missing("provider");
  }

  const action = raw.action === undefined ? "grade" : oneOf(raw.action, INTERVIEW_ACTIONS);
  if (!action) return invalid("action", `one of ${INTERVIEW_ACTIONS.join(", ")}`);

  let level: 1 | 2 | 3 | undefined;
  if (raw.level !== undefined) {
    const n = num(raw.level);
    if (n !== 1 && n !== 2 && n !== 3) return invalid("level", "1, 2 or 3");
    level = n;
  }

  if (action === "question" || action === "slate") {
    const role = str(raw.role);
    if (!role) return missing("role");
    const domain = str(raw.domain);
    if (!domain) return missing("domain");
    let avoid: string[] | undefined;
    if (raw.avoid !== undefined) {
      avoid = strArray(raw.avoid);
      if (!avoid) return invalid("avoid", "an array of strings");
    }
    let seed: string | undefined;
    if (raw.seed !== undefined) {
      seed = anyStr(raw.seed);
      if (seed === undefined) return invalid("seed", "a string");
    }
    const fields: AskFields = {
      provider,
      role,
      domain,
      ...(seed !== undefined ? { seed } : {}),
      ...(avoid ? { avoid } : {}),
      ...(level ? { level } : {}),
    };
    return ok(action === "slate" ? { action: "slate", ...fields } : { action: "question", ...fields });
  }

  if (action === "probe" || action === "hint") {
    const transcript = str(raw.transcript);
    if (!transcript) return missing("transcript");
    if (action === "hint") return ok({ action, provider, transcript });
    let final: boolean | undefined;
    if (raw.final !== undefined) {
      final = bool(raw.final);
      if (final === undefined) return invalid("final", "a boolean");
    }
    return ok({ action, provider, transcript, ...(final !== undefined ? { final } : {}), ...(level ? { level } : {}) });
  }

  if (action === "debrief") {
    const session = parseSession(raw.session);
    if (!session.ok) return session;
    return ok({ action, provider, session: session.value });
  }

  // action === "grade"
  if (raw.ctx === undefined) return missing("ctx");
  const question = str(raw.question);
  if (!question) return missing("question");
  const answer = str(raw.answer);
  if (!answer) return missing("answer");
  const ctx = parseObservationContext(raw.ctx);
  if (!ctx.ok) return ctx;

  let probingTranscript: string | undefined;
  if (raw.probingTranscript !== undefined && raw.probingTranscript !== null) {
    if (typeof raw.probingTranscript !== "string") return invalid("probingTranscript", "a string");
    probingTranscript = str(raw.probingTranscript);
  }
  let knownTags: string[] | undefined;
  if (raw.knownTags !== undefined) {
    knownTags = strArray(raw.knownTags);
    if (!knownTags) return invalid("knownTags", "an array of strings");
  }

  return ok({
    action,
    provider,
    ctx: ctx.value,
    question,
    answer,
    ...(probingTranscript ? { probingTranscript } : {}),
    ...(knownTags ? { knownTags } : {}),
  });
}

// ── /api/study ────────────────────────────────────────────────────────────────

/** POST /api/study. */
export interface StudyRequestBody {
  provider: ProviderId;
  digest: StudyDigest;
}

export function parseStudyBody(raw: unknown): ParseResult<StudyRequestBody> {
  if (!isRecord(raw)) return invalid("body", "a JSON object");
  const provider = oneOf(raw.provider, PROVIDER_IDS);
  if (!provider) {
    return str(raw.provider)
      ? invalid("provider", `one of ${PROVIDER_IDS.join(", ")}`)
      : missing("provider");
  }
  const digest = raw.digest;
  if (digest === undefined || digest === null) return missing("digest");
  if (!isRecord(digest)) return invalid("digest", "an object");
  if (!str(digest.role)) return missing("digest.role");
  // The lists the prompt builder and the id-grounding walk unconditionally: a
  // missing one used to be a TypeError → 500 instead of a 4xx.
  for (const key of ["misses", "qbankCandidates", "dueRetests", "defenseStories"]) {
    if (!Array.isArray(digest[key])) return invalid(`digest.${key}`, "an array");
  }
  return ok({ provider, digest: digest as unknown as StudyDigest });
}

// ── /api/state ────────────────────────────────────────────────────────────────

/**
 * PUT|POST /api/state. The persisted slice plus the authoritative flag: without
 * the flag the save is upsert-only, so a pre-hydration slice can add but never
 * delete (see saveState in lib/db/state.ts).
 */
export type StateSaveRequestBody = WaypointState & { __authoritative?: boolean };

/**
 * Parse a state save. Deliberately conservative — this is the sole write path
 * for the user's real grade history, so it checks exactly the structure
 * `saveState` dereferences (the collections it iterates and the fields it uses
 * as primary keys) and passes everything else through untouched. Rubric rows
 * get a type fitness-check on present fields only (WP-C25) — unknown extras
 * and a thin `{ id }` still pass, so we never drop history.
 */
export function parseStateBody(raw: unknown): ParseResult<StateSaveRequestBody> {
  if (!isRecord(raw)) return invalid("body", "a JSON object");

  // Collections saveState iterates unconditionally — absent ⇒ TypeError ⇒ 500.
  const objectCollections = ["rhythmDays", "weeklyReviews", "qbankStatus"] as const;
  for (const key of objectCollections) {
    if (raw[key] === undefined) return missing(key);
    if (!isRecord(raw[key])) return invalid(key, "an object keyed by id");
  }
  const arrayCollections = ["problems", "fileDefense", "rubricEntries", "applications"] as const;
  for (const key of arrayCollections) {
    if (raw[key] === undefined) return missing(key);
    if (!Array.isArray(raw[key])) return invalid(key, "an array");
    const rows = raw[key] as unknown[];
    if (!rows.every(hasStringId)) return invalid(key, "rows each carrying a string `id`");
  }

  // Career Library collections are OPTIONAL, unlike the four above. saveState
  // reads them as `slice.x ?? []`, so a client that predates them — or any
  // hand-rolled PUT — saves successfully instead of taking a 400 for a field it
  // has never heard of. When present they must still be arrays of id-bearing rows.
  const optionalArrayCollections = ["projects", "resumes", "jobTargets", "campaigns"] as const;
  for (const key of optionalArrayCollections) {
    if (raw[key] === undefined) continue;
    if (!Array.isArray(raw[key])) return invalid(key, "an array");
    const rows = raw[key] as unknown[];
    if (!rows.every(hasStringId)) return invalid(key, "rows each carrying a string `id`");
  }

  const rhythmDays = raw.rhythmDays as Record<string, unknown>;
  if (!everyValue(rhythmDays, (d) => isRecord(d) && !!str(d.date) && isRecord(d.slots))) {
    return invalid("rhythmDays", "days carrying a string `date` and a `slots` object");
  }
  const weeklyReviews = raw.weeklyReviews as Record<string, unknown>;
  if (!everyValue(weeklyReviews, (w) => isRecord(w) && !!str(w.weekStart))) {
    return invalid("weeklyReviews", "reviews carrying a string `weekStart`");
  }
  const qbankStatus = raw.qbankStatus as Record<string, unknown>;
  if (!everyValue(qbankStatus, (s) => !!str(s))) {
    return invalid("qbankStatus", "a status string per question id");
  }

  // Scalars/metadata: optional (every column has a DB default), but when sent
  // they must be the right type — they land in wp_app_meta verbatim.
  if (raw.phase !== undefined && !oneOf(raw.phase, ["A", "B"] as const)) {
    return invalid("phase", '"A" or "B"');
  }
  if (raw.roleFilter !== undefined && !str(raw.roleFilter)) {
    return invalid("roleFilter", "a string");
  }
  if (raw.qbankPos !== undefined && !isRecord(raw.qbankPos)) {
    return invalid("qbankPos", "an object { track, idx }");
  }
  for (const key of ["qbankOrder", "studyGuides", "solidInterviewLogs"] as const) {
    if (raw[key] !== undefined && !isRecord(raw[key])) return invalid(key, "an object");
  }
  if (raw.mockSeq !== undefined && num(raw.mockSeq) === undefined) {
    return invalid("mockSeq", "a number");
  }
  if (raw.mockAsked !== undefined && !Array.isArray(raw.mockAsked)) {
    return invalid("mockAsked", "an array of strings");
  }
  if (raw.lastUpdated !== undefined && !str(raw.lastUpdated)) {
    return invalid("lastUpdated", "an ISO timestamp string");
  }
  if (raw.__authoritative !== undefined && bool(raw.__authoritative) === undefined) {
    return invalid("__authoritative", "a boolean");
  }

  const rubricFitness = checkRubricEntries(raw.rubricEntries as unknown[]);
  if (!rubricFitness.ok) return rubricFitness;

  // Catalog `{ id }` rows: empty-string fill for NOT NULL columns. Rubric date is defaulted in the mapper.
  defaultMissingStrings(raw.problems as unknown[], PROBLEM_REQUIRED_STRINGS);
  defaultMissingStrings(raw.fileDefense as unknown[], DEFENSE_REQUIRED_STRINGS);
  defaultMissingStrings(raw.applications as unknown[], APPLICATION_REQUIRED_STRINGS);
  defaultMissingStrings(asRows(raw.projects), PROJECT_REQUIRED_STRINGS);
  defaultMissingStrings(asRows(raw.resumes), RESUME_REQUIRED_STRINGS);
  defaultMissingStrings(asRows(raw.jobTargets), JOB_TARGET_REQUIRED_STRINGS);
  defaultMissingStrings(asRows(raw.campaigns), CAMPAIGN_REQUIRED_STRINGS);

  return ok(raw as unknown as StateSaveRequestBody);
}

const PROBLEM_REQUIRED_STRINGS = ["title", "tier", "pattern", "status"] as const;
const DEFENSE_REQUIRED_STRINGS = ["title", "why", "terminology", "interviewLine"] as const;
/** Optional collections arrive as `undefined`; treat that as no rows to fill. */
function asRows(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

/** NOT NULL text columns on wp_projects — a thin `{ id }` row would otherwise 500. */
const PROJECT_REQUIRED_STRINGS = [
  "slug",
  "name",
  "summary",
  "stage",
  "ownership",
  "createdAt",
  "updatedAt",
] as const;
const RESUME_REQUIRED_STRINGS = ["label", "createdAt", "updatedAt"] as const;
const JOB_TARGET_REQUIRED_STRINGS = [
  "company",
  "roleTitle",
  "createdAt",
  "updatedAt",
] as const;
const CAMPAIGN_REQUIRED_STRINGS = [
  "jobTargetId",
  "careerRole",
  "createdAt",
  "updatedAt",
] as const;

const APPLICATION_REQUIRED_STRINGS = [
  "company",
  "roleTitle",
  "targetRole",
  "status",
  "statusChangedAt",
  "createdAt",
  "updatedAt",
] as const;

function defaultMissingStrings(rows: unknown[], keys: readonly string[]): void {
  for (const row of rows) {
    if (!isRecord(row)) continue;
    for (const key of keys) {
      if (row[key] == null) row[key] = "";
    }
  }
}

/** Score fields a persisted rubric row may carry — present ⇒ must be a finite number. */
const RUBRIC_SCORE_FIELDS = [
  "finalScore",
  "rawScore",
  "universalScore",
  "taskSpecificScore",
  "difficulty",
  "assistanceLevel",
] as const;

/**
 * Fitness-check a rubric row without requiring a full RubricEntry (WP-C25).
 * Extra unknown fields pass through; only present typed fields are constrained.
 */
function checkRubricEntries(rows: unknown[]): ParseResult<true> {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!isRecord(row)) continue;
    if (row.date !== undefined && typeof row.date !== "string") {
      return invalid(`rubricEntries[${i}].date`, "a string");
    }
    for (const key of RUBRIC_SCORE_FIELDS) {
      if (row[key] !== undefined && num(row[key]) === undefined) {
        return invalid(`rubricEntries[${i}].${key}`, "a finite number");
      }
    }
    if (row.diagnostic !== undefined && !isRecord(row.diagnostic)) {
      return invalid(`rubricEntries[${i}].diagnostic`, "an object");
    }
  }
  return ok(true);
}

// ── /api/unlock ───────────────────────────────────────────────────────────────

/** POST /api/unlock. A single non-empty token string. */
export interface UnlockRequestBody {
  token: string;
}

export function parseUnlockBody(raw: unknown): ParseResult<UnlockRequestBody> {
  if (!isRecord(raw)) return invalid("body", "a JSON object");
  if (raw.token === undefined) return missing("token");
  if (typeof raw.token !== "string" || raw.token.length === 0) {
    return invalid("token", "a non-empty string");
  }
  return ok({ token: raw.token });
}

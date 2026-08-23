/**
 * Shared request ingest for the API routes (WP-C08). Parse-don't-validate, the
 * same discipline as lib/portfolio/validate.ts: a route NEVER casts
 * `await req.json()` into its body interface. It hands the unknown value to a
 * parser that returns either a typed value or a `BodyFailure` the route turns
 * into a 4xx — never a 500, never a silent accept.
 *
 * Two layers live here:
 *   • transport — read the body under a hard byte cap, then JSON.parse it;
 *   • primitives — the small coercers (`str`, `num`, `strArray`, …) the
 *     per-route parsers in ./schemas.ts are built from.
 *
 * Nothing in this file throws on bad input, and nothing imports next/server, so
 * the parsers stay unit-testable without a request lifecycle. (HTTP glue lives
 * in ./respond.ts.)
 */

/** A rejected request: a stable machine code, a safe message, and the status. */
export interface BodyFailure {
  /** Stable code the client can branch on (`invalid_json`, `missing_fields`, …). */
  error: string;
  /** Human-readable detail. Never echoes body content back to the caller. */
  message: string;
  status: 400 | 413;
}

export type ParseResult<T> = { ok: true; value: T } | { ok: false; failure: BodyFailure };

export function ok<T>(value: T): ParseResult<T> {
  return { ok: true, value };
}

export function fail(error: string, message: string, status: 400 | 413 = 400): ParseResult<never> {
  return { ok: false, failure: { error, message, status } };
}

/** Missing/absent required field — keeps the pre-existing `missing_fields` code. */
export function missing(field: string): ParseResult<never> {
  return fail("missing_fields", `Required field \`${field}\` is missing.`);
}

/** Present but the wrong shape. Distinct code so a client can tell them apart. */
export function invalid(field: string, expected: string): ParseResult<never> {
  return fail("invalid_field", `Field \`${field}\` is invalid — expected ${expected}.`);
}

/**
 * Per-route request-body byte caps.
 *
 * `state` is the sole write path for the whole store, so it is the one that
 * matters. Sizing: serverStorage.ts:52-56 records that a real save crosses the
 * 64KB browser keepalive cap after ~15 graded turns — i.e. ~4.3KB per graded
 * entry once the catalog is in. 16MB therefore holds roughly 3,800 graded turns
 * plus the full catalog, ~40x any realistic history for a single-user log, while
 * still bounding one request's memory to something a Node process shrugs at.
 * The other routes carry a prompt-sized payload (one transcript or one digest),
 * so they get a much tighter bound.
 */
export const BODY_LIMITS = {
  /** /api/state — whole persisted slice (grade history). */
  state: 16 * 1024 * 1024,
  /** /api/interview — one question/answer/probing transcript. */
  interview: 1024 * 1024,
  /** /api/study — one deterministic digest. */
  study: 2 * 1024 * 1024,
  /** /api/transcribe — one recorded answer (OpenAI's own upload cap is 25MB). */
  audio: 25 * 1024 * 1024,
  /** /api/unlock — a single short token string. */
  unlock: 4 * 1024,
} as const;

const TOO_LARGE = (maxBytes: number) =>
  fail(
    "payload_too_large",
    `Request body exceeds the ${Math.round(maxBytes / 1024)}KB limit for this endpoint.`,
    413,
  );

/**
 * Read a request body as text, refusing anything over `maxBytes`. Streams and
 * aborts mid-read, so an oversized body is never fully buffered — a declared
 * `content-length` short-circuits before a single chunk is read.
 */
export async function readBoundedText(
  req: Request,
  maxBytes: number,
): Promise<ParseResult<string>> {
  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) return TOO_LARGE(maxBytes);

  try {
    const stream = req.body;
    if (!stream) {
      const text = await req.text();
      if (byteLength(text) > maxBytes) return TOO_LARGE(maxBytes);
      return ok(text);
    }
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => {});
        return TOO_LARGE(maxBytes);
      }
      chunks.push(value);
    }
    return ok(new TextDecoder().decode(concat(chunks, total)));
  } catch {
    return fail("unreadable_body", "Request body could not be read.");
  }
}

function byteLength(text: string): number {
  return new TextEncoder().encode(text).byteLength;
}

function concat(chunks: Uint8Array[], total: number): Uint8Array {
  if (chunks.length === 1) return chunks[0];
  const out = new Uint8Array(total);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.byteLength;
  }
  return out;
}

/** Read + size-cap + JSON.parse. The result is `unknown` on purpose: the caller
 *  must run it through a parser before it may be treated as a body type. */
export async function readJsonBody(req: Request, maxBytes: number): Promise<ParseResult<unknown>> {
  const text = await readBoundedText(req, maxBytes);
  if (!text.ok) return text;
  if (!text.value.trim()) return fail("invalid_json", "Request body was empty; expected JSON.");
  try {
    return ok(JSON.parse(text.value) as unknown);
  } catch {
    return fail("invalid_json", "Request body was not valid JSON.");
  }
}

/**
 * Read a multipart upload field as a File, under a byte cap.
 * A numeric Content-Length is required so formData() never buffers an unbounded body.
 */
export async function readAudioUpload(
  req: Request,
  field: string,
  maxBytes: number,
): Promise<ParseResult<File>> {
  const raw = req.headers.get("content-length");
  const declared = Number(raw);
  if (raw == null || !Number.isFinite(declared)) {
    return fail(
      "invalid_content_length",
      "A numeric Content-Length header is required before the upload is read.",
    );
  }
  if (declared > maxBytes) return TOO_LARGE(maxBytes);
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail("invalid_form", "Request was not readable multipart/form-data.");
  }
  const value = form.get(field);
  if (!(value instanceof File) || value.size === 0) {
    return fail("missing_audio", `Multipart field \`${field}\` must carry a non-empty file.`);
  }
  if (value.size > maxBytes) return TOO_LARGE(maxBytes);
  return ok(value);
}

// ── primitives ────────────────────────────────────────────────────────────────

export function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

/** Trimmed non-empty string, else undefined. */
export function str(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  return s ? s : undefined;
}

/** Any string (including ""), else undefined — for fields where "" is meaningful. */
export function anyStr(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

export function num(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

export function bool(v: unknown): boolean | undefined {
  return typeof v === "boolean" ? v : undefined;
}

/** Array of non-empty strings; non-arrays → undefined, bad elements dropped. */
export function strArray(v: unknown, cap = 512): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out: string[] = [];
  for (const x of v) {
    const s = str(x);
    if (s) out.push(s);
    if (out.length >= cap) break;
  }
  return out;
}

export function oneOf<T extends string>(v: unknown, allowed: readonly T[]): T | undefined {
  return typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : undefined;
}

/** Every value of a plain object satisfies `check`. */
export function everyValue(
  rec: Record<string, unknown>,
  check: (v: unknown) => boolean,
): boolean {
  for (const key of Object.keys(rec)) if (!check(rec[key])) return false;
  return true;
}

/** A record carrying a non-empty string `id` — the shape every persisted row needs. */
export function hasStringId(v: unknown): boolean {
  return isRecord(v) && !!str(v.id);
}

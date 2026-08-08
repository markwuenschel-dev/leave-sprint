/**
 * How a failure becomes an HTTP response (WP-C08 / cross-lane hand-off).
 *
 * Three failure classes have to stay distinguishable — in the body AND in the
 * server log — because they have three different owners:
 *
 *   client_input   (a) the caller sent something malformed        → 4xx
 *   model_response (b) the provider returned something unusable   → 502
 *   upstream       (b') the provider itself failed (rate limit, network) → 502
 *   internal       (c) our own code faulted                       → 500
 *
 * Before this, every post-validation throw collapsed into one opaque
 * `502 <action>_failed`, so "the model emitted garbage" and "we have a bug" were
 * indistinguishable from the outside.
 *
 * NOTE (cross-lane): lib/llm/types.ts is being hardened so a malformed model
 * response THROWS rather than silently producing an all-zero grade. That file is
 * not ours to edit, so `classifyError` recognises the throw structurally rather
 * than importing an error class that may or may not exist yet: today's
 * `parseObservations` failure is a `SyntaxError` from `JSON.parse`
 * (lib/llm/types.ts:38-43), and any purpose-built error is matched on its
 * name/code/kind mentioning observations / parse / schema.
 */

import { NextResponse } from "next/server";
import type { BodyFailure } from "./parse";

export type FailureKind = "client_input" | "model_response" | "upstream" | "internal";

/** 4xx for a rejected request body. `kind` is always "client_input" here. */
export function failureResponse(failure: BodyFailure): NextResponse {
  return NextResponse.json(
    { error: failure.error, message: failure.message, kind: "client_input" satisfies FailureKind },
    { status: failure.status },
  );
}

function propOf(err: unknown, key: string): unknown {
  return err && typeof err === "object" ? (err as Record<string, unknown>)[key] : undefined;
}

/** Matched against an error's name/code/kind — identifier-shaped, so broad is safe. */
const MODEL_RESPONSE_HINT =
  /observation|unparseable|unparsable|malformed|invalid[_ -]?(json|schema|grade|response)/i;
/** Matched against free-text messages, where a broad pattern would over-fire. */
const MODEL_RESPONSE_MESSAGE_HINT = /observations|unparseable|unparsable|malformed/i;

/**
 * Classify a thrown error into one of the failure kinds above.
 *
 * Deliberately conservative about 500: only a fault we can positively identify
 * as ours (a TypeError/ReferenceError/RangeError — i.e. a programming error)
 * downgrades to `internal`. Everything unrecognised stays a 502, which is the
 * status this route already returned, so no currently-working client sees a
 * changed status for a case we cannot classify.
 */
export function classifyError(err: unknown): { kind: FailureKind; status: 500 | 502 } {
  const name = String(propOf(err, "name") ?? "");
  const code = String(propOf(err, "code") ?? "");
  const kindProp = String(propOf(err, "kind") ?? "");
  const message = String(propOf(err, "message") ?? "");

  if (
    err instanceof SyntaxError ||
    kindProp === "model_response" ||
    MODEL_RESPONSE_HINT.test(name) ||
    MODEL_RESPONSE_HINT.test(code) ||
    MODEL_RESPONSE_MESSAGE_HINT.test(message)
  ) {
    return { kind: "model_response", status: 502 };
  }
  if (err instanceof TypeError || err instanceof ReferenceError || err instanceof RangeError) {
    return { kind: "internal", status: 500 };
  }
  return { kind: "upstream", status: 502 };
}

/**
 * Turn a caught error into a response, logged under its class. `error` keeps the
 * pre-existing `<action>_failed` code so existing clients keep working; `kind`
 * is the new, machine-readable distinction.
 */
export function errorResponse(route: string, action: string, err: unknown): NextResponse {
  const { kind, status } = classifyError(err);
  console.error(`${route} failed [${kind}] action=${action}:`, err);
  return NextResponse.json(
    {
      error: `${action}_failed`,
      kind,
      message: String((err as Error)?.message ?? err).slice(0, 300),
    },
    { status },
  );
}

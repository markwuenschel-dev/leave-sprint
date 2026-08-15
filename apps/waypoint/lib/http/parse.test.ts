/**
 * WP-C08 — transport layer: a request body is read under a hard byte cap and
 * JSON-parsed into `unknown`, never cast. Before this module every route did
 * `(await req.json()) as SomeBody` with no size bound at all.
 */

import { describe, expect, it } from "vitest";
import {
  BODY_LIMITS,
  everyValue,
  hasStringId,
  isRecord,
  num,
  oneOf,
  readAudioUpload,
  readBoundedText,
  readJsonBody,
  str,
  strArray,
  type BodyFailure,
  type ParseResult,
} from "./parse";

/** Unwrap without branching, so every assertion below runs unconditionally. */
const failureOf = (r: ParseResult<unknown>): BodyFailure | null => (r.ok ? null : r.failure);

function jsonReq(body: string, url = "http://localhost/api/state"): Request {
  return new Request(url, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body,
  });
}

describe("readBoundedText", () => {
  it("reads a body under the cap", async () => {
    const res = await readBoundedText(jsonReq('{"a":1}'), 1024);
    expect(res.ok && res.value).toBe('{"a":1}');
  });

  it("refuses a body over the cap with 413, not a 500", async () => {
    const res = await readBoundedText(jsonReq(JSON.stringify({ a: "x".repeat(500) })), 64);
    expect(failureOf(res)).toMatchObject({ status: 413, error: "payload_too_large" });
  });

  it("short-circuits on a declared content-length over the cap", async () => {
    const req = new Request("http://localhost/api/state", {
      method: "PUT",
      headers: { "content-type": "application/json", "content-length": String(999_999_999) },
      body: "{}",
    });
    const res = await readBoundedText(req, 1024);
    expect(res.ok).toBe(false);
  });

  it("decodes multi-byte characters correctly across chunks", async () => {
    const body = JSON.stringify({ note: "héllo — ✅ 日本語" });
    const res = await readJsonBody(jsonReq(body), 4096);
    expect(res.ok && (res.value as { note: string }).note).toBe("héllo — ✅ 日本語");
  });
});

describe("readJsonBody", () => {
  it("rejects malformed JSON with 400 invalid_json", async () => {
    const res = await readJsonBody(jsonReq("{not json"), 1024);
    expect(failureOf(res)).toMatchObject({ status: 400, error: "invalid_json" });
  });

  it("rejects an empty body with 400 rather than parsing `undefined`", async () => {
    const res = await readJsonBody(jsonReq(""), 1024);
    expect(failureOf(res)).toMatchObject({ status: 400 });
  });

  it("returns unknown, not a cast — a JSON scalar survives the read", async () => {
    const res = await readJsonBody(jsonReq("42"), 1024);
    expect(res.ok && res.value).toBe(42);
  });
});

function audioReq(form: FormData, headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/transcribe", {
    method: "POST",
    headers,
    body: form,
  });
}

describe("readAudioUpload", () => {
  it("accepts a non-empty file field", async () => {
    const form = new FormData();
    form.set("audio", new File([new Uint8Array([1, 2, 3])], "answer.webm", { type: "audio/webm" }));
    const req = audioReq(form, { "content-length": "128" });
    const res = await readAudioUpload(req, "audio", BODY_LIMITS.audio);
    expect(res.ok).toBe(true);
  });

  it("rejects an oversized upload with 413", async () => {
    const form = new FormData();
    form.set("audio", new File([new Uint8Array(2048)], "answer.webm"));
    // Declared length is under the cap so the File.size check is what trips 413.
    const req = audioReq(form, { "content-length": "256" });
    const res = await readAudioUpload(req, "audio", 512);
    expect(failureOf(res)).toMatchObject({ status: 413 });
  });

  it("keeps the pre-existing missing_audio code for an absent field", async () => {
    const form = new FormData();
    const req = audioReq(form, { "content-length": "16" });
    const res = await readAudioUpload(req, "audio", BODY_LIMITS.audio);
    expect(failureOf(res)).toMatchObject({ error: "missing_audio" });
  });

  it("refuses a request without Content-Length before reading the body", async () => {
    const form = new FormData();
    form.set("audio", new File([new Uint8Array([1, 2, 3])], "answer.webm"));
    const req = audioReq(form);
    expect(req.headers.get("content-length")).toBeNull();
    const res = await readAudioUpload(req, "audio", BODY_LIMITS.audio);
    expect(res.ok).toBe(false);
    expect(failureOf(res)).toMatchObject({ status: 400 });
  });

  it("refuses a non-numeric Content-Length before reading the body", async () => {
    const form = new FormData();
    form.set("audio", new File([new Uint8Array([1, 2, 3])], "answer.webm"));
    const req = audioReq(form, { "content-length": "nope" });
    const res = await readAudioUpload(req, "audio", BODY_LIMITS.audio);
    expect(res.ok).toBe(false);
    expect(failureOf(res)).toMatchObject({ status: 400 });
  });
});

describe("BODY_LIMITS", () => {
  it("bounds the persistence path generously but finitely", () => {
    // ~4.3KB per graded turn (serverStorage.ts:52-56) ⇒ ~3,800 turns.
    expect(BODY_LIMITS.state).toBe(16 * 1024 * 1024);
    expect(Number.isFinite(BODY_LIMITS.state)).toBe(true);
    expect(BODY_LIMITS.interview).toBeLessThan(BODY_LIMITS.state);
  });

  it("caps unlock at a token-sized bound (WP-C21)", () => {
    expect(BODY_LIMITS.unlock).toBe(4 * 1024);
    expect(BODY_LIMITS.unlock).toBeLessThan(BODY_LIMITS.interview);
  });
});

describe("primitives", () => {
  it("str trims and rejects non-strings and blanks", () => {
    expect(str("  a ")).toBe("a");
    expect(str("   ")).toBeUndefined();
    expect(str(5)).toBeUndefined();
  });
  it("num rejects NaN/Infinity and numeric strings", () => {
    expect(num(3)).toBe(3);
    expect(num("3")).toBeUndefined();
    expect(num(Number.NaN)).toBeUndefined();
    expect(num(Number.POSITIVE_INFINITY)).toBeUndefined();
  });
  it("strArray returns undefined for non-arrays and drops bad elements", () => {
    expect(strArray(["a", 1, "b"])).toEqual(["a", "b"]);
    expect(strArray("a")).toBeUndefined();
  });
  it("isRecord rejects arrays and null", () => {
    expect(isRecord({})).toBe(true);
    expect(isRecord([])).toBe(false);
    expect(isRecord(null)).toBe(false);
  });
  it("everyValue / hasStringId check container interiors", () => {
    expect(everyValue({ a: "x", b: "y" }, (v) => typeof v === "string")).toBe(true);
    expect(everyValue({ a: "x", b: 1 }, (v) => typeof v === "string")).toBe(false);
    expect(hasStringId({ id: "e1" })).toBe(true);
    expect(hasStringId({ id: 1 })).toBe(false);
    expect(hasStringId(null)).toBe(false);
  });
  it("oneOf narrows to the allowed list", () => {
    expect(oneOf("a", ["a", "b"] as const)).toBe("a");
    expect(oneOf("c", ["a", "b"] as const)).toBeUndefined();
  });
});

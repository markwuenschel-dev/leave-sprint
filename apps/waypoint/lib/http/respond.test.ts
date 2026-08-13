/**
 * WP-C23 — `errorResponse` must not echo a thrown Error.message to the client.
 * The body keeps `error` (`${action}_failed`) and `kind`; `message` is a
 * stable, kind-keyed string that cannot carry secrets. The real error is
 * still logged server-side.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { classifyError, errorResponse } from "./respond";

afterEach(() => {
  vi.restoreAllMocks();
});

async function bodyOf(res: Response): Promise<{ error: string; kind: string; message: string }> {
  return res.json() as Promise<{ error: string; kind: string; message: string }>;
}

describe("errorResponse", () => {
  it("does not put a raw Error.message (or a secret substring) in the JSON body", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const err = new Error("sk-SECRET-abc");
    const res = errorResponse("POST /api/interview", "grade", err);
    const body = await bodyOf(res);

    expect(body.error).toBe("grade_failed");
    expect(body.kind).toBe("upstream");
    expect(body.message).not.toContain("sk-SECRET");
    expect(body.message).not.toBe("sk-SECRET-abc");
    expect(body.message).not.toContain("sk-SECRET-abc");
    expect(log).toHaveBeenCalledWith(
      "POST /api/interview failed [upstream] action=grade:",
      err,
    );
  });

  it("uses a stable kind-keyed safe string for each classified kind", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    const model = await bodyOf(errorResponse("POST /api/interview", "grade", new SyntaxError("bad json")));
    expect(model).toEqual({
      error: "grade_failed",
      kind: "model_response",
      message: "The model returned an unusable response.",
    });

    const upstream = await bodyOf(errorResponse("POST /api/interview", "grade", new Error("429 rate_limit")));
    expect(upstream).toEqual({
      error: "grade_failed",
      kind: "upstream",
      message: "The upstream provider failed.",
    });

    const internal = await bodyOf(errorResponse("POST /api/interview", "grade", new TypeError("x is not a function")));
    expect(internal).toEqual({
      error: "grade_failed",
      kind: "internal",
      message: "An internal error occurred.",
    });
  });
});

describe("classifyError", () => {
  it("still classifies TypeError as internal and SyntaxError as model_response", () => {
    expect(classifyError(new TypeError("x is not a function"))).toEqual({ kind: "internal", status: 500 });
    expect(classifyError(new SyntaxError("Unexpected token"))).toEqual({
      kind: "model_response",
      status: 502,
    });
    expect(classifyError(new Error("sk-SECRET-abc"))).toEqual({ kind: "upstream", status: 502 });
  });
});

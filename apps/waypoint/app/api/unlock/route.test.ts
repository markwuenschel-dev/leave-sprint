import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { AUTH_COOKIE_MAX_AGE, verifySession } from "@/lib/auth/token";

import { POST } from "./route";

const TOKEN = "s3cret-app-token";
const URL_ = "http://localhost:3210/api/unlock";

let prevToken: string | undefined;

beforeEach(() => {
  prevToken = process.env.APP_TOKEN;
  process.env.APP_TOKEN = TOKEN;
});

afterEach(() => {
  if (prevToken === undefined) delete process.env.APP_TOKEN;
  else process.env.APP_TOKEN = prevToken;
});

function post(body: string) {
  return new Request(URL_, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
}

/** Every Set-Cookie header on the response, joined. */
function setCookie(res: Response): string {
  return res.headers.getSetCookie?.().join("\n") ?? (res.headers.get("set-cookie") ?? "");
}

describe("POST /api/unlock", () => {
  it("exchanges the correct token for a signed wp_token session cookie, never the raw token (INT-003)", async () => {
    const res = await POST(post(JSON.stringify({ token: TOKEN })));
    expect(res.status).toBe(200);
    await expect(res.clone().json()).resolves.toEqual({ ok: true });

    const cookie = setCookie(res);
    const match = /wp_token=([^;]+)/.exec(cookie);
    expect(match).not.toBeNull();
    const cookieValue = match![1];

    // Not the raw secret -- the whole point of INT-003.
    expect(cookieValue).not.toBe(TOKEN);
    // ...but it IS a session verifySession accepts right now.
    expect(verifySession(cookieValue, TOKEN, Math.floor(Date.now() / 1000))).toBe(true);

    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Path=/");
    expect(cookie).toContain("SameSite=lax");
    expect(cookie).toContain(`Max-Age=${AUTH_COOKIE_MAX_AGE}`);
  });

  it("does not set Secure outside production (so it works over plain-http local dev)", async () => {
    const res = await POST(post(JSON.stringify({ token: TOKEN })));
    // vitest runs with NODE_ENV=test.
    expect(process.env.NODE_ENV).not.toBe("production");
    expect(setCookie(res)).not.toContain("Secure");
  });

  it("rejects a wrong token with 401 and sets no cookie", async () => {
    const res = await POST(post(JSON.stringify({ token: "wrong" })));
    expect(res.status).toBe(401);
    await expect(res.clone().json()).resolves.toEqual({ error: "invalid_token" });
    expect(setCookie(res)).toBe("");
  });

  it("rejects a token that is a prefix of the real one", async () => {
    const res = await POST(post(JSON.stringify({ token: TOKEN.slice(0, 5) })));
    expect(res.status).toBe(401);
    expect(setCookie(res)).toBe("");
  });

  it("rejects a missing / non-string token field", async () => {
    for (const body of ["{}", JSON.stringify({ token: null }), JSON.stringify({ token: 1 }), "null"]) {
      const res = await POST(post(body));
      expect(res.status).toBe(400);
      await expect(res.clone().json()).resolves.toMatchObject({ kind: "client_input" });
      expect(setCookie(res)).toBe("");
    }
  });

  it("returns 400 on unparseable JSON", async () => {
    const res = await POST(post("not json"));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: "invalid_json" });
  });

  it("rejects an oversized body with 413 (WP-C21)", async () => {
    const res = await POST(post(JSON.stringify({ token: "x".repeat(8 * 1024) })));
    expect(res.status).toBe(413);
    await expect(res.json()).resolves.toMatchObject({ error: "payload_too_large" });
    expect(setCookie(res)).toBe("");
  });

  it("fails CLOSED when APP_TOKEN is unset — a well-formed token never unlocks", async () => {
    delete process.env.APP_TOKEN;
    for (const body of [JSON.stringify({ token: "anything" }), JSON.stringify({ token: TOKEN })]) {
      const res = await POST(post(body));
      expect(res.status).toBe(401);
      // Identical error to a wrong token: the response is not an oracle for
      // whether the gate is configured.
      await expect(res.clone().json()).resolves.toEqual({ error: "invalid_token" });
      expect(setCookie(res)).toBe("");
    }
  });

  it("never echoes the submitted or expected token in a failure response", async () => {
    const submitted = "guess-guess-guess";
    const res = await POST(post(JSON.stringify({ token: submitted })));
    const text = await res.text();
    expect(text).not.toContain(submitted);
    expect(text).not.toContain(TOKEN);
  });
});

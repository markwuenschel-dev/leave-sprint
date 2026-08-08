"use client";

import { useState } from "react";

const inputCls =
  "w-full rounded-xl bg-[var(--bg-elev)] border border-[var(--hairline)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--cyan)]";

export default function UnlockPage() {
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || status === "sending") return;
    setStatus("sending");
    setMessage("");
    try {
      const res = await fetch("/api/unlock", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (res.ok) {
        setToken("");
        // Full navigation so the proxy re-runs and sees the new cookie.
        window.location.assign("/");
        return;
      }
      setStatus("error");
      setMessage(
        res.status === 401
          ? "That token was not accepted."
          : `Unlock failed (${res.status}).`,
      );
    } catch {
      setStatus("error");
      setMessage("Could not reach the server.");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-2xl border border-[var(--hairline)] bg-[var(--surface)] p-6">
        <h1 className="text-xl font-semibold mb-2">Waypoint locked</h1>
        <p className="text-sm text-[var(--text-mid)] mb-4">
          Enter your <code>APP_TOKEN</code> to unlock this browser. You can also open with{" "}
          <code className="text-[var(--cyan)]">?token=YOUR_APP_TOKEN</code> once, or unset{" "}
          <code>APP_TOKEN</code> for open local use.
        </p>

        <form onSubmit={submit}>
          <label htmlFor="app-token" className="mb-2 block text-xs text-[var(--text-dim)]">
            ACCESS TOKEN
          </label>
          <input
            id="app-token"
            type="password"
            autoComplete="current-password"
            autoFocus
            value={token}
            onChange={(e) => {
              setToken(e.target.value);
              if (status === "error") {
                setStatus("idle");
                setMessage("");
              }
            }}
            className={inputCls}
          />

          <button
            type="submit"
            disabled={!token || status === "sending"}
            className="btn-primary mt-4 w-full disabled:opacity-50"
          >
            {status === "sending" ? "Unlocking…" : "Unlock"}
          </button>
        </form>

        {message ? (
          <p role="alert" className="mt-3 text-xs text-[var(--orange)]">
            {message}
          </p>
        ) : null}
      </div>
    </div>
  );
}

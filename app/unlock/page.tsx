"use client";

import { useState } from "react";

export default function UnlockPage() {
  const [token, setToken] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/unlock", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (res.ok) {
        window.location.href = "/";
        return;
      }
      setErr("Incorrect token.");
    } catch {
      setErr("Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0c10] text-[#e6e8eb] px-6">
      <form onSubmit={submit} className="card-glass p-8 w-full max-w-sm">
        <div className="text-2xl font-semibold tracking-[-1px]">Leave Sprint Twin</div>
        <div className="text-sm text-[var(--text-mid)] mt-1 mb-6">Enter your access token to continue.</div>
        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Access token"
          autoFocus
          className="w-full rounded-xl bg-[#11141a] border border-white/10 px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--cyan)]"
        />
        {err && <div className="text-sm text-[var(--orange)] mt-2">{err}</div>}
        <button type="submit" disabled={busy || !token} className="btn-primary w-full mt-4 disabled:opacity-50">
          {busy ? "Unlocking…" : "Unlock"}
        </button>
      </form>
    </div>
  );
}

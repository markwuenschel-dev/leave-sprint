"use client";

export default function UnlockPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-2xl border border-[var(--hairline)] bg-[var(--surface)] p-6">
        <h1 className="text-xl font-semibold mb-2">Waypoint locked</h1>
        <p className="text-sm text-[var(--text-mid)] mb-4">
          Optional local gate is on. Open with{" "}
          <code className="text-[var(--cyan)]">?token=YOUR_APP_TOKEN</code> once, or unset{" "}
          <code>APP_TOKEN</code> for open local use.
        </p>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import {
  exportEntries,
  parseImportFiles,
  scoreBand,
  taskLabel,
  type LevelId,
  type RubricEntry,
} from "@waypoint/rubric";
import { useWaypointStore } from "@/lib/store";

function LevelScorePills({
  L1,
  L2,
  L3,
}: {
  L1: number | null | undefined;
  L2: number | null | undefined;
  L3: number | null | undefined;
}) {
  const levels: { id: LevelId; v: number | null | undefined }[] = [
    { id: "L1", v: L1 },
    { id: "L2", v: L2 },
    { id: "L3", v: L3 },
  ];
  return (
    <div className="flex gap-1.5">
      {levels.map(({ id, v }) => {
        const n = v ?? null;
        const band = n != null ? scoreBand(n) : null;
        return (
          <div
            key={id}
            className="min-w-[3.25rem] rounded-xl border border-[var(--hairline)] bg-[var(--bg-elev)] px-2 py-1.5 text-center"
          >
            <div className="text-[9px] font-semibold uppercase tracking-wider text-[var(--text-dim)]">
              {id}
            </div>
            <div
              className={`font-mono text-sm font-bold tabular-nums ${band?.cls ?? "text-[var(--text-dim)]"}`}
            >
              {n ?? "—"}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function RubricHistory({ entries: entriesProp }: { entries?: RubricEntry[] } = {}) {
  const storeEntries = useWaypointStore((s) => s.rubricEntries);
  const entries = entriesProp ?? storeEntries;
  const del = useWaypointStore((s) => s.deleteRubricEntry);
  const importRubricEntries = useWaypointStore((s) => s.importRubricEntries);
  const [importMsg, setImportMsg] = useState("");

  const exportAll = () => {
    const blob = new Blob([exportEntries(entries)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rubric-log-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files.length) return;
    const { entries: incoming, count, ok, failed } = await parseImportFiles(files);
    if (incoming.length) importRubricEntries(incoming, "merge");
    setImportMsg(
      `Imported ${count} assessment${count === 1 ? "" : "s"} from ${ok} file${ok === 1 ? "" : "s"}` +
        (failed ? ` · ${failed} file${failed === 1 ? "" : "s"} failed` : ""),
    );
    e.target.value = "";
    setTimeout(() => setImportMsg(""), 6000);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-[var(--text-dim)]">
          {entries.length} assessments · newest first
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={exportAll}
            disabled={!entries.length}
            className="rounded-lg border border-[var(--hairline)] px-3 py-1.5 text-xs disabled:opacity-40"
          >
            Export
          </button>
          <label
            className="cursor-pointer rounded-lg border border-[var(--cyan)] px-3 py-1.5 text-xs text-[var(--cyan)]"
            title="Upload one or more assessment JSON files"
          >
            Import JSON…
            <input
              type="file"
              accept=".json,application/json"
              multiple
              onChange={importFiles}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {importMsg ? <div className="text-xs text-[var(--text-mid)]">{importMsg}</div> : null}

      <p className="text-[11px] text-[var(--text-dim)]">
        Multi-select JSON OK · de-duped by id. Scores: L1/L2/L3 controlling scores · badge =
        qualifying level · big number = final / primary score.
      </p>

      {entries.length === 0 ? (
        <div className="rounded-2xl border border-[var(--hairline)] bg-[var(--surface)] p-5 text-sm text-[var(--text-dim)]">
          No assessments yet. Use Grade, Q-bank quick log, or Import JSON.
        </div>
      ) : null}

      {entries.map((e) => {
        const score = e.finalScore ?? e.levelScores?.L2 ?? e.levelScores?.L1 ?? null;
        const band = score != null ? scoreBand(score) : null;
        const qual = e.qualifyingDemonstratedLevel || e.demonstratedLevel || "";
        return (
          <div
            key={e.id}
            className="overflow-hidden rounded-2xl border border-[var(--hairline)] bg-[var(--surface)]"
          >
            {/* Score accent bar */}
            <div
              className="h-1"
              style={{
                background:
                  score == null
                    ? "var(--hairline)"
                    : score >= 85
                      ? "var(--green)"
                      : score >= 70
                        ? "var(--cyan)"
                        : score >= 55
                          ? "var(--yellow)"
                          : "var(--orange)",
              }}
            />
            <div className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="font-medium leading-snug">{e.task || "—"}</div>
                  <div className="mt-1 text-xs text-[var(--text-dim)]">
                    {e.date}
                    {e.taskType ? ` · ${taskLabel(e.taskType)}` : ""}
                    {e.primaryRole ? ` · ${e.primaryRole}` : ""}
                    {e.loggingMode ? ` · ${e.loggingMode}` : e.quickLog ? " · fast" : ""}
                  </div>
                  <div className="mt-3">
                    <LevelScorePills
                      L1={e.levelScores?.L1}
                      L2={e.levelScores?.L2}
                      L3={e.levelScores?.L3}
                    />
                  </div>
                </div>

                <div className="flex shrink-0 items-start gap-3">
                  <div className="text-center">
                    <div className="text-[9px] font-semibold uppercase tracking-wider text-[var(--text-dim)]">
                      Score
                    </div>
                    <div
                      className={`font-mono text-3xl font-black tabular-nums leading-none ${
                        band?.cls ?? "text-[var(--text-dim)]"
                      }`}
                    >
                      {score ?? "—"}
                    </div>
                    {band ? (
                      <div className={`mt-1 text-[11px] font-medium ${band.cls}`}>
                        {band.verdict}
                      </div>
                    ) : null}
                  </div>
                  <div className="text-center">
                    <div className="text-[9px] font-semibold uppercase tracking-wider text-[var(--text-dim)]">
                      Qual
                    </div>
                    <div
                      className={`mt-0.5 rounded-xl border px-2.5 py-1.5 font-mono text-lg font-bold ${
                        qual
                          ? "border-[var(--cyan)]/40 bg-[var(--tint-cyan)] text-[var(--cyan)]"
                          : "border-[var(--hairline)] text-[var(--text-dim)]"
                      }`}
                    >
                      {qual || "—"}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="text-xs text-[var(--orange)]"
                    onClick={() => {
                      if (window.confirm("Delete this assessment?")) del(e.id);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>

              {(e.weaknessTags?.length || e.gapTypes?.length || e.nextTarget) && (
                <div className="mt-3 flex flex-wrap gap-1.5 border-t border-[var(--hairline)] pt-3 text-xs">
                  {e.gapTypes?.slice(0, 3).map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-[var(--orange)]/30 px-2 py-0.5 text-[var(--orange)]"
                    >
                      {t}
                    </span>
                  ))}
                  {e.weaknessTags?.slice(0, 4).map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-[var(--hairline)] px-2 py-0.5 text-[var(--text-mid)]"
                    >
                      {t}
                    </span>
                  ))}
                  {e.nextTarget ? (
                    <span className="text-[var(--text-dim)]">→ {e.nextTarget}</span>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

"use client";

import { useState } from "react";
import { parseImportFiles, type RubricEntry } from "@waypoint/rubric";
import { useWaypointStore, todayIso } from "@/lib/store";
import { mergeCatalogLists } from "@/data/catalog";
import { formatTwinSummary } from "@/lib/twinImport";
import type { WaypointState } from "@/lib/domain";
import { card } from "./shared";

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

/** Full Waypoint / twin-shaped backups vs grading-only payloads. */
function looksLikeAppBackup(d: Record<string, unknown>): boolean {
  return (
    "phase" in d ||
    "rhythmDays" in d ||
    "problems" in d ||
    "applications" in d ||
    "fileDefense" in d
  );
}

function looksLikeRubricPayload(data: unknown): boolean {
  if (Array.isArray(data)) return true;
  if (!isRecord(data)) return false;
  if (Array.isArray(data.rubricEntries)) return true;
  return "task" in data || "assessmentId" in data || "finalScore" in data;
}

export function MoreSurface() {
  const exportState = useWaypointStore((s) => s.exportState);
  const importState = useWaypointStore((s) => s.importState);
  const importTwin = useWaypointStore((s) => s.importTwin);
  const importRubricEntries = useWaypointStore((s) => s.importRubricEntries);
  const mergeCatalog = useWaypointStore((s) => s.mergeCatalog);
  const [lastMsg, setLastMsg] = useState("");

  function doExport() {
    const blob = new Blob([JSON.stringify(exportState(), null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `waypoint-backup-${todayIso()}.json`;
    a.click();
  }

  function mergeAppBackup(d: Record<string, unknown>) {
    const base = exportState();
    const problems = (d.problems as WaypointState["problems"]) ?? base.problems;
    const fileDefense = (d.fileDefense as WaypointState["fileDefense"]) ?? base.fileDefense;
    const catalogs = mergeCatalogLists(problems, fileDefense);

    // Merge rubric rather than clobber when multi-file
    if (Array.isArray(d.rubricEntries)) {
      importRubricEntries(d.rubricEntries as RubricEntry[], "merge");
    }

    const after = useWaypointStore.getState().exportState();
    const next: WaypointState = {
      ...base,
      ...(d as Partial<WaypointState>),
      ...catalogs,
      rubricEntries: after.rubricEntries,
    };
    // Re-apply non-rubric slices from this file without dropping merged grades
    if (d.qbankStatus && typeof d.qbankStatus === "object") {
      next.qbankStatus = {
        ...base.qbankStatus,
        ...(d.qbankStatus as WaypointState["qbankStatus"]),
      };
    }
    importState(next);
  }

  /** Multi-file: app backups merge field-wise; rubric arrays merge into the log. */
  async function handleMultiImport(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || !files.length) return;

    const rubricOnly: File[] = [];
    let backupOk = 0;
    let failed = 0;

    for (const file of Array.from(files)) {
      try {
        const text = await file.text();
        const data: unknown = JSON.parse(text);

        if (isRecord(data) && looksLikeAppBackup(data)) {
          mergeAppBackup(data);
          backupOk++;
        } else if (looksLikeRubricPayload(data)) {
          rubricOnly.push(new File([text], file.name, { type: "application/json" }));
        } else if (isRecord(data)) {
          mergeAppBackup(data);
          backupOk++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    let rubricPart = "";
    if (rubricOnly.length) {
      const result = await parseImportFiles(rubricOnly);
      if (result.entries.length) importRubricEntries(result.entries, "merge");
      rubricPart = ` · ${result.count} assessment${result.count === 1 ? "" : "s"} from ${result.ok} rubric file${result.ok === 1 ? "" : "s"}`;
      if (result.failed) rubricPart += ` (${result.failed} failed)`;
    }

    if (!backupOk && !rubricPart) {
      setLastMsg("Import failed — invalid JSON.");
    } else {
      setLastMsg(
        `Imported ${files.length} file${files.length === 1 ? "" : "s"}` +
          (backupOk ? ` · ${backupOk} backup merge${backupOk === 1 ? "" : "s"}` : "") +
          rubricPart +
          (failed ? ` · ${failed} failed` : ""),
      );
    }
    e.target.value = "";
  }

  async function doTwinImportMulti(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || !files.length) return;
    const lines: string[] = [];
    for (const file of Array.from(files)) {
      try {
        const data = JSON.parse(await file.text());
        const summary = importTwin(data);
        lines.push(`${file.name}: ${formatTwinSummary(summary)}`);
      } catch {
        lines.push(`${file.name}: failed (invalid JSON)`);
      }
    }
    setLastMsg(
      `Twin import (${files.length} file${files.length === 1 ? "" : "s"}):\n${lines.join("\n")}`,
    );
    e.target.value = "";
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">More</h2>
      <div className={card}>
        <h3 className="mb-2 font-medium">Backup</h3>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={doExport}
            className="rounded-lg border border-[var(--hairline)] px-3 py-1.5 text-sm"
          >
            Export JSON
          </button>
          <label
            className="cursor-pointer rounded-lg border border-[var(--hairline)] px-3 py-1.5 text-sm"
            title="Import one or more JSON backups / rubric record files"
          >
            Import JSON…
            <input
              type="file"
              accept=".json,application/json"
              multiple
              onChange={handleMultiImport}
              className="hidden"
            />
          </label>
          <button
            type="button"
            onClick={() => {
              mergeCatalog();
              setLastMsg("Catalog merged — new problems/files added; progress kept.");
            }}
            className="rounded-lg border border-[var(--hairline)] px-3 py-1.5 text-sm"
            title="Add any missing catalog rows without wiping status"
          >
            Refresh catalog
          </button>
          <button
            type="button"
            onClick={() => {
              if (
                window.confirm(
                  "Clear the entire assessment log? This removes all graded assessments from History. You can re-import a rubric JSON to restore them.",
                )
              ) {
                importRubricEntries([], "replace");
                setLastMsg("Assessment log cleared — import a rubric JSON to repopulate.");
              }
            }}
            className="rounded-lg border border-[#ef4444] px-3 py-1.5 text-sm text-[#ef4444]"
            title="Remove all graded assessments (rubric entries) from the log"
          >
            Clear log
          </button>
        </div>
        <p className="mt-2 text-xs text-[var(--text-dim)]">
          Multi-select supported. App backups merge fields; arrays /{" "}
          <code className="text-[10px]">rubricEntries</code> merge into the assessment log (de-duped
          by id). For grading dumps only, use{" "}
          <strong className="font-medium text-[var(--text-mid)]">Interview → History → Import JSON</strong>.
        </p>
      </div>

      <div className={card}>
        <h3 className="mb-2 font-medium">Twin import (optional)</h3>
        <p className="mb-3 text-sm text-[var(--text-mid)]">
          Pulls practice progress + rubric history from Leave Sprint Twin export(s). Days/stages
          ignored. Multi-select OK.
        </p>
        <label className="inline-block cursor-pointer rounded-lg border border-[var(--cyan)] px-3 py-1.5 text-sm text-[var(--cyan)]">
          Import twin JSON…
          <input
            type="file"
            accept=".json,application/json"
            multiple
            onChange={doTwinImportMulti}
            className="hidden"
          />
        </label>
      </div>

      {lastMsg ? (
        <div className={`${card} whitespace-pre-wrap font-mono text-xs text-[var(--text-mid)]`}>
          {lastMsg}
        </div>
      ) : null}

      <div className={`${card} text-sm`}>
        <h3 className="mb-2 font-medium">Grading system (v1.11 excerpt)</h3>
        <div className="space-y-2 text-[var(--text-mid)] leading-relaxed">
          <p>
            Assessments use a <strong className="text-[var(--text)]">three-score model</strong>:
            Level I / II / III controlling scores (0–100), plus gates and optional universal
            subscores. From that we derive:
          </p>
          <ul className="list-inside list-disc space-y-1 text-[var(--text-mid)]">
            <li>
              <strong className="text-[var(--text)]">Qualifying level</strong> — highest level the
              attempt actually demonstrates under difficulty + assistance rules.
            </li>
            <li>
              <strong className="text-[var(--text)]">Final score</strong> — overall band (pass-ish
              often ≥70; exceptional higher).
            </li>
            <li>
              <strong className="text-[var(--text)]">Gap tags</strong> — open debt for the Gaps /
              Retest boards (soft-open when you tag).
            </li>
          </ul>
          <p className="text-xs text-[var(--text-dim)]">
            Logging modes: <em>fast</em> (scores + gates + tags) vs <em>full</em> (subscores +
            narrative). Full reference lives in{" "}
            <code className="text-[10px]">Technical_Competency_Scoring_System_v1_11.md</code> at
            repo root.
          </p>
        </div>
      </div>

      <div className={`${card} text-sm`}>
        <h3 className="mb-2 font-medium">About</h3>
        <p className="text-[var(--text-mid)]">
          Waypoint is a local-first career transition hub (readiness evidence →
          applications). Leave Sprint Twin remains frozen scaffolding at the repo root. Deploy on
          a single EC2 with PGlite under{" "}
          <code className="text-xs">WAYPOINT_PGLITE_DIR</code>.
        </p>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useWaypointStore, todayIso } from "@/lib/store";
import { mergeCatalogLists } from "@/data/catalog";
import { formatTwinSummary } from "@/lib/twinImport";
import { card } from "./shared";

export function MoreSurface() {
  const exportState = useWaypointStore((s) => s.exportState);
  const importState = useWaypointStore((s) => s.importState);
  const importTwin = useWaypointStore((s) => s.importTwin);
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

  function pickJson(onData: (data: unknown) => void) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        onData(JSON.parse(text));
      } catch {
        setLastMsg("Import failed — invalid JSON.");
      }
    };
    input.click();
  }

  function doImport() {
    pickJson((data) => {
      if (!data || typeof data !== "object") {
        setLastMsg("Import failed.");
        return;
      }
      const base = exportState();
      const d = data as Record<string, unknown>;
      const merged = {
        ...base,
        ...d,
        problems: (d.problems as typeof base.problems) ?? base.problems,
        fileDefense: (d.fileDefense as typeof base.fileDefense) ?? base.fileDefense,
      } as ReturnType<typeof exportState>;
      const catalogs = mergeCatalogLists(merged.problems, merged.fileDefense);
      importState({ ...merged, ...catalogs });
      setLastMsg("Waypoint backup imported.");
    });
  }

  function doTwinImport() {
    pickJson((data) => {
      const summary = importTwin(data);
      setLastMsg(formatTwinSummary(summary));
    });
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
          <button
            type="button"
            onClick={doImport}
            className="rounded-lg border border-[var(--hairline)] px-3 py-1.5 text-sm"
          >
            Import JSON
          </button>
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
        </div>
        <p className="mt-2 text-xs text-[var(--text-dim)]">
          Full Waypoint backup replaces overlapping fields. Refresh catalog only expands
          practice/defense rows.
        </p>
      </div>

      <div className={card}>
        <h3 className="mb-2 font-medium">Twin import (optional, one-shot)</h3>
        <p className="mb-3 text-sm text-[var(--text-mid)]">
          Pulls only practice progress + rubric history from a Leave Sprint Twin export or{" "}
          <code className="text-xs">data/app-state.json</code>. Days, stages, and journals are
          ignored.
        </p>
        <button
          type="button"
          onClick={doTwinImport}
          className="rounded-lg border border-[var(--cyan)] px-3 py-1.5 text-sm text-[var(--cyan)]"
        >
          Import twin JSON…
        </button>
      </div>

      {lastMsg ? (
        <div className={`${card} whitespace-pre-wrap font-mono text-xs text-[var(--text-mid)]`}>
          {lastMsg}
        </div>
      ) : null}

      <div className={`${card} text-sm`}>
        <h3 className="mb-2 font-medium">About</h3>
        <p className="text-[var(--text-mid)]">
          Waypoint is a local-first career transition hub (phase B readiness → phase A
          applications). Leave Sprint Twin remains frozen scaffolding at the repo root. Deploy on
          a single EC2 with PGlite under{" "}
          <code className="text-xs">WAYPOINT_PGLITE_DIR</code>.
        </p>
      </div>
    </div>
  );
}


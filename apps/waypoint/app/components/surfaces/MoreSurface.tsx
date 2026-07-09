"use client";

import { useWaypointStore, todayIso } from "@/lib/store";
import { mergeCatalogLists } from "@/data/catalog";
import { card } from "./shared";

export function MoreSurface() {
  const exportState = useWaypointStore((s) => s.exportState);
  const importState = useWaypointStore((s) => s.importState);
  const mergeCatalog = useWaypointStore((s) => s.mergeCatalog);

  function doExport() {
    const blob = new Blob([JSON.stringify(exportState(), null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `waypoint-backup-${todayIso()}.json`;
    a.click();
  }

  function doImport() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        // Accept full WaypointState or partial with problems/defense
        if (data && typeof data === "object") {
          const base = exportState();
          const merged = {
            ...base,
            ...data,
            problems: data.problems ?? base.problems,
            fileDefense: data.fileDefense ?? base.fileDefense,
          };
          const catalogs = mergeCatalogLists(merged.problems, merged.fileDefense);
          importState({ ...merged, ...catalogs });
          alert("Imported.");
        }
      } catch {
        alert("Import failed.");
      }
    };
    input.click();
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
              alert("Catalog merged — new problems/files added; progress kept.");
            }}
            className="rounded-lg border border-[var(--hairline)] px-3 py-1.5 text-sm"
            title="Add any missing catalog rows without wiping status"
          >
            Refresh catalog
          </button>
        </div>
        <p className="mt-2 text-xs text-[var(--text-dim)]">
          Refresh catalog pulls new seed problems/defense into your store without resetting
          status or practiced dates.
        </p>
      </div>
      <div className={`${card} text-sm`}>
        <h3 className="mb-2 font-medium">About</h3>
        <p className="text-[var(--text-mid)]">
          Waypoint is a local-first career transition hub (phase B readiness → phase A
          applications). Leave Sprint Twin remains frozen scaffolding at the repo root.
          Deploy on a single EC2 with PGlite under <code className="text-xs">WAYPOINT_PGLITE_DIR</code>.
        </p>
      </div>
    </div>
  );
}

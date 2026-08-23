/**
 * INT-018 — pin validateHandoff grounding and catalog-authoritative defense drop.
 * Hallucinated paths must be listed in filesDropped; stale defense ids must not survive merge.
 */

import { describe, expect, it } from "vitest";
import type { FileDefenseItem } from "@waypoint/practice-types";
import { CATALOG_DEFENSE, mergeCatalogLists } from "../../data/catalog";
import { validateHandoff } from "./validate";

function defense(id: string, over: Partial<FileDefenseItem> = {}): FileDefenseItem {
  return {
    id,
    title: id,
    why: "",
    terminology: "",
    interviewLine: "",
    practicedDates: [],
    ...over,
  };
}

describe("validateHandoff", () => {
  it("drops a hallucinated path from knownPaths and keeps a real one", () => {
    const known = "src/app/pipeline.ts";
    const ghost = "src/app/hallucinated-orchestrator.ts";
    const { clean, report } = validateHandoff(
      {
        project: { key: "demo", label: "Demo" },
        files: [
          { path: known, title: "Pipeline" },
          { path: ghost, title: "Ghost Orchestrator" },
        ],
      },
      { knownPaths: [known] },
    );

    expect(clean.files.map((f) => f.path)).toEqual([known]);
    expect(report.filesKept).toBe(1);
    expect(report.ungrounded).toBe(false);
    expect(report.filesDropped).toEqual([
      { ref: ghost, reason: "path not in repo inventory" },
    ]);
  });
});

describe("mergeCatalogLists", () => {
  it("drops persisted defense ids absent from CATALOG_DEFENSE and keeps practicedDates on a match", () => {
    const catalogId = CATALOG_DEFENSE[0]!.id;
    const practicedDates = ["2026-07-04", "2026-08-01"];
    const staleId = "f-orphan-pre-refactor";

    const { fileDefense } = mergeCatalogLists(
      [],
      [
        defense(catalogId, { practicedDates, notes: "kept" }),
        defense(staleId, { practicedDates: ["2026-01-01"] }),
      ],
    );

    expect(fileDefense.map((f) => f.id)).toEqual(CATALOG_DEFENSE.map((f) => f.id));
    expect(fileDefense.some((f) => f.id === staleId)).toBe(false);
    expect(fileDefense.find((f) => f.id === catalogId)?.practicedDates).toEqual(practicedDates);
  });
});

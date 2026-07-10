"use client";

import { useMemo } from "react";
import type { RubricEntry } from "@waypoint/rubric";
import { useWaypointStore } from "@/lib/store";
import {
  buildGapBoard,
  GAP_STATUS_CHIPS,
  type GapClosureStatusValue,
} from "@/lib/gaps";
import type { RoleFilter } from "@/lib/domain";
import { card } from "../surfaces/shared";

const STATUS_COLOR: Record<string, string> = {
  open: "var(--orange)",
  "in progress": "var(--yellow)",
  reopened: "var(--magenta)",
  closed: "var(--green)",
};

export function GapsBoard({
  entries,
  roleFilter,
}: {
  entries: RubricEntry[];
  roleFilter: RoleFilter;
}) {
  const patch = useWaypointStore((s) => s.patchRubricEntry);
  const board = useMemo(
    () => buildGapBoard(entries, roleFilter),
    [entries, roleFilter],
  );

  const empty =
    !entries.length ||
    board.columns.every((c) => c.items.length === 0);

  if (empty) {
    return (
      <div className={`${card} space-y-2 text-sm text-[var(--text-dim)]`}>
        <p className="font-medium text-[var(--text-mid)]">No open gaps tracked yet.</p>
        <p>
          How gaps get here: grade an attempt and add gap types / knowledge-gap tags (soft-opens
          the gap). Weak scores (&lt;70) nudge for at least one gap type. Status chips move items
          across columns.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {board.columns.map((col) => (
          <div key={col.status} className={card}>
            <div className="mb-2 flex items-center justify-between">
              <div
                className="text-sm font-medium capitalize"
                style={{ color: STATUS_COLOR[col.status] ?? "var(--text)" }}
              >
                {col.status}
              </div>
              <div className="font-mono text-xs text-[var(--text-dim)]">
                {col.items.length}
              </div>
            </div>
            <div className="space-y-2">
              {col.items.map((it) => (
                <div
                  key={it.id}
                  className="rounded-xl border border-[var(--hairline)] bg-[var(--bg-elev)] p-2.5"
                >
                  <div className="truncate text-xs font-medium">{it.task}</div>
                  {(it.recurring || it.worsening) && (
                    <div className="mt-0.5 text-[10px]">
                      {it.recurring && (
                        <span className="text-[var(--yellow)]">recurring </span>
                      )}
                      {it.worsening && (
                        <span className="text-[var(--orange)]">worsening</span>
                      )}
                    </div>
                  )}
                  {it.tags.length > 0 && (
                    <div className="mt-0.5 truncate text-[10px] text-[var(--text-dim)]">
                      {it.tags.join(" · ")}
                    </div>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {GAP_STATUS_CHIPS.map((st) => (
                      <button
                        key={st}
                        type="button"
                        title={`Set ${st}`}
                        onClick={() =>
                          patch(it.id, {
                            gapClosureStatus: {
                              status: st as GapClosureStatusValue,
                              ...(st === "closed"
                                ? { closedDate: new Date().toISOString().slice(0, 10) }
                                : {}),
                              ...(st === "open" || st === "reopened"
                                ? {
                                    openedDate: new Date().toISOString().slice(0, 10),
                                    retestRequired: true,
                                  }
                                : {}),
                            },
                          })
                        }
                        className={`rounded border px-1.5 py-0.5 text-[9px] capitalize ${
                          col.status === st
                            ? "border-[var(--cyan)] text-[var(--cyan)]"
                            : "border-[var(--hairline)] text-[var(--text-dim)] hover:border-[var(--hairline-strong)]"
                        }`}
                      >
                        {st === "in progress" ? "wip" : st}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {col.items.length === 0 && (
                <div className="text-[10px] text-[var(--text-dim)]">—</div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className={card}>
          <div className="mb-2 text-xs font-medium uppercase tracking-wider text-[var(--text-dim)]">
            Knowledge-gap clusters
          </div>
          <div className="flex flex-wrap gap-2">
            {board.clusterCounts.map((c) => (
              <div
                key={c.cluster}
                className="flex items-center gap-2 rounded-2xl border border-[var(--hairline)] bg-[var(--fill-subtle)] px-3 py-1.5 text-sm"
              >
                {c.cluster}
                <span className="font-mono text-xs text-[var(--magenta)]">{c.count}</span>
              </div>
            ))}
            {!board.clusterCounts.length && (
              <div className="text-sm text-[var(--text-dim)]">No knowledge-gap tags yet.</div>
            )}
          </div>
        </div>
        <div className={card}>
          <div className="mb-2 text-xs font-medium uppercase tracking-wider text-[var(--text-dim)]">
            Gap types
          </div>
          <div className="flex flex-wrap gap-1.5">
            {board.gapTypeCounts.map((g) => (
              <span
                key={g.type}
                className="rounded border border-[var(--hairline)] px-2 py-0.5 text-xs text-[var(--text-mid)]"
              >
                {g.type}{" "}
                <span className="font-mono text-[var(--violet)]">{g.count}</span>
              </span>
            ))}
            {!board.gapTypeCounts.length && (
              <div className="text-sm text-[var(--text-dim)]">No gap types yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

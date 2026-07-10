"use client";

import { useMemo } from "react";
import type { RubricEntry } from "@waypoint/rubric";
import { activeRetestQueue } from "@/lib/gaps";
import type { RoleFilter } from "@/lib/domain";
import { card } from "../surfaces/shared";

const BUCKETS = [
  { key: "due-now" as const, label: "Due now", color: "var(--orange)" },
  { key: "due-soon" as const, label: "Due soon", color: "var(--yellow)" },
  { key: "blocked" as const, label: "Blocked", color: "var(--text-dim)" },
];

export function RetestQueue({
  entries,
  roleFilter,
}: {
  entries: RubricEntry[];
  roleFilter: RoleFilter;
}) {
  const items = useMemo(
    () => activeRetestQueue(entries, roleFilter),
    [entries, roleFilter],
  );

  if (!items.length) {
    return (
      <div className={`${card} space-y-2 text-sm text-[var(--text-dim)]`}>
        <p className="font-medium text-[var(--text-mid)]">Nothing queued for retest.</p>
        <p>
          Items appear when a grade has a retest date, retestRequired, high staleness, or open
          gap closure. Closed gaps are hidden.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {BUCKETS.map((b) => (
          <div key={b.key} className={`${card} py-3 text-center`}>
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-dim)]">
              {b.label}
            </div>
            <div className="mt-1 text-2xl font-semibold" style={{ color: b.color }}>
              {items.filter((i) => i.bucket === b.key).length}
            </div>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        {items.map((i) => {
          const b = BUCKETS.find((x) => x.key === i.bucket)!;
          return (
            <div
              key={i.id}
              className="flex items-start gap-3 rounded-2xl border border-[var(--hairline)] bg-[var(--surface)] p-4"
            >
              <span
                className="mt-0.5 shrink-0 rounded-full border px-2 py-0.5 text-[10px]"
                style={{ borderColor: b.color, color: b.color }}
              >
                {b.label}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{i.task}</div>
                <div className="mt-0.5 text-xs text-[var(--text-mid)]">{i.action}</div>
                <div className="mt-1 font-mono text-[10px] text-[var(--text-dim)]">
                  {i.severity ? `${i.severity} severity` : ""}
                  {i.retestDate ? ` · retest ${i.retestDate}` : ""}
                  {i.stalenessRisk ? ` · staleness ${i.stalenessRisk}` : ""}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

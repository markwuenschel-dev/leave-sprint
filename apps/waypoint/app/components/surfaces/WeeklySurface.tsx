"use client";

import { useWaypointStore, weekStartIso } from "@/lib/store";
import { card } from "./shared";

export function WeeklySurface() {
  const week = weekStartIso();
  const review = useWaypointStore((s) => s.weeklyReviews[week]);
  const setWeekly = useWaypointStore((s) => s.setWeeklyField);
  const apps = useWaypointStore((s) => s.applications);

  const pipeline = {
    active: apps.filter((a) =>
      ["wishlist", "applied", "interviewing"].includes(a.status),
    ).length,
    interviewing: apps.filter((a) => a.status === "interviewing").length,
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold">Weekly</h2>
        <p className="mt-1 text-sm text-[var(--text-dim)]">Week of {week}</p>
      </div>
      <div className={`${card} text-sm text-[var(--text-mid)]`}>
        Pipeline glance: <strong>{pipeline.active}</strong> open ·{" "}
        <strong>{pipeline.interviewing}</strong> interviewing
      </div>
      <div className={card}>
        <label className="text-xs text-[var(--text-dim)]">Pipeline + interviews</label>
        <textarea
          className="mt-2 min-h-[80px] w-full rounded-xl border border-[var(--hairline)] bg-transparent p-3 text-sm"
          value={review?.pipelineNotes || ""}
          onChange={(e) => setWeekly(week, { pipelineNotes: e.target.value })}
          placeholder="Who moved? What interviews are next?"
        />
      </div>
      <div className={card}>
        <label className="text-xs text-[var(--text-dim)]">What moved readiness?</label>
        <textarea
          className="mt-2 min-h-[80px] w-full rounded-xl border border-[var(--hairline)] bg-transparent p-3 text-sm"
          value={review?.whatMoved || ""}
          onChange={(e) => setWeekly(week, { whatMoved: e.target.value })}
          placeholder="Practice / defense / mocks that actually moved the floor"
        />
      </div>
      <div className={card}>
        <label className="text-xs text-[var(--text-dim)]">Focus next week</label>
        <textarea
          className="mt-2 min-h-[80px] w-full rounded-xl border border-[var(--hairline)] bg-transparent p-3 text-sm"
          value={review?.focusNext || ""}
          onChange={(e) => setWeekly(week, { focusNext: e.target.value })}
          placeholder="One primary bet for each of SWE and MLE"
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={!!review?.done}
          onChange={(e) => setWeekly(week, { done: e.target.checked })}
        />
        Weekly review done
      </label>
    </div>
  );
}

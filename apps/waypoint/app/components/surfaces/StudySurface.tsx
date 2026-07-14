"use client";

/**
 * Study Guide surface (own main tab — design pack 2026-07-14).
 *
 * Three blocks per role scope:
 *  1. "What you keep getting wrong" — 100% deterministic from the digest,
 *     renders even with no provider configured.
 *  2. "Learn next" — LLM-written, cached per role with a grade-count watermark;
 *     every rep chip deep-links to the actual card/story/queue.
 *  3. "This week" — small checkable plan persisted on the cached guide.
 */

import { useEffect, useMemo, useState } from "react";
import { BookOpenCheck, RefreshCw } from "lucide-react";
import { QBANK, type TrackKey } from "@waypoint/qbank";
import { useWaypointStore } from "@/lib/store";
import {
  buildStudyDigest,
  type StudyGuideLearnItem,
  type StudyGuideWeekItem,
  type StudyRep,
} from "@/lib/study";
import { resolveDeck } from "@/lib/qbankDeck";
import { requestNav } from "@/lib/nav";
import { ROLE_FILTER_OPTIONS, type RoleFilter } from "@/lib/domain";
import { SurfaceHero, card } from "./shared";

const TREND_LABEL = {
  worsening: { text: "▲ worsening", cls: "text-[var(--orange)]" },
  flat: { text: "— flat", cls: "text-[var(--text-dim)]" },
  improving: { text: "▼ improving", cls: "text-[var(--green)]" },
} as const;

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const days = Math.floor(ms / 86_400_000);
  if (days > 0) return `${days}d ago`;
  const hours = Math.floor(ms / 3_600_000);
  if (hours > 0) return `${hours}h ago`;
  return "just now";
}

export function StudySurface() {
  const entries = useWaypointStore((s) => s.rubricEntries);
  const qbankStatus = useWaypointStore((s) => s.qbankStatus);
  const qbankOrder = useWaypointStore((s) => s.qbankOrder);
  const fileDefense = useWaypointStore((s) => s.fileDefense);
  const globalRole = useWaypointStore((s) => s.roleFilter);
  const guides = useWaypointStore((s) => s.studyGuides);
  const setGuide = useWaypointStore((s) => s.setStudyGuide);
  const toggleWeek = useWaypointStore((s) => s.toggleStudyWeekItem);
  const setPos = useWaypointStore((s) => s.setQBankPos);

  const [role, setRole] = useState<RoleFilter>(globalRole);
  const [providers, setProviders] = useState<string[] | null>(null);
  const [provider, setProvider] = useState<string>("");
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/study")
      .then((r) => r.json())
      .then((j: { providers?: string[] }) => {
        setProviders(j.providers ?? []);
        if (j.providers?.length) setProvider((p) => p || j.providers![0]);
      })
      .catch(() => setProviders([]));
  }, []);

  const digest = useMemo(
    () => buildStudyDigest(entries, role, qbankStatus, fileDefense),
    [entries, role, qbankStatus, fileDefense],
  );
  const guide = guides[role];
  const newGrades = guide ? Math.max(0, digest.gradeCount - guide.gradeCount) : 0;
  const noProviders = providers !== null && providers.length === 0;

  function openRep(rep: StudyRep) {
    if (rep.kind === "qbank") {
      // id shape is `${track}-${n}`; jump the deck to that card.
      const track = rep.id.slice(0, rep.id.lastIndexOf("-")) as TrackKey;
      if (QBANK[track]) {
        const deck = resolveDeck(QBANK[track].questions, qbankOrder[track]);
        const idx = deck.findIndex((q) => q.id === rep.id);
        if (idx >= 0) setPos(track, idx);
        requestNav("interview", "qbank");
      }
    } else if (rep.kind === "retest") {
      requestNav("interview", "retest");
    } else {
      requestNav("defense");
    }
  }

  async function rebuild() {
    if (!provider || building) return;
    setBuilding(true);
    setError(null);
    try {
      const res = await fetch("/api/study", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider, digest }),
      });
      const j = (await res.json()) as {
        learn?: StudyGuideLearnItem[];
        week?: StudyGuideWeekItem[];
        model?: string;
        error?: string;
        message?: string;
      };
      if (!res.ok || j.error) {
        setError(j.message || j.error || "Guide build failed.");
        return;
      }
      setGuide(role, {
        builtAt: new Date().toISOString(),
        gradeCount: digest.gradeCount,
        role,
        model: j.model,
        learn: j.learn ?? [],
        week: j.week ?? [],
      });
    } catch {
      setError("Guide build failed — network error.");
    } finally {
      setBuilding(false);
    }
  }

  return (
    <div className="space-y-5">
      <SurfaceHero
        eyebrow="Adaptive · evidence-bound"
        title="Study"
        accent="green"
        subtitle={
          <>
            Built from what your grades keep saying: recurring misses, what to learn to
            collapse them, and the exact reps that prove it. {digest.gradeCount} grades in
            scope.
          </>
        }
        right={
          <div className="rounded-2xl border border-[var(--hairline)] bg-[var(--bg-elev)] px-4 py-3 text-right text-xs">
            <div className="font-mono text-lg font-semibold text-[var(--green)]">
              {digest.misses.length}
            </div>
            <div className="text-[var(--text-dim)]">recurring misses</div>
          </div>
        }
      />

      {/* Role scope + build controls */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[var(--hairline)] bg-[var(--bg-elev)] px-3 py-2">
        <div className="flex flex-wrap gap-1">
          {ROLE_FILTER_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => setRole(o.value)}
              className={`rounded-lg border px-2.5 py-1 text-xs transition ${
                role === o.value
                  ? "border-[var(--green)]/60 bg-[var(--tint-green)] text-[var(--green)]"
                  : "border-[var(--hairline)] text-[var(--text-dim)] hover:text-[var(--text-mid)]"
              }`}
            >
              {o.value === "ALL" ? "All" : o.value}
            </button>
          ))}
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2 text-[11px] text-[var(--text-dim)]">
          {guide ? (
            <span>
              built {timeAgo(guide.builtAt)} · from {guide.gradeCount} grades
              {guide.model ? ` · ${guide.model}` : ""}
            </span>
          ) : (
            <span>no guide yet for this scope</span>
          )}
          {newGrades > 0 ? (
            <span className="text-[var(--yellow)]">
              stale · {newGrades} new grade{newGrades === 1 ? "" : "s"}
            </span>
          ) : null}
          {providers?.length ? (
            <>
              {providers.length > 1 ? (
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="rounded-lg border border-[var(--hairline)] bg-[var(--surface)] px-1.5 py-1 text-[11px] text-[var(--text)]"
                  aria-label="Guide provider"
                >
                  {providers.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              ) : null}
              <button
                type="button"
                onClick={rebuild}
                disabled={building || digest.gradeCount === 0}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--green)] bg-[var(--green)] px-3 py-1.5 text-xs font-semibold text-[var(--bg)] disabled:opacity-40"
              >
                <RefreshCw
                  size={13}
                  className={building ? "animate-spin" : ""}
                  aria-hidden
                />
                {building ? "Building…" : guide ? "Rebuild" : "Build guide"}
              </button>
            </>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className={`${card} border-[var(--orange)]/40 text-sm text-[var(--orange)]`}>
          {error}
        </div>
      ) : null}

      {digest.gradeCount === 0 ? (
        <div className={`${card} text-sm text-[var(--text-dim)]`}>
          No grades in this scope yet. Grade some attempts (Interview → Grade, AI Questions,
          or quick logs) and the guide will have something to work with.
        </div>
      ) : (
        <>
          {/* Block 1 — deterministic, always on */}
          <div className={card}>
            <div className="mb-2 flex items-center justify-between">
              <div className="text-xs font-medium uppercase tracking-wider text-[var(--yellow)]">
                What you keep getting wrong
              </div>
              <div className="font-mono text-[10px] text-[var(--text-dim)]">
                deterministic · live
              </div>
            </div>
            {digest.misses.length ? (
              <div>
                {digest.misses.map((m) => (
                  <div
                    key={m.concept}
                    className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-t border-[var(--hairline)] py-2 first:border-t-0 first:pt-0 last:pb-0"
                  >
                    <span className="text-sm font-medium text-[var(--text)]">{m.concept}</span>
                    <span className="font-mono text-xs text-[var(--yellow)]">
                      {m.misses} misses
                    </span>
                    <span className={`text-xs ${TREND_LABEL[m.trend].cls}`}>
                      {TREND_LABEL[m.trend].text}
                    </span>
                    {m.sources.length ? (
                      <span className="w-full text-[11px] text-[var(--text-dim)]">
                        from: {m.sources.join(", ")}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--text-dim)]">
                Nothing recurs twice yet — either you're closing gaps, or grades are missing
                gap types / knowledge-gap tags. Weakest domains:{" "}
                {digest.weakDomains.map((d) => `${d.domain} (${d.avg})`).join(", ") || "n/a"}.
              </p>
            )}
          </div>

          {/* Block 2 — LLM guide */}
          <div className={card}>
            <div className="mb-2 flex items-center justify-between">
              <div className="text-xs font-medium uppercase tracking-wider text-[var(--cyan)]">
                Learn next — highest leverage
              </div>
              <BookOpenCheck size={14} className="text-[var(--text-dim)]" aria-hidden />
            </div>
            {noProviders ? (
              <p className="text-sm text-[var(--text-dim)]">
                No AI provider configured — the miss list above still works. Add a key to{" "}
                <code className="font-mono text-[var(--text)]">.env.local</code> to get the
                written guide.
              </p>
            ) : guide?.learn.length ? (
              <div className="space-y-3">
                {guide.learn.map((l) => (
                  <div
                    key={l.title}
                    className="rounded-xl border border-[var(--hairline)] bg-[var(--bg-elev)] p-3.5"
                  >
                    <div className="text-sm font-semibold text-[var(--text)]">{l.title}</div>
                    <p className="mt-1 text-xs leading-relaxed text-[var(--text-mid)]">
                      {l.why}
                    </p>
                    {l.reps.length ? (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {l.reps.map((r) => (
                          <button
                            key={`${r.kind}:${r.id}`}
                            type="button"
                            onClick={() => openRep(r)}
                            className={`rounded-lg border px-2.5 py-1 text-[11px] transition ${
                              r.kind === "defense"
                                ? "border-[var(--magenta)]/45 text-[var(--magenta)] hover:bg-[var(--tint-magenta)]"
                                : "border-[var(--cyan)]/45 text-[var(--cyan)] hover:bg-[var(--tint-cyan)]"
                            }`}
                            title={`Open ${r.kind}: ${r.id}`}
                          >
                            {r.kind === "qbank"
                              ? `Q Bank · ${r.id}`
                              : r.kind === "retest"
                                ? `Retest · ${r.label}`
                                : `Defense · ${r.label}`}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--text-dim)]">
                {building
                  ? "Building your guide…"
                  : "Hit Build guide and the coach writes this block from the misses above — every recommendation linked to real reps."}
              </p>
            )}
          </div>

          {/* Block 3 — week plan */}
          {guide?.week.length ? (
            <div className={card}>
              <div className="mb-2 flex items-center justify-between">
                <div className="text-xs font-medium uppercase tracking-wider text-[var(--green)]">
                  This week
                </div>
                <div className="font-mono text-[10px] text-[var(--text-dim)]">
                  {guide.week.filter((w) => w.done).length}/{guide.week.length} done
                </div>
              </div>
              <div>
                {guide.week.map((w) => (
                  <label
                    key={w.id}
                    className="flex cursor-pointer items-baseline gap-2.5 py-1.5 text-sm text-[var(--text-mid)]"
                  >
                    <input
                      type="checkbox"
                      checked={!!w.done}
                      onChange={() => toggleWeek(role, w.id)}
                      className="translate-y-0.5 accent-[var(--green)]"
                    />
                    <span className={w.done ? "text-[var(--text-dim)] line-through" : ""}>
                      {w.text}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { QBANK, type QBankQuestion, type TrackKey } from "@waypoint/qbank";
import { useWaypointStore } from "@/lib/store";
import {
  INTERVIEW_TAB_KEY,
  WP_NAV_EVENT,
  isInterviewTabId,
  resolveInterviewTab,
  type InterviewTabId,
  type WpNavDetail,
} from "@/lib/nav";
import { Flashcard, type FlashcardLayer } from "../ui/Flashcard";
import { Markdown } from "../ui/Markdown";
import { ProgressRing } from "../ui/ProgressRing";
import { GradeForm } from "../rubric/GradeForm";
import { RubricHistory } from "../rubric/History";
import { QuickLogModal } from "../rubric/QuickLogModal";
import { GapsBoard } from "../rubric/GapsBoard";
import { RetestQueue } from "../rubric/RetestQueue";
import { PerformancePanel } from "../rubric/PerformancePanel";
import { SurfaceHero, card } from "./shared";

const TRACK_ORDER: TrackKey[] = ["swe", "mle", "ds", "de", "react", "sql", "sdlc", "diag"];

const INTERVIEW_TABS: { id: InterviewTabId; label: string; short?: string }[] = [
  { id: "qbank", label: "Q Bank" },
  { id: "grade", label: "Grade" },
  { id: "history", label: "History" },
  { id: "gaps", label: "Gaps" },
  { id: "retest", label: "Retest" },
  { id: "performance", label: "Performance", short: "Perf" },
];

function buildLayers(q: QBankQuestion, useMd: boolean): FlashcardLayer[] {
  const layers: FlashcardLayer[] = [];
  const md = (text: string) => (useMd ? <Markdown>{text}</Markdown> : text);
  const pair = (question: string, answer?: string) => (
    <>
      <div className="mb-1 font-medium text-[var(--text)]">{md(question)}</div>
      {answer ? md(answer) : null}
    </>
  );
  const answer = q.compressed || q.anchor;
  if (answer) layers.push({ label: "Answer", content: md(answer) });
  if (q.detail) layers.push({ label: "Full detail", content: md(q.detail), tone: "muted" });
  if (q.followup)
    layers.push({ label: "Follow-up", content: pair(q.followup, q.followupAnswer) });
  if (q.tie) layers.push({ label: "Project tie-in", content: md(q.tie), tone: "accent" });
  if (q.trap) layers.push({ label: "Trap to avoid", content: md(q.trap), tone: "warn" });
  if (q.l2q) layers.push({ label: "Level II stretch", content: pair(q.l2q, q.l2a) });
  if (q.l3q) layers.push({ label: "Level III stretch", content: pair(q.l3q, q.l3a) });
  return layers;
}

export function InterviewSurface({
  initialTab,
}: {
  /** When parent navigates (e.g. Today → Gaps), remount with this subtab. */
  initialTab?: InterviewTabId;
} = {}) {
  const [tab, setTab] = useState<InterviewTabId>(() =>
    isInterviewTabId(initialTab) ? initialTab : resolveInterviewTab("qbank"),
  );
  const pos = useWaypointStore((s) => s.qbankPos);
  const setPos = useWaypointStore((s) => s.setQBankPos);
  const status = useWaypointStore((s) => s.qbankStatus);
  const setStatus = useWaypointStore((s) => s.setQBankStatus);
  const entries = useWaypointStore((s) => s.rubricEntries);
  const roleFilter = useWaypointStore((s) => s.roleFilter);
  const trackKey = (TRACK_ORDER.includes(pos.track) ? pos.track : "swe") as TrackKey;
  const track = QBANK[trackKey];
  const idx = Math.min(pos.idx, Math.max(0, track.questions.length - 1));
  const q = track.questions[idx];
  const [revealed, setRevealed] = useState<boolean[]>([]);
  const [logPrompt, setLogPrompt] = useState<string | null>(null);

  const useMd = trackKey === "diag";
  const layers = useMemo(() => (q ? buildLayers(q, useMd) : []), [q, useMd]);

  // Parent forced a subtab (navigation) — apply even if we were already mounted via key change
  useEffect(() => {
    if (isInterviewTabId(initialTab)) setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    try {
      localStorage.setItem(INTERVIEW_TAB_KEY, tab);
    } catch {
      /* ignore */
    }
  }, [tab]);

  useEffect(() => {
    const onNav = (ev: Event) => {
      const detail = (ev as CustomEvent<WpNavDetail>).detail;
      if (detail?.interviewTab && isInterviewTabId(detail.interviewTab)) {
        setTab(detail.interviewTab);
      }
    };
    window.addEventListener(WP_NAV_EVENT, onNav);
    return () => window.removeEventListener(WP_NAV_EVENT, onNav);
  }, []);

  useEffect(() => {
    setRevealed(Array.from({ length: layers.length }, () => false));
  }, [q?.id, layers.length]);

  const totalQ = TRACK_ORDER.reduce((s, t) => s + QBANK[t].questions.length, 0);
  const masteredAll = Object.values(status).filter((v) => v === "mastered").length;
  const trackMastered = track.questions.filter((qq) => status[qq.id] === "mastered").length;
  const trackPct = track.questions.length
    ? Math.round((trackMastered / track.questions.length) * 100)
    : 0;

  const questionNode =
    q && useMd ? (
      <>
        <Markdown>{q.q}</Markdown>
        {q.code ? (
          <div className="mt-3 text-base font-normal">
            <Markdown>{"```" + (q.lang ?? "") + "\n" + q.code + "\n```"}</Markdown>
          </div>
        ) : null}
      </>
    ) : (
      q?.q
    );

  function markMastered() {
    if (!q) return;
    setStatus(q.id, "mastered");
    setLogPrompt(q.q);
  }

  return (
    <div className="space-y-5">
      <SurfaceHero
        eyebrow="Verbal · mocks · evidence"
        title="Interview"
        accent="cyan"
        subtitle={
          <>
            Q bank for recall, full grade for the floor, gaps/retest for debt, performance for
            role × level. {masteredAll}/{totalQ} mastered · {entries.length} graded.
          </>
        }
        right={
          tab === "qbank" ? (
            <div className="flex items-center gap-3 rounded-2xl border border-[var(--hairline)] bg-[var(--bg-elev)] px-4 py-3">
              <ProgressRing value={trackPct} size={64} color="var(--cyan)">
                <span className="text-xs font-bold">{trackPct}%</span>
              </ProgressRing>
              <div className="text-xs leading-snug">
                <div className="font-medium text-[var(--text)]">{track.short} track</div>
                <div className="text-[var(--text-dim)]">
                  {trackMastered}/{track.questions.length} mastered
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-[var(--hairline)] bg-[var(--bg-elev)] px-4 py-3 text-right text-xs">
              <div className="font-mono text-lg font-semibold text-[var(--cyan)]">
                {entries.length}
              </div>
              <div className="text-[var(--text-dim)]">assessments</div>
            </div>
          )
        }
      />

      {/* Segmented primary subnav */}
      <div className="overflow-x-auto rounded-2xl border border-[var(--hairline)] bg-[var(--bg-elev)] p-1">
        <div className="flex min-w-max gap-0.5">
          {INTERVIEW_TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`rounded-xl px-3.5 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-[var(--surface)] text-[var(--cyan)] shadow-[0_0_0_1px_color-mix(in_srgb,var(--cyan)_35%,transparent)]"
                    : "text-[var(--text-dim)] hover:text-[var(--text-mid)]"
                }`}
              >
                {t.label}
                {t.id === "history" && entries.length > 0 ? (
                  <span className="ml-1 font-mono text-[10px] opacity-70">{entries.length}</span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {tab === "grade" ? <GradeForm onLogged={() => setTab("history")} /> : null}
      {tab === "history" ? <RubricHistory /> : null}
      {tab === "gaps" ? <GapsBoard entries={entries} roleFilter={roleFilter} /> : null}
      {tab === "retest" ? <RetestQueue entries={entries} roleFilter={roleFilter} /> : null}
      {tab === "performance" ? (
        <PerformancePanel entries={entries} roleFilter={roleFilter} />
      ) : null}

      {tab === "qbank" ? (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
            {TRACK_ORDER.map((t) => {
              const tr = QBANK[t];
              const m = tr.questions.filter((qq) => status[qq.id] === "mastered").length;
              const pct = tr.questions.length
                ? Math.round((m / tr.questions.length) * 100)
                : 0;
              const active = trackKey === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setPos(t, 0)}
                  className={`rounded-2xl border px-3 py-2.5 text-left transition ${
                    active
                      ? "border-[var(--cyan)]/50 bg-[var(--tint-cyan)] shadow-[0_0_24px_-8px_var(--cyan)]"
                      : "border-[var(--hairline)] bg-[var(--surface)] hover:border-[var(--hairline-strong)]"
                  }`}
                >
                  <div
                    className={`text-xs font-semibold ${active ? "text-[var(--cyan)]" : "text-[var(--text)]"}`}
                  >
                    {tr.short}
                  </div>
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[var(--fill-strong)]">
                    <div
                      className="h-full rounded-full bg-[var(--cyan)] transition-all"
                      style={{ width: `${pct}%`, opacity: active ? 1 : 0.55 }}
                    />
                  </div>
                  <div className="mt-1 font-mono text-[10px] text-[var(--text-dim)]">
                    {m}/{tr.questions.length}
                  </div>
                </button>
              );
            })}
          </div>

          {q ? (
            <Flashcard
              meta={
                <>
                  <span className="text-[var(--cyan)]">{track.label}</span>
                  <span>·</span>
                  <span>
                    {idx + 1}/{track.questions.length}
                  </span>
                  {status[q.id] ? (
                    <>
                      <span>·</span>
                      <span className="text-[var(--green)]">{status[q.id]}</span>
                    </>
                  ) : null}
                </>
              }
              question={questionNode}
              layers={layers}
              revealed={revealed}
              onToggle={(i) =>
                setRevealed((prev) => {
                  const next = [...prev];
                  next[i] = !next[i];
                  return next;
                })
              }
              footer={
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={idx <= 0}
                    onClick={() => setPos(trackKey, idx - 1)}
                    className="inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm disabled:opacity-40"
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    disabled={idx >= track.questions.length - 1}
                    onClick={() => setPos(trackKey, idx + 1)}
                    className="inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm disabled:opacity-40"
                  >
                    Next
                  </button>
                  {status[q.id] === "mastered" ? (
                    <button
                      type="button"
                      onClick={() => setStatus(q.id, null)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--green)] bg-[var(--tint-green)] px-3 py-2 text-sm font-semibold text-[var(--green)]"
                      title="Clear mastered"
                    >
                      Mastered ✓
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={markMastered}
                      className="inline-flex items-center rounded-lg border border-[var(--cyan)] bg-[var(--cyan)] px-3 py-2 text-sm font-semibold text-[var(--bg)]"
                    >
                      Mark mastered
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setStatus(q.id, "review")}
                    className={`inline-flex items-center rounded-lg border px-3 py-2 text-sm ${
                      status[q.id] === "review"
                        ? "border-[var(--yellow)] bg-[var(--tint-yellow)] text-[var(--yellow)]"
                        : "border-[var(--border)] bg-[var(--surface-2)]"
                    }`}
                  >
                    Review
                  </button>
                  {status[q.id] && status[q.id] !== "mastered" ? (
                    <button
                      type="button"
                      className="text-xs text-[var(--text-dim)] underline-offset-2 hover:underline"
                      onClick={() => setStatus(q.id, null)}
                    >
                      Clear
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="ml-auto inline-flex items-center rounded-lg border border-[var(--cyan)]/40 px-3 py-2 text-sm text-[var(--cyan)]"
                    onClick={() => setLogPrompt(q.q)}
                  >
                    Quick log…
                  </button>
                </div>
              }
            />
          ) : (
            <div className={`${card} text-sm text-[var(--text-dim)]`}>No questions in track.</div>
          )}
        </>
      ) : null}

      {logPrompt ? (
        <QuickLogModal
          task={logPrompt}
          track={trackKey}
          onClose={() => setLogPrompt(null)}
          onLogged={() => setTab("history")}
        />
      ) : null}
    </div>
  );
}

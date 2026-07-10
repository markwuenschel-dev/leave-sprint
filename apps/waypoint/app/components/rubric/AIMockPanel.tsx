"use client";

/**
 * AI Mock — the grade loop (Wayfinder #27). Pick a provider, answer a Q-bank
 * question, submit → POST /api/interview grades it via the seam and the entry
 * lands in the rubric (readiness / gaps / retest). Talks to the endpoint over
 * fetch only — never imports @/lib/llm (that would bundle provider SDKs client-side).
 */

import { useEffect, useMemo, useState } from "react";
import { QBANK, QB_TRACK_MAP, type TrackKey } from "@waypoint/qbank";
import { useWaypointStore } from "@/lib/store";
import { todayIso } from "@/lib/domain";
import type { RubricEntry } from "@waypoint/rubric";
import { Loader2, Sparkles } from "lucide-react";

const TRACKS: TrackKey[] = ["swe", "mle", "ds", "de", "react", "sql", "sdlc", "diag"];

interface GradeResult {
  entry: RubricEntry;
  monotonicOk: boolean;
  flagged: boolean;
  droppedTags: string[];
}

const box = "rounded-2xl border border-[var(--hairline)] bg-[var(--bg-elev)]";

export function AIMockPanel() {
  const addRubricEntry = useWaypointStore((s) => s.addRubricEntry);

  const [providers, setProviders] = useState<string[] | null>(null);
  const [provider, setProvider] = useState<string>("");
  const [track, setTrack] = useState<TrackKey>("swe");
  const [qIdx, setQIdx] = useState(0);
  const [answer, setAnswer] = useState("");
  const [grading, setGrading] = useState(false);
  const [result, setResult] = useState<GradeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const questions = QBANK[track].questions;
  const q = questions[Math.min(qIdx, Math.max(0, questions.length - 1))];
  const map = useMemo(() => QB_TRACK_MAP[track], [track]);

  useEffect(() => {
    let live = true;
    fetch("/api/interview")
      .then((r) => r.json())
      .then((j: { providers?: string[] }) => {
        if (!live) return;
        setProviders(j.providers ?? []);
        if (j.providers?.length) setProvider((p) => p || j.providers![0]);
      })
      .catch(() => live && setProviders([]));
    return () => {
      live = false;
    };
  }, []);

  async function grade() {
    if (!q || !provider || !answer.trim() || grading) return;
    setGrading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          provider,
          ctx: {
            task: q.q.slice(0, 120),
            date: todayIso(),
            taskType: map.taskType,
            domain: map.domain,
            primaryRole: map.role,
            problemLevel: "L2",
            difficulty: 2,
            questionSource: "qbank",
            assessmentMode: "mock interview",
          },
          question: q.q,
          answer,
        }),
      });
      const j = await res.json();
      if (!res.ok) {
        setError(j?.message || j?.error || `HTTP ${res.status}`);
        return;
      }
      setResult(j as GradeResult);
      addRubricEntry((j as GradeResult).entry);
    } catch (e) {
      setError(String((e as Error).message));
    } finally {
      setGrading(false);
    }
  }

  function nextQuestion() {
    setResult(null);
    setAnswer("");
    setError(null);
    setQIdx((i) => (i + 1) % questions.length);
  }

  const noProviders = providers !== null && providers.length === 0;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className={`${box} flex flex-wrap items-center gap-3 p-3`}>
        <div className="flex items-center gap-1.5 text-sm font-medium text-[var(--cyan)]">
          <Sparkles size={15} aria-hidden /> AI Mock
        </div>
        <label className="flex items-center gap-1.5 text-xs text-[var(--text-dim)]">
          Provider
          <select
            className="rounded-lg border border-[var(--hairline)] bg-[var(--bg)] px-2 py-1 text-xs text-[var(--text)]"
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            disabled={!providers?.length}
          >
            {providers?.length ? (
              providers.map((p) => <option key={p} value={p}>{p}</option>)
            ) : (
              <option>{providers === null ? "loading…" : "none configured"}</option>
            )}
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-xs text-[var(--text-dim)]">
          Track
          <select
            className="rounded-lg border border-[var(--hairline)] bg-[var(--bg)] px-2 py-1 text-xs text-[var(--text)]"
            value={track}
            onChange={(e) => {
              setTrack(e.target.value as TrackKey);
              setQIdx(0);
              setResult(null);
              setAnswer("");
            }}
          >
            {TRACKS.map((t) => (
              <option key={t} value={t}>{QBANK[t].short} · {map && QB_TRACK_MAP[t].role}</option>
            ))}
          </select>
        </label>
        <span className="ml-auto font-mono text-[10px] text-[var(--text-dim)]">
          Q {qIdx + 1}/{questions.length}
        </span>
      </div>

      {noProviders ? (
        <div className={`${box} p-4 text-sm text-[var(--text-mid)]`}>
          No providers configured. Add at least one key to <code className="font-mono text-[var(--text)]">apps/waypoint/.env.local</code>{" "}
          (<code className="font-mono">ANTHROPIC_API_KEY</code>, <code className="font-mono">OPENAI_API_KEY</code>,{" "}
          <code className="font-mono">XAI_API_KEY</code>, <code className="font-mono">GEMINI_API_KEY</code>) and restart the server.
        </div>
      ) : null}

      {/* Question */}
      <div className={`${box} p-4`}>
        <div className="mb-1 text-[10px] uppercase tracking-wider text-[var(--text-dim)]">Question</div>
        <div className="text-[var(--text)]">{q?.q ?? "—"}</div>
      </div>

      {/* Answer */}
      <textarea
        className={`${box} min-h-[140px] w-full resize-y p-3 text-sm text-[var(--text)] outline-none focus:border-[var(--hairline-strong)]`}
        placeholder="Answer as you would in an interview — your own words, unaided…"
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        disabled={grading}
      />

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={grade}
          disabled={grading || !provider || !answer.trim() || noProviders}
          className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
        >
          {grading ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <Sparkles size={15} aria-hidden />}
          {grading ? "Grading…" : "Grade answer"}
        </button>
        <button type="button" onClick={nextQuestion} className="btn" disabled={grading}>
          Next question →
        </button>
      </div>

      {error ? (
        <div className="rounded-2xl border border-[#ef4444]/40 bg-[#ef4444]/5 p-3 text-sm text-[#ef4444]">
          {error}
        </div>
      ) : null}

      {/* Result */}
      {result ? (
        <div className={`${box} space-y-3 p-4`}>
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
            <div>
              <span className="font-mono text-3xl font-semibold text-[var(--cyan)]">
                {result.entry.finalScore}
              </span>
              <span className="ml-2 text-sm text-[var(--text-mid)]">{result.entry.demonstratedLevel || "—"}</span>
            </div>
            <div className="text-xs text-[var(--text-dim)]">
              graded by <span className="font-mono text-[var(--text-mid)]">{result.entry.calibration?.graderModel}</span>
              {" · "}confidence {result.entry.calibration?.calibrationConfidence}
              {result.flagged ? <span className="ml-1 text-[#f59e0b]">· flagged (non-monotonic)</span> : null}
            </div>
          </div>

          {result.entry.gapTypes?.length ? (
            <div className="flex flex-wrap gap-1.5">
              {result.entry.gapTypes.map((g) => (
                <span key={g} className="rounded-lg border border-[var(--hairline)] px-2 py-0.5 text-[11px] text-[var(--text-mid)]">
                  {g}
                </span>
              ))}
            </div>
          ) : null}

          {result.entry.weaknesses ? (
            <p className="text-sm text-[var(--text-mid)]">{result.entry.weaknesses}</p>
          ) : null}

          <div className="text-[11px] text-[var(--text-dim)]">
            Logged to your rubric — it now counts toward readiness, gaps, and retest.
          </div>
        </div>
      ) : null}
    </div>
  );
}

"use client";

/**
 * AI Mock — a conversational interview loop (Wayfinder #27 + #29). The active
 * provider generates a question, you answer, it probes with adaptive follow-ups,
 * then grades how the answer held up — the entry lands in your rubric. Talks to
 * /api/interview over fetch only (never imports @/lib/llm, so SDKs stay server-side).
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { QBANK, QB_TRACK_MAP, type TrackKey } from "@waypoint/qbank";
import { useWaypointStore } from "@/lib/store";
import { todayIso } from "@/lib/domain";
import type { RubricEntry } from "@waypoint/rubric";
import { Loader2, Sparkles, Send } from "lucide-react";

const TRACKS: TrackKey[] = ["swe", "mle", "ds", "de", "react", "sql", "sdlc", "diag"];
const MAX_PROBES = 2;
const box = "rounded-2xl border border-[var(--hairline)] bg-[var(--bg-elev)]";

interface GradeResult {
  entry: RubricEntry;
  monotonicOk: boolean;
  flagged: boolean;
  droppedTags: string[];
}
type Turn = { who: "ai" | "you"; text: string };
type Phase = "idle" | "answering" | "busy" | "graded";

function transcript(turns: Turn[]): string {
  return turns.map((t) => `${t.who === "ai" ? "Interviewer" : "Candidate"}: ${t.text}`).join("\n\n");
}

export function AIMockPanel() {
  const addRubricEntry = useWaypointStore((s) => s.addRubricEntry);

  const [providers, setProviders] = useState<string[] | null>(null);
  const [provider, setProvider] = useState<string>("");
  const [track, setTrack] = useState<TrackKey>("swe");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [probeCount, setProbeCount] = useState(0);
  const [asked, setAsked] = useState<string[]>([]);
  const [result, setResult] = useState<GradeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const map = useMemo(() => QB_TRACK_MAP[track], [track]);
  const busy = phase === "busy";
  const noProviders = providers !== null && providers.length === 0;

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

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, result]);

  async function post(bodyExtra: Record<string, unknown>) {
    const res = await fetch("/api/interview", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ provider, ...bodyExtra }),
    });
    const j = await res.json();
    if (!res.ok) throw new Error(j?.message || j?.error || `HTTP ${res.status}`);
    return j;
  }

  async function startInterview() {
    if (!provider || busy) return;
    setError(null);
    setResult(null);
    setTurns([]);
    setProbeCount(0);
    setPhase("busy");
    try {
      const seed = QBANK[track].questions[Math.floor(asked.length) % QBANK[track].questions.length]?.q;
      const j = await post({ action: "question", role: map.role, domain: map.domain, seed, avoid: asked });
      const question = String(j.question || "").trim();
      setTurns([{ who: "ai", text: question }]);
      setAsked((a) => [...a, question]);
      setPhase("answering");
    } catch (e) {
      setError(String((e as Error).message));
      setPhase("idle");
    }
  }

  async function doGrade(finalTurns: Turn[]) {
    setPhase("busy");
    try {
      const question = finalTurns[0]?.text ?? "";
      const answer = finalTurns[1]?.text ?? "";
      const probing = finalTurns.length > 2 ? transcript(finalTurns.slice(2)) : undefined;
      const j: GradeResult = await post({
        action: "grade",
        ctx: {
          task: question.slice(0, 120),
          date: todayIso(),
          taskType: map.taskType,
          domain: map.domain,
          primaryRole: map.role,
          problemLevel: "L2",
          difficulty: 2,
          questionSource: `generated:${provider}`,
          assessmentMode: "mock interview",
          followUpsAsked: probeCount,
        },
        question,
        answer,
        probingTranscript: probing,
      });
      setResult(j);
      addRubricEntry(j.entry);
      setPhase("graded");
    } catch (e) {
      setError(String((e as Error).message));
      setPhase("answering");
    }
  }

  async function submitAnswer() {
    if (!draft.trim() || busy) return;
    setError(null);
    const next = [...turns, { who: "you" as const, text: draft.trim() }];
    setTurns(next);
    setDraft("");

    if (probeCount >= MAX_PROBES) {
      await doGrade(next);
      return;
    }
    setPhase("busy");
    try {
      const j = await post({ action: "probe", transcript: transcript(next) });
      const probe = j.probe ? String(j.probe).trim() : null;
      if (probe) {
        setTurns([...next, { who: "ai", text: probe }]);
        setProbeCount((c) => c + 1);
        setPhase("answering");
      } else {
        await doGrade(next); // model said DONE
      }
    } catch (e) {
      setError(String((e as Error).message));
      setPhase("answering");
    }
  }

  function gradeNow() {
    if (busy) return;
    const next = draft.trim() ? [...turns, { who: "you" as const, text: draft.trim() }] : turns;
    setDraft("");
    setTurns(next);
    if (next.length >= 2) void doGrade(next);
  }

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
            disabled={!providers?.length || phase === "answering" || busy}
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
            onChange={(e) => setTrack(e.target.value as TrackKey)}
            disabled={phase === "answering" || busy}
          >
            {TRACKS.map((t) => (
              <option key={t} value={t}>{QBANK[t].short} · {QB_TRACK_MAP[t].role}</option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={startInterview}
          disabled={!provider || busy || noProviders}
          className="btn-primary ml-auto inline-flex items-center gap-2 disabled:opacity-50"
        >
          {busy ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <Sparkles size={15} aria-hidden />}
          {turns.length ? "New question" : "Start"}
        </button>
      </div>

      {noProviders ? (
        <div className={`${box} p-4 text-sm text-[var(--text-mid)]`}>
          No providers configured. Add at least one key to the repo-root <code className="font-mono text-[var(--text)]">.env</code>{" "}
          (<code className="font-mono">OPENAI_API_KEY</code>, <code className="font-mono">XAI_API_KEY</code>,{" "}
          <code className="font-mono">GEMINI_API_KEY</code>, <code className="font-mono">ANTHROPIC_API_KEY</code>) and restart.
        </div>
      ) : null}

      {/* Transcript */}
      {turns.length ? (
        <div className={`${box} space-y-3 p-4`}>
          {turns.map((t, i) => (
            <div key={i} className={t.who === "ai" ? "" : "pl-4"}>
              <div className="mb-0.5 text-[10px] uppercase tracking-wider text-[var(--text-dim)]">
                {t.who === "ai" ? "Interviewer" : "You"}
              </div>
              <div className={t.who === "ai" ? "text-[var(--text)]" : "text-[var(--text-mid)]"}>{t.text}</div>
            </div>
          ))}
          {busy ? (
            <div className="flex items-center gap-2 text-xs text-[var(--text-dim)]">
              <Loader2 size={13} className="animate-spin" aria-hidden /> thinking…
            </div>
          ) : null}
          <div ref={endRef} />
        </div>
      ) : (
        <div className={`${box} p-6 text-center text-sm text-[var(--text-dim)]`}>
          Pick a provider and track, then <strong className="text-[var(--text-mid)]">Start</strong> — the interviewer
          asks a question, probes your answer, and grades it into your rubric.
        </div>
      )}

      {/* Answer box */}
      {phase === "answering" ? (
        <>
          <textarea
            className={`${box} min-h-[120px] w-full resize-y p-3 text-sm text-[var(--text)] outline-none focus:border-[var(--hairline-strong)]`}
            placeholder="Answer in your own words, unaided…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoFocus
          />
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={submitAnswer}
              disabled={!draft.trim()}
              className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
            >
              <Send size={14} aria-hidden />
              {probeCount >= MAX_PROBES ? "Submit & grade" : "Submit answer"}
            </button>
            {turns.length >= 1 ? (
              <button type="button" onClick={gradeNow} className="btn">
                Grade now →
              </button>
            ) : null}
            <span className="ml-auto font-mono text-[10px] text-[var(--text-dim)]">
              probe {probeCount}/{MAX_PROBES}
            </span>
          </div>
        </>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-[#ef4444]/40 bg-[#ef4444]/5 p-3 text-sm text-[#ef4444]">{error}</div>
      ) : null}

      {/* Result */}
      {result ? (
        <div className={`${box} space-y-3 p-4`}>
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
            <div>
              <span className="font-mono text-3xl font-semibold text-[var(--cyan)]">{result.entry.finalScore}</span>
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
          {result.entry.weaknesses ? <p className="text-sm text-[var(--text-mid)]">{result.entry.weaknesses}</p> : null}
          <div className="text-[11px] text-[var(--text-dim)]">
            Logged to your rubric — it now counts toward readiness, gaps, and retest. Hit <strong>New question</strong> to go again.
          </div>
        </div>
      ) : null}
    </div>
  );
}

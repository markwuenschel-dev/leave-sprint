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
import { Loader2, Sparkles, Send, Mic, MicOff } from "lucide-react";

const TRACKS: TrackKey[] = ["swe", "mle", "ds", "de", "react", "sql", "sdlc", "diag"];
const MAX_PROBES = 2;
const box = "rounded-2xl border border-[var(--hairline)] bg-[var(--bg-elev)]";

interface GradeResult {
  entry: RubricEntry;
  monotonicOk: boolean;
  flagged: boolean;
  droppedTags: string[];
}
type Turn = { who: "ai" | "you" | "hint" | "feedback"; text: string };
type Phase = "idle" | "answering" | "busy" | "graded";

function transcript(turns: Turn[]): string {
  return turns
    // hints (coaching) and per-answer feedback (meta-commentary) are not part of the graded exchange
    .filter((t) => t.who !== "hint" && t.who !== "feedback")
    .map((t) => `${t.who === "ai" ? "Interviewer" : "Candidate"}: ${t.text}`)
    .join("\n\n");
}

/** First MediaRecorder audio container this browser supports (webm on Chrome/Edge, mp4 on Safari). */
function pickAudioMime(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  for (const m of ["audio/webm", "audio/mp4"]) {
    if (MediaRecorder.isTypeSupported(m)) return m;
  }
  return null;
}

/** Tailwind tone for a gate verdict — Pass green, Fail red, Partial/other amber. */
function gateTone(v: string): string {
  const s = v.toLowerCase();
  if (s.startsWith("pass")) return "border-[#10b981]/40 text-[#10b981]";
  if (s.startsWith("fail")) return "border-[#ef4444]/40 text-[#ef4444]";
  return "border-[#f59e0b]/40 text-[#f59e0b]";
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
  const [candidates, setCandidates] = useState<{ provider: string; question: string }[] | null>(null);
  const [qSource, setQSource] = useState("");
  const [coaching, setCoaching] = useState(false);
  const [usedHint, setUsedHint] = useState(false);
  const [result, setResult] = useState<GradeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const map = useMemo(() => QB_TRACK_MAP[track], [track]);
  const busy = phase === "busy";
  const noProviders = providers !== null && providers.length === 0;
  // Dictation is OpenAI-only (gpt-4o-transcribe), independent of the chosen grader.
  const canDictate = !!providers?.includes("openai");

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
    setCandidates(null);
    setProbeCount(0);
    setUsedHint(false);
    setPhase("busy");
    try {
      const seed = QBANK[track].questions[asked.length % QBANK[track].questions.length]?.q;
      const j = await post({ action: "question", role: map.role, domain: map.domain, seed, avoid: asked });
      const question = String(j.question || "").trim();
      setQSource(`generated:${provider}`);
      setTurns([{ who: "ai", text: question }]);
      setAsked((a) => [...a, question]);
      setPhase("answering");
    } catch (e) {
      setError(String((e as Error).message));
      setPhase("idle");
    }
  }

  /** Fan question generation across all providers; the user picks one (ADR-0002). */
  async function getOptions() {
    if (!provider || busy) return;
    setError(null);
    setResult(null);
    setTurns([]);
    setCandidates(null);
    setProbeCount(0);
    setUsedHint(false);
    setPhase("busy");
    try {
      const seed = QBANK[track].questions[asked.length % QBANK[track].questions.length]?.q;
      const j = await post({ action: "slate", role: map.role, domain: map.domain, seed, avoid: asked });
      setCandidates(j.candidates ?? []);
    } catch (e) {
      setError(String((e as Error).message));
    } finally {
      setPhase("idle");
    }
  }

  function pickCandidate(c: { provider: string; question: string }) {
    setCandidates(null);
    setQSource(`slate:${c.provider}`); // question author ≠ grader
    setTurns([{ who: "ai", text: c.question }]);
    setAsked((a) => [...a, c.question]);
    setProbeCount(0);
    setUsedHint(false);
    setResult(null);
    setPhase("answering");
  }

  /** Coaching mode: request a hint mid-answer (flags the session as coached). */
  async function getHint() {
    if (busy) return;
    setError(null);
    setPhase("busy");
    try {
      const ctx = draft.trim() ? `${transcript(turns)}\n\nCandidate (drafting): ${draft.trim()}` : transcript(turns);
      const j = await post({ action: "hint", transcript: ctx });
      const hint = String(j.hint || "").trim();
      if (hint) {
        setTurns((t) => [...t, { who: "hint", text: hint }]);
        setUsedHint(true);
      }
    } catch (e) {
      setError(String((e as Error).message));
    } finally {
      setPhase("answering");
    }
  }

  /** Voice dictation (input only): record → stop → transcribe via OpenAI → append to the draft. */
  function toggleMic() {
    if (recording) stopRecording();
    else void startRecording();
  }

  async function startRecording() {
    const mime = pickAudioMime();
    if (!mime) {
      setError("Voice dictation isn't supported in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        void transcribeBlob(new Blob(chunksRef.current, { type: mime }), mime);
      };
      mediaRecorderRef.current = rec;
      rec.start();
      setError(null);
      setRecording(true);
    } catch {
      setError("Mic access denied — allow microphone permission to dictate.");
    }
  }

  function stopRecording() {
    const rec = mediaRecorderRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
    mediaRecorderRef.current = null;
    setRecording(false);
  }

  async function transcribeBlob(blob: Blob, mime: string) {
    if (!blob.size) return;
    setTranscribing(true);
    try {
      const form = new FormData();
      form.append("audio", blob, `answer.${mime.includes("mp4") ? "mp4" : "webm"}`);
      const res = await fetch("/api/transcribe", { method: "POST", body: form });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.message || j?.error || `HTTP ${res.status}`);
      const text = String(j.text || "").trim();
      if (text) setDraft((d) => (d.trim() ? `${d.trim()} ${text}` : text));
    } catch (e) {
      setError(`Transcription failed: ${(e as Error).message}`);
    } finally {
      setTranscribing(false);
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
          questionSource: qSource || `generated:${provider}`,
          assessmentMode: "mock interview",
          followUpsAsked: probeCount,
          coached: usedHint,
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
    if (!draft.trim() || busy || recording || transcribing) return;
    setError(null);
    const next = [...turns, { who: "you" as const, text: draft.trim() }];
    setTurns(next);
    setDraft("");

    // Always fetch a per-answer verdict first (even on the last answer, where `final`
    // tells the model to give feedback but no follow-up), so every answer gets feedback.
    const atMax = probeCount >= MAX_PROBES;
    setPhase("busy");
    try {
      const j = await post({ action: "probe", transcript: transcript(next), final: atMax });
      const feedback = j.feedback ? String(j.feedback).trim() : "";
      const probe = j.probe ? String(j.probe).trim() : null;
      const shown = feedback ? [...next, { who: "feedback" as const, text: feedback }] : next;
      if (atMax || !probe) {
        setTurns(shown);
        await doGrade(next); // grade the pre-feedback turns; transcript() strips feedback anyway
      } else {
        setTurns([...shown, { who: "ai", text: probe }]);
        setProbeCount((c) => c + 1);
        setPhase("answering");
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
        <label
          className="flex items-center gap-1.5 text-xs text-[var(--text-dim)]"
          title="Let the model give hints mid-answer. Coached grades are flagged and do not count toward your readiness floor."
        >
          <input
            type="checkbox"
            checked={coaching}
            onChange={(e) => setCoaching(e.target.checked)}
            className="accent-[var(--cyan)]"
          />
          Coaching
        </label>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={getOptions}
            disabled={!provider || busy || noProviders || phase === "answering"}
            className="btn inline-flex items-center gap-1.5 disabled:opacity-50"
            title="Each configured provider proposes a question — you pick one"
          >
            Get options
          </button>
          <button
            type="button"
            onClick={startInterview}
            disabled={!provider || busy || noProviders}
            className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
          >
            {busy ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <Sparkles size={15} aria-hidden />}
            {turns.length ? "New question" : "Start"}
          </button>
        </div>
      </div>

      {noProviders ? (
        <div className={`${box} p-4 text-sm text-[var(--text-mid)]`}>
          No providers configured. Add at least one key to the repo-root <code className="font-mono text-[var(--text)]">.env</code>{" "}
          (<code className="font-mono">OPENAI_API_KEY</code>, <code className="font-mono">XAI_API_KEY</code>,{" "}
          <code className="font-mono">GEMINI_API_KEY</code>, <code className="font-mono">ANTHROPIC_API_KEY</code>) and restart.
        </div>
      ) : null}

      {/* Candidate slate */}
      {candidates && !turns.length ? (
        <div className={`${box} space-y-2 p-4`}>
          <div className="text-[10px] uppercase tracking-wider text-[var(--text-dim)]">
            Pick a question · {candidates.length} proposed
          </div>
          {candidates.length ? (
            candidates.map((c) => (
              <button
                key={c.provider}
                type="button"
                onClick={() => pickCandidate(c)}
                className="block w-full rounded-xl border border-[var(--hairline)] p-3 text-left text-sm text-[var(--text)] transition hover:border-[var(--hairline-strong)] hover:bg-[var(--surface)]"
              >
                <span className="font-mono text-[10px] text-[var(--cyan)]">{c.provider}</span>
                <div className="mt-0.5">{c.question}</div>
              </button>
            ))
          ) : (
            <div className="text-sm text-[var(--text-dim)]">No candidates returned.</div>
          )}
        </div>
      ) : null}

      {/* Transcript */}
      {turns.length ? (
        <div className={`${box} space-y-3 p-4`}>
          {turns.map((t, i) => (
            <div
              key={i}
              className={
                t.who === "you"
                  ? "pl-4"
                  : t.who === "hint"
                    ? "rounded-xl border border-[var(--cyan)]/25 bg-[var(--cyan)]/5 p-2.5"
                    : t.who === "feedback"
                      ? "rounded-xl border border-[var(--hairline)] bg-[var(--surface)] p-2.5"
                      : ""
              }
            >
              <div className="mb-0.5 text-[10px] uppercase tracking-wider text-[var(--text-dim)]">
                {t.who === "ai"
                  ? "Interviewer"
                  : t.who === "hint"
                    ? "Coach hint"
                    : t.who === "feedback"
                      ? "Feedback"
                      : "You"}
              </div>
              <div
                className={
                  t.who === "you"
                    ? "text-[var(--text-mid)]"
                    : t.who === "hint"
                      ? "text-sm italic text-[var(--cyan)]"
                      : t.who === "feedback"
                        ? "text-sm italic text-[var(--text-mid)]"
                        : "text-[var(--text)]"
                }
              >
                {t.text}
              </div>
            </div>
          ))}
          {busy ? (
            <div className="flex items-center gap-2 text-xs text-[var(--text-dim)]">
              <Loader2 size={13} className="animate-spin" aria-hidden /> thinking…
            </div>
          ) : null}
          <div ref={endRef} />
        </div>
      ) : candidates ? null : (
        <div className={`${box} p-6 text-center text-sm text-[var(--text-dim)]`}>
          Pick a provider and track, then <strong className="text-[var(--text-mid)]">Start</strong> — or{" "}
          <strong className="text-[var(--text-mid)]">Get options</strong> to have each provider propose one. The
          interviewer asks, probes your answer, and grades it into your rubric.
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
              disabled={!draft.trim() || busy || recording || transcribing}
              className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
            >
              <Send size={14} aria-hidden />
              {probeCount >= MAX_PROBES ? "Submit & grade" : "Submit answer"}
            </button>
            {canDictate ? (
              <button
                type="button"
                onClick={toggleMic}
                disabled={busy || transcribing}
                className={`btn inline-flex items-center gap-1.5 disabled:opacity-50 ${recording ? "text-[#ef4444]" : "text-[var(--cyan)]"}`}
                title={recording ? "Stop and transcribe" : "Dictate your answer (voice-to-text)"}
              >
                {transcribing ? (
                  <Loader2 size={14} className="animate-spin" aria-hidden />
                ) : recording ? (
                  <MicOff size={14} aria-hidden />
                ) : (
                  <Mic size={14} aria-hidden />
                )}
                {transcribing ? "Transcribing…" : recording ? "Stop" : "Dictate"}
              </button>
            ) : null}
            {turns.length >= 1 ? (
              <button type="button" onClick={gradeNow} className="btn">
                Grade now →
              </button>
            ) : null}
            {coaching ? (
              <button
                type="button"
                onClick={getHint}
                disabled={busy || recording || transcribing}
                className="btn text-[var(--cyan)] disabled:opacity-50"
              >
                Get a hint
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
              {result.entry.llmIndependence?.llmUsed ? (
                <span className="ml-1 text-[#f59e0b]">· coached (excluded from readiness floor)</span>
              ) : null}
            </div>
          </div>
          {/* Level scores — the controlling scores the verdict derives from */}
          <div>
            <div className="mb-1 text-[10px] uppercase tracking-wider text-[var(--text-dim)]">Level scores</div>
            <div className="flex flex-wrap gap-4">
              {(["L1", "L2", "L3"] as const).map((lv) => (
                <div key={lv} className="flex items-baseline gap-1.5">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-dim)]">{lv}</span>
                  <span className="font-mono text-lg text-[var(--text)]">{result.entry.levelScores?.[lv] ?? "—"}</span>
                  {result.entry.levelVerdicts?.[lv] ? (
                    <span className="text-[10px] text-[var(--text-dim)]">{result.entry.levelVerdicts[lv]}</span>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
          {/* Gates — a Partial/Fail on Correctness silently caps the level */}
          {result.entry.gates && Object.keys(result.entry.gates).length ? (
            <div>
              <div className="mb-1 text-[10px] uppercase tracking-wider text-[var(--text-dim)]">Gates</div>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(result.entry.gates).map(([g, v]) => (
                  <span key={g} className={`rounded-lg border px-2 py-0.5 text-[11px] ${gateTone(String(v))}`}>
                    {g}: {v}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
          {result.entry.mainReasonNextLevelNotReached ? (
            <p className="text-sm text-[var(--text-mid)]">
              <span className="text-[var(--text-dim)]">Why not higher: </span>
              {result.entry.mainReasonNextLevelNotReached}
            </p>
          ) : null}
          {result.entry.nextTarget ? (
            <p className="text-sm text-[var(--text-mid)]">
              <span className="text-[var(--text-dim)]">Next target: </span>
              {result.entry.nextTarget}
            </p>
          ) : null}
          {result.entry.strengths ? (
            <p className="text-sm text-[var(--text-mid)]">
              <span className="text-[#10b981]">Strengths: </span>
              {result.entry.strengths}
            </p>
          ) : null}
          {result.entry.weaknesses ? (
            <p className="text-sm text-[var(--text-mid)]">
              <span className="text-[#f59e0b]">Weaknesses: </span>
              {result.entry.weaknesses}
            </p>
          ) : null}
          {result.entry.universalSubScores && Object.keys(result.entry.universalSubScores).length ? (
            <div>
              <div className="mb-1 text-[10px] uppercase tracking-wider text-[var(--text-dim)]">Universal sub-scores</div>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(result.entry.universalSubScores).map(([d, s]) => (
                  <span key={d} className="rounded-lg border border-[var(--hairline)] px-2 py-0.5 text-[11px] text-[var(--text-mid)]">
                    {d} <span className="font-mono text-[var(--text)]">{s}</span>
                  </span>
                ))}
              </div>
            </div>
          ) : null}
          {result.entry.gapTypes?.length ? (
            <div className="flex flex-wrap gap-1.5">
              {result.entry.gapTypes.map((g) => (
                <span key={g} className="rounded-lg border border-[var(--hairline)] px-2 py-0.5 text-[11px] text-[var(--text-mid)]">
                  {g}
                </span>
              ))}
            </div>
          ) : null}
          {result.entry.surviveProbing ? (
            <p className="text-xs text-[var(--text-dim)]">
              <span className="uppercase tracking-wider">Under probing:</span> {result.entry.surviveProbing}
            </p>
          ) : null}
          {result.entry.scoreUncertainty?.range ? (
            <p className="text-xs text-[var(--text-dim)]">
              Uncertainty {result.entry.scoreUncertainty.range[0]}–{result.entry.scoreUncertainty.range[1]}
              {result.entry.scoreUncertainty.reason ? ` — ${result.entry.scoreUncertainty.reason}` : ""}
            </p>
          ) : null}
          <div className="text-[11px] text-[var(--text-dim)]">
            Logged to your rubric — it now counts toward readiness, gaps, and retest. Hit <strong>New question</strong> to go again.
          </div>
        </div>
      ) : null}
    </div>
  );
}

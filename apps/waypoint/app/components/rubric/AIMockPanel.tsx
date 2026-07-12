"use client";

/**
 * AI Questions — a leveled interview ladder (Wayfinder #27 + #29). One Q Bank
 * question drives a session that climbs Level I → II → III: at each level the
 * provider generates a question, you answer, it probes with up to two adaptive
 * follow-ups that STAY at the current level, then grades the whole level as one
 * rubric entry. Passing a level (finalScore ≥ LEVEL_PASS) escalates; falling
 * short ends the session. Talks to /api/interview over fetch only (never imports
 * @/lib/llm, so SDKs stay server-side).
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { QBANK, QB_TRACK_MAP, type TrackKey, type QBankQuestion } from "@waypoint/qbank";
import { useWaypointStore } from "@/lib/store";
import { todayIso } from "@/lib/domain";
import type { RubricEntry } from "@waypoint/rubric";
import { Loader2, Sparkles, Send, Mic, MicOff } from "lucide-react";

const TRACKS: TrackKey[] = ["swe", "mle", "ds", "de", "react", "sql", "sdlc", "diag"];
const MAX_ADAPTIVE = 2; // adaptive follow-ups per level, at the model's discretion
const LEVEL_PASS = 70; // finalScore needed to escalate to the next level
const box = "rounded-2xl border border-[var(--hairline)] bg-[var(--bg-elev)]";

interface GradeResult {
  entry: RubricEntry;
  monotonicOk: boolean;
  flagged: boolean;
  droppedTags: string[];
}
interface LevelOutcome {
  level: 1 | 2 | 3;
  result: GradeResult;
  passed: boolean;
}
type Turn = { who: "ai" | "you" | "hint" | "feedback"; text: string };
type Phase = "idle" | "answering" | "busy" | "done";

function transcript(turns: Turn[]): string {
  return turns
    // hints (coaching) and per-answer feedback (meta-commentary) are not part of the graded exchange
    .filter((t) => t.who !== "hint" && t.who !== "feedback")
    .map((t) => `${t.who === "ai" ? "Interviewer" : "Candidate"}: ${t.text}`)
    .join("\n\n");
}

/** The Q Bank text that seeds a given rung of the ladder (falls back down when a stretch is absent). */
function levelSeed(item: QBankQuestion, level: 1 | 2 | 3): string | undefined {
  if (level === 1) return item.q;
  if (level === 2) return item.l2q ?? item.q;
  return item.l3q ?? item.l2q ?? item.q;
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

/** One level's grade, with the full breakdown that makes the demonstrated level explainable. */
function LevelGradeCard({ level, result, passed }: { level: number; result: GradeResult; passed: boolean }) {
  const e = result.entry;
  return (
    <div className={`${box} space-y-3 p-4`}>
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
        <div className="flex items-baseline gap-2">
          <span className="rounded-md border border-[var(--hairline)] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[var(--text-dim)]">
            Level {level}
          </span>
          <span className="font-mono text-3xl font-semibold text-[var(--cyan)]">{e.finalScore}</span>
          <span className="text-sm text-[var(--text-mid)]">{e.demonstratedLevel || "—"}</span>
          <span
            className={`rounded-lg border px-2 py-0.5 text-[11px] ${
              passed ? "border-[#10b981]/40 text-[#10b981]" : "border-[#ef4444]/40 text-[#ef4444]"
            }`}
          >
            {passed ? "passed" : "did not pass"}
          </span>
        </div>
        <div className="text-xs text-[var(--text-dim)]">
          graded by <span className="font-mono text-[var(--text-mid)]">{e.calibration?.graderModel}</span>
          {" · "}confidence {e.calibration?.calibrationConfidence}
          {result.flagged ? <span className="ml-1 text-[#f59e0b]">· flagged (non-monotonic)</span> : null}
          {e.llmIndependence?.llmUsed ? (
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
              <span className="font-mono text-lg text-[var(--text)]">{e.levelScores?.[lv] ?? "—"}</span>
              {e.levelVerdicts?.[lv] ? (
                <span className="text-[10px] text-[var(--text-dim)]">{e.levelVerdicts[lv]}</span>
              ) : null}
            </div>
          ))}
        </div>
      </div>
      {/* Gates — a Partial/Fail on Correctness silently caps the level */}
      {e.gates && Object.keys(e.gates).length ? (
        <div>
          <div className="mb-1 text-[10px] uppercase tracking-wider text-[var(--text-dim)]">Gates</div>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(e.gates).map(([g, v]) => (
              <span key={g} className={`rounded-lg border px-2 py-0.5 text-[11px] ${gateTone(String(v))}`}>
                {g}: {v}
              </span>
            ))}
          </div>
        </div>
      ) : null}
      {e.mainReasonNextLevelNotReached ? (
        <p className="text-sm text-[var(--text-mid)]">
          <span className="text-[var(--text-dim)]">Why not higher: </span>
          {e.mainReasonNextLevelNotReached}
        </p>
      ) : null}
      {e.nextTarget ? (
        <p className="text-sm text-[var(--text-mid)]">
          <span className="text-[var(--text-dim)]">Next target: </span>
          {e.nextTarget}
        </p>
      ) : null}
      {e.strengths ? (
        <p className="text-sm text-[var(--text-mid)]">
          <span className="text-[#10b981]">Strengths: </span>
          {e.strengths}
        </p>
      ) : null}
      {e.weaknesses ? (
        <p className="text-sm text-[var(--text-mid)]">
          <span className="text-[#f59e0b]">Weaknesses: </span>
          {e.weaknesses}
        </p>
      ) : null}
      {e.universalSubScores && Object.keys(e.universalSubScores).length ? (
        <div>
          <div className="mb-1 text-[10px] uppercase tracking-wider text-[var(--text-dim)]">Universal sub-scores</div>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(e.universalSubScores).map(([d, s]) => (
              <span key={d} className="rounded-lg border border-[var(--hairline)] px-2 py-0.5 text-[11px] text-[var(--text-mid)]">
                {d} <span className="font-mono text-[var(--text)]">{s}</span>
              </span>
            ))}
          </div>
        </div>
      ) : null}
      {e.gapTypes?.length ? (
        <div className="flex flex-wrap gap-1.5">
          {e.gapTypes.map((g) => (
            <span key={g} className="rounded-lg border border-[var(--hairline)] px-2 py-0.5 text-[11px] text-[var(--text-mid)]">
              {g}
            </span>
          ))}
        </div>
      ) : null}
      {e.surviveProbing ? (
        <p className="text-xs text-[var(--text-dim)]">
          <span className="uppercase tracking-wider">Under probing:</span> {e.surviveProbing}
        </p>
      ) : null}
      {e.scoreUncertainty?.range ? (
        <p className="text-xs text-[var(--text-dim)]">
          Uncertainty {e.scoreUncertainty.range[0]}–{e.scoreUncertainty.range[1]}
          {e.scoreUncertainty.reason ? ` — ${e.scoreUncertainty.reason}` : ""}
        </p>
      ) : null}
    </div>
  );
}

export function AIMockPanel() {
  const addRubricEntry = useWaypointStore((s) => s.addRubricEntry);
  // Cross-session memory (persists via /api/state) so a fresh page load doesn't
  // regenerate the same opening question. mockSeq rotates the seeding Q Bank item;
  // mockAsked feeds the prompt's avoid-list across sessions.
  const mockAsked = useWaypointStore((s) => s.mockAsked);
  const noteMockQuestion = useWaypointStore((s) => s.noteMockQuestion);
  const advanceMockSession = useWaypointStore((s) => s.advanceMockSession);

  const [providers, setProviders] = useState<string[] | null>(null);
  const [provider, setProvider] = useState<string>("");
  const [track, setTrack] = useState<TrackKey>("swe");
  const [qItem, setQItem] = useState<QBankQuestion | null>(null);
  const [level, setLevel] = useState<1 | 2 | 3>(1);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [adaptiveCount, setAdaptiveCount] = useState(0);
  const [asked, setAsked] = useState<string[]>([]);
  const [qSource, setQSource] = useState("");
  const [coaching, setCoaching] = useState(false);
  const [usedHint, setUsedHint] = useState(false);
  const [levelResults, setLevelResults] = useState<LevelOutcome[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const map = useMemo(() => QB_TRACK_MAP[track], [track]);
  const busy = phase === "busy";
  const active = phase === "answering" || phase === "busy";
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
  }, [turns, levelResults]);

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

  /** Pick one Q Bank question for the session — prefer ones that carry L2/L3 stretches. */
  function pickQItem(): QBankQuestion {
    const all = QBANK[track].questions;
    const withLadder = all.filter((q) => q.l2q && q.l3q);
    const pool = withLadder.length ? withLadder : all;
    // Read the freshly-advanced counter from the store (set() is synchronous) so the
    // rotation survives page reloads instead of restarting at pool[0] every load.
    const seq = useWaypointStore.getState().mockSeq;
    return pool[seq % pool.length];
  }

  /** Generate and post the opening question for a level, then hand off to answering. */
  async function askLevel(item: QBankQuestion, lvl: 1 | 2 | 3) {
    setPhase("busy");
    try {
      const j = await post({
        action: "question",
        role: map.role,
        domain: map.domain,
        level: lvl,
        seed: levelSeed(item, lvl),
        // Dedup against both this session's questions and prior persisted sessions.
        avoid: [...new Set([...mockAsked, ...asked])],
      });
      const question = String(j.question || "").trim();
      setTurns([{ who: "ai", text: question }]);
      setAsked((a) => [...a, question]);
      // Persist immediately so a reload mid-session still avoids repeats next time.
      if (question) noteMockQuestion(question);
      setAdaptiveCount(0);
      setUsedHint(false);
      setDraft("");
      setPhase("answering");
    } catch (e) {
      setError(String((e as Error).message));
      // A failure on level 1 means no session started; mid-ladder we end with what we have.
      setPhase(lvl === 1 ? "idle" : "done");
    }
  }

  /** Start a fresh session at Level I with a newly picked Q Bank question. */
  async function startSession() {
    if (!provider || busy) return;
    setError(null);
    // Advance the persisted rotation first so pickQItem seeds off a fresh Q Bank item
    // (set() is synchronous, so pickQItem reads the new value via getState()).
    advanceMockSession();
    const item = pickQItem();
    setQItem(item);
    setLevel(1);
    setLevelResults([]);
    setQSource(`generated:${provider}`);
    await askLevel(item, 1);
  }

  /** Coaching mode: request a hint mid-answer (flags this level's grade as coached). */
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

  /** Grade the current level as one entry, then gate: pass → escalate, fall short → end. */
  async function gradeLevel(levelTurns: Turn[]) {
    setPhase("busy");
    try {
      const question = levelTurns[0]?.text ?? "";
      const answer = levelTurns[1]?.text ?? "";
      const probing = levelTurns.length > 2 ? transcript(levelTurns.slice(2)) : undefined;
      const j: GradeResult = await post({
        action: "grade",
        ctx: {
          task: question.slice(0, 120),
          date: todayIso(),
          taskType: map.taskType,
          domain: map.domain,
          primaryRole: map.role,
          problemLevel: `L${level}`,
          difficulty: level,
          questionSource: qSource || `generated:${provider}`,
          assessmentMode: "mock interview",
          followUpsAsked: adaptiveCount,
          coached: usedHint,
        },
        question,
        answer,
        probingTranscript: probing,
      });
      addRubricEntry(j.entry);
      const passed = (j.entry.finalScore ?? 0) >= LEVEL_PASS;
      setLevelResults((r) => [...r, { level, result: j, passed }]);
      // Gate: escalate only if this level passed and a harder rung remains.
      if (passed && level < 3 && qItem) {
        const nextLevel = (level + 1) as 1 | 2 | 3;
        setLevel(nextLevel);
        await askLevel(qItem, nextLevel);
      } else {
        setTurns([]);
        setPhase("done");
      }
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

    // Always fetch a per-answer verdict first (even on the last answer of a level, where
    // `final` tells the model to give feedback but no follow-up), so every answer gets feedback.
    const atMax = adaptiveCount >= MAX_ADAPTIVE;
    setPhase("busy");
    try {
      const j = await post({ action: "probe", transcript: transcript(next), final: atMax, level });
      const feedback = j.feedback ? String(j.feedback).trim() : "";
      const probe = j.probe ? String(j.probe).trim() : null;
      const shown = feedback ? [...next, { who: "feedback" as const, text: feedback }] : next;
      if (atMax || !probe) {
        setTurns(shown);
        await gradeLevel(next); // grade the pre-feedback turns; transcript() strips feedback anyway
      } else {
        setTurns([...shown, { who: "ai", text: probe }]);
        setAdaptiveCount((c) => c + 1);
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
    if (next.length >= 2) void gradeLevel(next);
  }

  const lastOutcome = levelResults.length ? levelResults[levelResults.length - 1] : null;
  const clearedAll = levelResults.length === 3 && !!lastOutcome?.passed;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className={`${box} flex flex-wrap items-center gap-3 p-3`}>
        <div className="flex items-center gap-1.5 text-sm font-medium text-[var(--cyan)]">
          <Sparkles size={15} aria-hidden /> AI Questions
        </div>
        <label className="flex items-center gap-1.5 text-xs text-[var(--text-dim)]">
          Provider
          <select
            className="rounded-lg border border-[var(--hairline)] bg-[var(--bg)] px-2 py-1 text-xs text-[var(--text)]"
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            disabled={!providers?.length || active}
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
            disabled={active}
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
            onClick={startSession}
            disabled={!provider || busy || noProviders}
            className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
          >
            {busy ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <Sparkles size={15} aria-hidden />}
            {levelResults.length || active ? "Restart" : "Start"}
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

      {/* Level progress */}
      {active ? (
        <div className={`${box} flex items-center gap-2 p-3 text-xs`}>
          <span className="font-mono uppercase tracking-wider text-[var(--cyan)]">Level {level} of 3</span>
          {[1, 2, 3].map((n) => (
            <span
              key={n}
              className={`h-1.5 w-8 rounded-full ${
                n < level ? "bg-[#10b981]" : n === level ? "bg-[var(--cyan)]" : "bg-[var(--hairline)]"
              }`}
            />
          ))}
          <span className="ml-2 text-[var(--text-dim)]">{QBANK[track].short} · {map.role} · pass ≥ {LEVEL_PASS} to climb</span>
        </div>
      ) : null}

      {/* Transcript (current level only) */}
      {active && turns.length ? (
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
      ) : phase === "idle" ? (
        <div className={`${box} p-6 text-center text-sm text-[var(--text-dim)]`}>
          Pick a provider and track, then <strong className="text-[var(--text-mid)]">Start</strong>. One question climbs a
          three-level ladder — Level I → II → III. Each level asks, probes with up to two adaptive follow-ups, then grades
          into your rubric. Pass a level ({LEVEL_PASS}+) to climb; fall short and the session ends there.
        </div>
      ) : null}

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
              {adaptiveCount >= MAX_ADAPTIVE ? "Submit & grade level" : "Submit answer"}
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
              <button type="button" onClick={gradeNow} className="btn" title="Grade this level now">
                Grade level →
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
              L{level} · adaptive {adaptiveCount}/{MAX_ADAPTIVE}
            </span>
          </div>
        </>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-[#ef4444]/40 bg-[#ef4444]/5 p-3 text-sm text-[#ef4444]">{error}</div>
      ) : null}

      {/* Session summary + per-level grades */}
      {levelResults.length ? (
        <div className="space-y-3">
          {phase === "done" ? (
            <div className={`${box} p-3 text-sm text-[var(--text-mid)]`}>
              Session complete — {levelResults.length} level{levelResults.length > 1 ? "s" : ""} graded and logged to your
              rubric.{" "}
              {clearedAll
                ? "You cleared all three levels."
                : `Stopped at Level ${lastOutcome?.level} — did not pass (needs ${LEVEL_PASS}+).`}{" "}
              Hit <strong>Restart</strong> to go again.
            </div>
          ) : null}
          {levelResults.map((r) => (
            <LevelGradeCard key={r.level} level={r.level} result={r.result} passed={r.passed} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

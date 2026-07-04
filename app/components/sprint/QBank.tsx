"use client";

import { useEffect, useMemo, useState } from "react";
import { useSprintStore } from "@/lib/store";
import { QBANK } from "@/data/qbank";
import type { TrackKey, QBankQuestion } from "@/lib/qbank/types";
import { ProgressRing } from "@/app/components/ui/ProgressRing";
import { Flashcard, type FlashcardLayer } from "@/app/components/ui/Flashcard";
import { QuickLogModal } from "./rubric/QuickLogModal";
import { Check, RotateCcw, Download } from "lucide-react";

const TRACK_ORDER: TrackKey[] = ["swe", "mle", "ds", "de", "react", "sql", "sdlc"];

const TRACK_COLOR: Record<TrackKey, string> = {
  swe: "var(--cyan)",
  mle: "var(--orange)",
  ds: "var(--magenta)",
  de: "var(--yellow)",
  react: "var(--violet)",
  sql: "var(--green)",
  sdlc: "var(--blue)",
};

/** Build the reveal layers for a question, skipping empty fields. */
function buildLayers(q: QBankQuestion): FlashcardLayer[] {
  const layers: FlashcardLayer[] = [];
  const answer = q.compressed || q.anchor;
  if (answer) layers.push({ label: "Answer", content: answer });
  if (q.detail) layers.push({ label: "Full detail", content: q.detail, tone: "muted" });
  if (q.followup) layers.push({ label: "Follow-up", content: <><div className="font-medium text-[var(--text)] mb-1">{q.followup}</div>{q.followupAnswer}</> });
  if (q.tie) layers.push({ label: "Project tie-in", content: q.tie, tone: "accent" });
  if (q.trap) layers.push({ label: "Trap to avoid", content: q.trap, tone: "warn" });
  if (q.l2q) layers.push({ label: "Level II stretch", content: <><div className="font-medium text-[var(--text)] mb-1">{q.l2q}</div>{q.l2a}</> });
  if (q.l3q) layers.push({ label: "Level III stretch", content: <><div className="font-medium text-[var(--text)] mb-1">{q.l3q}</div>{q.l3a}</> });
  return layers;
}

function exportMarkdown() {
  const lines: string[] = ["# Q Bank — Level I Foundations", ""];
  const total = TRACK_ORDER.reduce((s, t) => s + QBANK[t].questions.length, 0);
  lines.push(`*${total} questions · ${TRACK_ORDER.length} tracks*`, "");
  TRACK_ORDER.forEach((t) => {
    const track = QBANK[t];
    lines.push(`## ${track.label}`, "");
    track.questions.forEach((q, i) => {
      lines.push(`### ${i + 1}. ${q.q}`);
      if (q.anchor) lines.push(`**Anchor:** ${q.anchor}`);
      if (q.detail) lines.push("", q.detail);
      if (q.followup) lines.push("", `*Follow-up:* ${q.followup}`, q.followupAnswer || "");
      if (q.l2q) lines.push("", `*L2:* ${q.l2q}`, q.l2a || "");
      if (q.l3q) lines.push("", `*L3:* ${q.l3q}`, q.l3a || "");
      lines.push("");
    });
  });
  const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "q-bank.md";
  a.click();
  URL.revokeObjectURL(url);
}

export function QBank() {
  const { qbankStatus, qbankPos, setQbankStatus, setQbankPos } = useSprintStore();
  const track = qbankPos.track;
  const questions = QBANK[track].questions;
  const idx = Math.min(qbankPos.idx, questions.length - 1);
  const current = questions[idx];

  const [revealed, setRevealed] = useState<boolean[]>([]);
  const [logPrompt, setLogPrompt] = useState<string | null>(null);

  const layers = useMemo(() => buildLayers(current), [current]);

  // Reset reveal state when the question changes.
  useEffect(() => {
    setRevealed(new Array(layers.length).fill(false));
  }, [current.id, layers.length]);

  const counts = (t: TrackKey) => {
    const qs = QBANK[t].questions;
    const mastered = qs.filter((q) => qbankStatus[q.id] === "mastered").length;
    return { mastered, total: qs.length };
  };

  const go = (nextIdx: number) => {
    const n = questions.length;
    setQbankPos(track, ((nextIdx % n) + n) % n);
  };

  const revealNext = () => {
    setRevealed((prev) => {
      const i = prev.findIndex((r) => !r);
      if (i === -1) return prev;
      const next = [...prev];
      next[i] = true;
      return next;
    });
  };

  const master = () => {
    setQbankStatus(current.id, "mastered");
    setLogPrompt(current.q);
  };
  const review = () => {
    setQbankStatus(current.id, "review");
    go(idx + 1);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (logPrompt) return;
      if (e.key === " ") {
        e.preventDefault();
        revealNext();
      } else if (e.key === "ArrowRight") {
        go(idx + 1);
      } else if (e.key === "ArrowLeft") {
        go(idx - 1);
      } else if (e.key.toLowerCase() === "m") {
        master();
      } else if (e.key.toLowerCase() === "r") {
        review();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, questions.length, logPrompt, track]);

  const status = qbankStatus[current.id];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Track selector */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          {TRACK_ORDER.map((t) => {
            const c = counts(t);
            const active = t === track;
            return (
              <button
                key={t}
                onClick={() => setQbankPos(t, 0)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl text-xs font-medium border transition-all ${
                  active ? "border-[var(--hairline-strong)] bg-[var(--fill-subtle)] text-[var(--text)]" : "border-[var(--hairline)] text-[var(--text-dim)] hover:text-[var(--text)]"
                }`}
                style={active ? { color: TRACK_COLOR[t] } : undefined}
              >
                {QBANK[t].short}
                <span className="font-mono text-[10px] text-[var(--text-dim)]">
                  {c.mastered}/{c.total}
                </span>
              </button>
            );
          })}
        </div>
        <button onClick={exportMarkdown} className="btn text-xs">
          <Download size={14} /> Export MD
        </button>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-4">
        <ProgressRing value={(counts(track).mastered / counts(track).total) * 100} size={44} stroke={5} color={TRACK_COLOR[track]}>
          <span className="text-[10px] font-mono text-[var(--text-mid)]">{Math.round((counts(track).mastered / counts(track).total) * 100)}%</span>
        </ProgressRing>
        <div className="text-sm text-[var(--text-mid)]">
          <span className="font-semibold text-[var(--text)]">{QBANK[track].label}</span> — question {idx + 1} of {questions.length}
        </div>
      </div>

      <Flashcard
        question={current.q}
        meta={
          <span>
            {track.toUpperCase()} · {current.id}
            {status && (
              <span className={`ml-2 ${status === "mastered" ? "text-[var(--done)]" : "text-[var(--yellow)]"}`}>
                • {status}
              </span>
            )}
          </span>
        }
        layers={layers}
        revealed={revealed}
        onToggle={(i) => setRevealed((prev) => prev.map((r, j) => (j === i ? !r : r)))}
        footer={
          <div className="flex flex-wrap gap-3">
            <button onClick={review} className="btn flex-1 min-w-[120px]">
              <RotateCcw size={16} /> Review (R)
            </button>
            <button onClick={master} className="btn-primary flex-1 min-w-[120px]">
              <Check size={16} /> Mastered (M)
            </button>
            <button onClick={() => go(idx + 1)} className="btn flex-1 min-w-[120px]">
              Next (→)
            </button>
          </div>
        }
      />

      <div className="text-xs text-[var(--text-dim)] text-center">
        Space reveals next layer · ← / → navigate · M = mastered (logs to rubric) · R = review
      </div>

      {logPrompt && <QuickLogModal task={logPrompt} track={track} onClose={() => { setLogPrompt(null); go(idx + 1); }} />}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { QBANK, type QBankQuestion, type TrackKey } from "@waypoint/qbank";
import { useWaypointStore, todayIso } from "@/lib/store";
import { Flashcard, type FlashcardLayer } from "../ui/Flashcard";
import { Markdown } from "../ui/Markdown";
import { ProgressRing } from "../ui/ProgressRing";
import { card, inputClass } from "./shared";

const TRACK_ORDER: TrackKey[] = ["swe", "mle", "ds", "de", "react", "sql", "sdlc", "diag"];

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

export function InterviewSurface() {
  const pos = useWaypointStore((s) => s.qbankPos);
  const setPos = useWaypointStore((s) => s.setQBankPos);
  const status = useWaypointStore((s) => s.qbankStatus);
  const setStatus = useWaypointStore((s) => s.setQBankStatus);
  const entries = useWaypointStore((s) => s.rubricEntries);
  const addEntry = useWaypointStore((s) => s.addRubricEntry);
  const trackKey = (TRACK_ORDER.includes(pos.track) ? pos.track : "swe") as TrackKey;
  const track = QBANK[trackKey];
  const idx = Math.min(pos.idx, Math.max(0, track.questions.length - 1));
  const q = track.questions[idx];
  const [task, setTask] = useState("");
  const [role, setRole] = useState<"SWE" | "MLE">("SWE");
  const [score, setScore] = useState(75);
  const [revealed, setRevealed] = useState<boolean[]>([]);

  const useMd = trackKey === "diag";
  const layers = useMemo(() => (q ? buildLayers(q, useMd) : []), [q, useMd]);

  useEffect(() => {
    setRevealed(new Array(layers.length).fill(false));
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Interview</h2>
          <p className="mt-1 text-sm text-[var(--text-dim)]">
            Q bank + progressive reveal · {masteredAll}/{totalQ} mastered overall
          </p>
        </div>
        <div className={`${card} flex items-center gap-3 py-3`}>
          <ProgressRing value={trackPct} size={56}>
            <span className="text-[11px] font-semibold">{trackMastered}</span>
          </ProgressRing>
          <div className="text-xs text-[var(--text-dim)]">
            this track · {track.questions.length} Qs
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {TRACK_ORDER.map((t) => {
          const tr = QBANK[t];
          const m = tr.questions.filter((qq) => status[qq.id] === "mastered").length;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setPos(t, 0)}
              className={`rounded-lg border px-2 py-1 text-xs ${
                trackKey === t
                  ? "border-[var(--cyan)] text-[var(--cyan)]"
                  : "border-[var(--hairline)] text-[var(--text-mid)]"
              }`}
            >
              {tr.short}{" "}
              <span className="text-[var(--text-dim)]">
                {m}/{tr.questions.length}
              </span>
            </button>
          );
        })}
      </div>

      {q ? (
        <Flashcard
          meta={`${track.label} · ${idx + 1}/${track.questions.length}${
            status[q.id] ? ` · ${status[q.id]}` : ""
          }`}
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
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-lg border border-[var(--hairline)] px-3 py-1 text-sm"
                disabled={idx <= 0}
                onClick={() => setPos(trackKey, idx - 1)}
              >
                Prev
              </button>
              <button
                type="button"
                className="rounded-lg border border-[var(--hairline)] px-3 py-1 text-sm"
                disabled={idx >= track.questions.length - 1}
                onClick={() => setPos(trackKey, idx + 1)}
              >
                Next
              </button>
              <button
                type="button"
                className="rounded-lg border border-[var(--green)] px-3 py-1 text-sm text-[var(--green)]"
                onClick={() => setStatus(q.id, "mastered")}
              >
                Mastered {status[q.id] === "mastered" ? "✓" : ""}
              </button>
              <button
                type="button"
                className="rounded-lg border border-[var(--yellow)] px-3 py-1 text-sm text-[var(--yellow)]"
                onClick={() => setStatus(q.id, "review")}
              >
                Review
              </button>
              {status[q.id] ? (
                <button
                  type="button"
                  className="rounded-lg border border-[var(--hairline)] px-3 py-1 text-sm text-[var(--text-dim)]"
                  onClick={() => setStatus(q.id, null)}
                >
                  Clear
                </button>
              ) : null}
            </div>
          }
        />
      ) : (
        <div className={`${card} text-sm text-[var(--text-dim)]`}>No questions in track.</div>
      )}

      <div className={card}>
        <h3 className="mb-2 font-medium">Quick rubric log</h3>
        <p className="mb-3 text-xs text-[var(--text-dim)]">
          Counts toward readiness interview floor when score ≥70 and role matches.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            className={inputClass}
            placeholder="Task title"
            value={task}
            onChange={(e) => setTask(e.target.value)}
          />
          <select
            className={inputClass}
            value={role}
            onChange={(e) => setRole(e.target.value as "SWE" | "MLE")}
          >
            <option value="SWE">SWE</option>
            <option value="MLE">MLE</option>
          </select>
          <label className="text-xs text-[var(--text-dim)] sm:col-span-2">
            Final score: {score}
            <input
              type="range"
              min={0}
              max={100}
              value={score}
              onChange={(e) => setScore(Number(e.target.value))}
              className="mt-1 w-full"
            />
          </label>
        </div>
        <button
          type="button"
          className="mt-3 rounded-lg bg-[var(--cyan)]/15 px-3 py-1.5 text-sm text-[var(--cyan)]"
          onClick={() => {
            if (!task.trim()) return;
            const level =
              score >= 90
                ? "Level III"
                : score >= 80
                  ? "Strong Level II"
                  : score >= 70
                    ? "Level II"
                    : "Level I";
            addEntry({
              task: task.trim(),
              taskType: "knowledge",
              primaryRole: role,
              finalScore: score,
              demonstratedLevel: level,
              qualifyingDemonstratedLevel: score >= 70 ? "L2" : "L1",
              date: todayIso(),
              quickLog: true,
            });
            setTask("");
          }}
        >
          Log scored session
        </button>
        <ul className="mt-4 max-h-40 space-y-1 overflow-auto text-sm text-[var(--text-mid)]">
          {entries.slice(0, 12).map((e) => (
            <li key={e.id}>
              {e.date} · {e.task || "—"} · {e.primaryRole || "?"} · {e.demonstratedLevel || "?"} ·{" "}
              {e.finalScore ?? "—"}
            </li>
          ))}
          {entries.length === 0 ? (
            <li className="text-[var(--text-dim)]">No rubric entries yet.</li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}

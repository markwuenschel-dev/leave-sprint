"use client";

/**
 * Q Bank retrain queue on the Gaps board: every question marked "review"
 * (retrain) across all tracks, with jump-back-to-card and quick status actions.
 * Complements the rubric-entry gap columns — this is recall debt, not graded
 * gap debt.
 */

import { useMemo } from "react";
import { QBANK, type TrackKey } from "@waypoint/qbank";
import { useWaypointStore } from "@/lib/store";
import { resolveDeck } from "@/lib/qbankDeck";
import { card } from "../surfaces/shared";

export interface ReviewItem {
  track: TrackKey;
  trackShort: string;
  id: string;
  q: string;
  /** Position of this question in the track's current deck order. */
  deckIdx: number;
}

export function useQBankReviewItems(): ReviewItem[] {
  const status = useWaypointStore((s) => s.qbankStatus);
  const order = useWaypointStore((s) => s.qbankOrder);
  return useMemo(() => {
    const out: ReviewItem[] = [];
    for (const track of Object.keys(QBANK) as TrackKey[]) {
      const deck = resolveDeck(QBANK[track].questions, order[track]);
      deck.forEach((q, deckIdx) => {
        if (status[q.id] === "review") {
          out.push({ track, trackShort: QBANK[track].short, id: q.id, q: q.q, deckIdx });
        }
      });
    }
    return out;
  }, [status, order]);
}

export function QBankReviewPanel({
  onOpen,
}: {
  /** Jump to the card: switch to the Q Bank tab at this track/deck position. */
  onOpen: (track: TrackKey, deckIdx: number) => void;
}) {
  const setStatus = useWaypointStore((s) => s.setQBankStatus);
  const items = useQBankReviewItems();

  if (!items.length) return null;

  return (
    <div className={card}>
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs font-medium uppercase tracking-wider text-[var(--yellow)]">
          Q Bank · marked for retrain
        </div>
        <div className="font-mono text-xs text-[var(--text-dim)]">{items.length}</div>
      </div>
      <div className="space-y-2">
        {items.map((it) => (
          <div
            key={it.id}
            className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--hairline)] bg-[var(--bg-elev)] px-3 py-2"
          >
            <span className="rounded border border-[var(--yellow)]/40 px-1.5 py-0.5 font-mono text-[10px] text-[var(--yellow)]">
              {it.trackShort}
            </span>
            <span className="min-w-0 flex-1 truncate text-xs text-[var(--text)]">{it.q}</span>
            <div className="flex shrink-0 gap-1">
              <button
                type="button"
                onClick={() => onOpen(it.track, it.deckIdx)}
                className="rounded border border-[var(--cyan)]/40 px-2 py-0.5 text-[10px] text-[var(--cyan)] hover:bg-[var(--tint-cyan)]"
              >
                open
              </button>
              <button
                type="button"
                onClick={() => setStatus(it.id, "mastered")}
                className="rounded border border-[var(--green)]/40 px-2 py-0.5 text-[10px] text-[var(--green)] hover:bg-[var(--tint-green)]"
              >
                mastered
              </button>
              <button
                type="button"
                onClick={() => setStatus(it.id, null)}
                className="rounded border border-[var(--hairline)] px-2 py-0.5 text-[10px] text-[var(--text-dim)] hover:border-[var(--hairline-strong)]"
              >
                clear
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

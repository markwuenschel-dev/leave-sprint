/**
 * Q Bank deck ordering. A track's deck is its questions in the user's stored
 * order (from Shuffle / mastered-to-end); with no stored order it's the natural
 * data order. Stale ids are dropped, new bank questions append in natural order,
 * so a stored order survives bank expansions.
 */

import type { QBankQuestion, QBankStatus } from "@waypoint/qbank";

export function resolveDeck(
  questions: QBankQuestion[],
  order?: string[],
): QBankQuestion[] {
  if (!order?.length) return questions;
  const byId = new Map(questions.map((q) => [q.id, q]));
  const out: QBankQuestion[] = [];
  const seen = new Set<string>();
  for (const id of order) {
    const q = byId.get(id);
    if (q && !seen.has(id)) {
      out.push(q);
      seen.add(id);
    }
  }
  for (const q of questions) if (!seen.has(q.id)) out.push(q);
  return out;
}

/**
 * Randomized deck: unmastered questions shuffled up front, mastered ones
 * shuffled after them — a fresh shuffle never buries new material behind
 * already-mastered cards.
 */
export function shuffledDeckIds(
  questions: QBankQuestion[],
  status: Record<string, QBankStatus>,
): string[] {
  const fresh: string[] = [];
  const mastered: string[] = [];
  for (const q of questions) {
    (status[q.id] === "mastered" ? mastered : fresh).push(q.id);
  }
  return [...shuffle(fresh), ...shuffle(mastered)];
}

/** Move one id to the end, keeping everything else in place (no reshuffle). */
export function moveIdToEnd(deckIds: string[], id: string): string[] {
  if (!deckIds.includes(id)) return deckIds;
  return [...deckIds.filter((x) => x !== id), id];
}

function shuffle(ids: string[]): string[] {
  const a = [...ids];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

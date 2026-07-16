/** Markdown/JSON export of Q Bank questions — full L1 + follow-up + L2/L3 stack. */

import type { QBankQuestion, QBankTrack, TrackKey } from './types';

/** Section order matches the Flashcard's buildLayers() reveal order. */
export function questionToMarkdown(q: QBankQuestion): string {
  const lines: string[] = [`## ${q.q}`];
  if (q.code) lines.push('', '```' + (q.lang ?? ''), q.code, '```');

  const answer = q.compressed || q.anchor;
  if (answer) lines.push('', '**Answer**', '', answer);
  if (q.detail) lines.push('', '**Full detail**', '', q.detail);
  if (q.followup) {
    lines.push('', '**Follow-up**', '', q.followup);
    if (q.followupAnswer) lines.push('', q.followupAnswer);
  }
  if (q.tie) lines.push('', '**Project tie-in**', '', q.tie);
  if (q.trap) lines.push('', '**Trap to avoid**', '', q.trap);
  if (q.l2q) {
    lines.push('', '**Level II stretch**', '', q.l2q);
    if (q.l2a) lines.push('', q.l2a);
  }
  if (q.l3q) {
    lines.push('', '**Level III stretch**', '', q.l3q);
    if (q.l3a) lines.push('', q.l3a);
  }
  return lines.join('\n');
}

export function trackToMarkdown(track: QBankTrack): string {
  return [`# ${track.label}`, ...track.questions.map(questionToMarkdown)].join('\n\n---\n\n');
}

export function bankToMarkdown(bank: Record<TrackKey, QBankTrack>): string {
  return (Object.values(bank) as QBankTrack[]).map(trackToMarkdown).join('\n\n---\n\n');
}

export function questionsToJson(qs: QBankQuestion[]): string {
  return JSON.stringify(qs, null, 2);
}

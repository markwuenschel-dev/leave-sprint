/**
 * QBANK identity invariants — uniqueness and track-map parity.
 * Does not snapshot question prose or answers.
 */

import { describe, expect, it } from 'vitest';

import { domainToTrack, QBANK, QB_TRACK_MAP, type TrackKey } from '@waypoint/qbank';

/**
 * Runtime stand-in for the TrackKey union. The annotation fails the typecheck
 * if the union grows or shrinks without this list.
 */
const TRACK_KEYS: Record<TrackKey, true> = {
  swe: true,
  mle: true,
  ds: true,
  de: true,
  react: true,
  sql: true,
  sdlc: true,
  diag: true,
  bi: true,
};

describe('qbank identity invariants', () => {
  it('every question id is unique across all tracks', () => {
    const owner = new Map<string, string>();
    const duplicates: string[] = [];
    for (const [track, bank] of Object.entries(QBANK)) {
      for (const question of bank.questions) {
        const prev = owner.get(question.id);
        if (prev !== undefined) duplicates.push(`${question.id} (${prev} + ${track})`);
        else owner.set(question.id, track);
      }
    }
    expect(duplicates).toEqual([]);
  });

  it('Object.keys(QBANK) equals Object.keys(QB_TRACK_MAP) as a set', () => {
    expect(new Set(Object.keys(QBANK))).toEqual(new Set(Object.keys(QB_TRACK_MAP)));
  });

  it('every TrackKey in the type union is present on both maps', () => {
    const qbankKeys = new Set(Object.keys(QBANK));
    const mapKeys = new Set(Object.keys(QB_TRACK_MAP));
    const missing: string[] = [];
    for (const k of Object.keys(TRACK_KEYS)) {
      if (!qbankKeys.has(k)) missing.push(`QBANK missing ${k}`);
      if (!mapKeys.has(k)) missing.push(`QB_TRACK_MAP missing ${k}`);
    }
    expect(missing).toEqual([]);
  });

  it('domainToTrack(QB_TRACK_MAP[k].domain) === k for each track', () => {
    const mismatches: string[] = [];
    for (const k of Object.keys(QB_TRACK_MAP) as TrackKey[]) {
      const got = domainToTrack(QB_TRACK_MAP[k].domain);
      if (got !== k) {
        mismatches.push(
          `${k}: domainToTrack(${JSON.stringify(QB_TRACK_MAP[k].domain)}) === ${JSON.stringify(got)}`,
        );
      }
    }
    expect(mismatches).toEqual([]);
  });
});

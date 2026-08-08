/**
 * normaliseEntry characterization — why the absent-vs-zero guard has to live at the
 * observations boundary and not here.
 *
 * `RubricEntry.universalScore` is a non-null `number` (types.ts:75) that feeds
 * `computeRaw` directly, so this layer has no way to say "unknown": an absent or
 * incomplete sub-score block necessarily lands as a literal 0. These tests pin that
 * limitation so nobody "fixes" it here by widening a persisted field, and so the
 * reason `checkObservations` rejects upstream stays legible.
 */

import { describe, expect, it } from 'vitest';

import { normaliseEntry } from './normalize';
import { RD } from './referenceData';
import type { UniversalSubScores } from './types';

const zeroSubs = (): UniversalSubScores =>
  Object.fromEntries(RD.universalDims.map((d) => [d.id, 0])) as UniversalSubScores;
const fullSubs = (): UniversalSubScores =>
  Object.fromEntries(RD.universalDims.map((d) => [d.id, d.max])) as UniversalSubScores;

describe('normaliseEntry — universalScore cannot express "unknown"', () => {
  it('totals a complete sub-score block', () => {
    expect(normaliseEntry({ task: 't', universalSubScores: fullSubs() }).universalScore).toBe(100);
  });

  it('scores an absent block, a partial block and a genuine all-zero block identically as 0', () => {
    const absent = normaliseEntry({ task: 't' });
    const partial = normaliseEntry({ task: 't', universalSubScores: { correctness: 25 } });
    const genuineZero = normaliseEntry({ task: 't', universalSubScores: zeroSubs() });

    expect(absent.universalScore).toBe(0);
    expect(partial.universalScore).toBe(0);
    expect(genuineZero.universalScore).toBe(0);
    // Same derived grade in all three cases — the false negative WP-C03 describes.
    expect(absent.finalScore).toBe(genuineZero.finalScore);
    expect(partial.finalScore).toBe(genuineZero.finalScore);
  });

  it('keeps the sub-score block itself null-vs-zeroed, which is the only surviving signal', () => {
    expect(normaliseEntry({ task: 't' }).universalSubScores).toBeNull();
    expect(normaliseEntry({ task: 't', universalSubScores: zeroSubs() }).universalSubScores).toEqual(zeroSubs());
  });

  it('prefers an explicitly supplied universalScore over the sub-score total', () => {
    expect(normaliseEntry({ task: 't', universalScore: 42, universalSubScores: fullSubs() }).universalScore).toBe(42);
  });

  it('keeps an explicit universalScore of 0 rather than falling back to the sub-total', () => {
    expect(normaliseEntry({ task: 't', universalScore: 0, universalSubScores: fullSubs() }).universalScore).toBe(0);
  });
});

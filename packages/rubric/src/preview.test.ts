import { describe, expect, it } from 'vitest';

import { previewGrade } from './preview';
import type { LevelScores } from './types';

const scores = (L1: number | null, L2: number | null, L3: number | null): LevelScores => ({
  L1,
  L2,
  L3,
});

describe('previewGrade', () => {
  it('pins the known L3 / computeRaw(0, 100) fixture from derive and scoring tests', () => {
    // derive.test.ts: deriveAnswerLevel(scores(85, 75, 72), { Correctness: 'Pass' }) → L3
    // derive.test.ts: deriveQualifyingLevel('L3', 'L3', 5, 0) → L3
    // derive.test.ts: deriveDemonstratedLevel(scores(85, 75, 72), 'L3') → Level III (72 < 90)
    // scoring.test.ts: computeRaw(0, 100) → 40; no subs → universal 0 → same final
    const preview = previewGrade({
      levelScores: scores(85, 75, 72),
      gates: { Correctness: 'Pass' },
      problemLevel: 'L3',
      difficulty: 5,
      assistanceLevel: 0,
      taskScore: 100,
      cap: null,
      penalties: 0,
    });
    expect(preview.derivedAnswer).toBe('L3');
    expect(preview.derivedQual).toBe('L3');
    expect(preview.answerLevel).toBe('L3');
    expect(preview.qualifying).toBe('L3');
    expect(preview.demonstrated).toBe('Level III');
    expect(preview.universal).toBe(0);
    expect(preview.finalScore).toBe(40);
    expect(preview.monotonicOk).toBe(true);
  });
});

/**
 * Derivation of the demonstrated-level outputs from the three level scores, per
 * spec §3.3 (Qualifying Evidence) and §14 (Demonstrated-Level Rules). The grader
 * may supply these directly; normalize.ts only calls these when they're absent.
 */

import { RD } from './referenceData';
import type { LevelScores, LevelId, Gates, UniversalSubScores, DemonstratedLevel } from './types';

const PASS = 70;
const RANK: Record<LevelId, number> = { L1: 1, L2: 2, L3: 3 };
const LEVELS: LevelId[] = ['L1', 'L2', 'L3'];

/** Minimum difficulty evidence required to qualify at each level (§14). */
const MIN_DIFF: Record<LevelId, number> = { L1: 1, L2: 3, L3: 4 };
/** Max assistance allowed to qualify at each level (from RD.levels). */
const MAX_ASSIST: Record<LevelId, number> = Object.fromEntries(
  RD.levels.map((l) => [l.id, l.maxAssistance]),
) as Record<LevelId, number>;

function scoreOf(levelScores: LevelScores, lvl: LevelId): number | null {
  return levelScores[lvl];
}

/** % of the six universal dimensions that fall below 60 (critical-competency check). */
function anyCriticalBelow60(subs: UniversalSubScores | null | undefined): boolean {
  if (!subs) return false;
  return RD.universalDims.some((d) => {
    const v = subs[d.id];
    if (v === undefined || v === null) return false;
    return (Number(v) / d.max) * 100 < 60;
  });
}

/**
 * Answer level = highest level whose score ≥70 AND passes the Correctness gate
 * AND has no critical universal competency below 60 (§14).
 */
export function deriveAnswerLevel(levelScores: LevelScores, gates: Gates, subs?: UniversalSubScores | null): LevelId | '' {
  if (gates.Correctness && gates.Correctness !== 'Pass') return '';
  if (anyCriticalBelow60(subs)) return '';
  for (const lvl of [...LEVELS].reverse()) {
    const s = scoreOf(levelScores, lvl);
    if (s !== null && s >= PASS) return lvl;
  }
  return '';
}

/**
 * Qualifying demonstrated level = min(answerLevel, problemLevel), then dropped to
 * the highest level whose difficulty/assistance evidence is actually met (§14).
 */
export function deriveQualifyingLevel(
  answerLevel: LevelId | '',
  problemLevel: LevelId | '',
  difficulty: number,
  assistanceLevel: number,
): LevelId | '' {
  if (!answerLevel) return '';
  const cap = problemLevel ? Math.min(RANK[answerLevel], RANK[problemLevel]) : RANK[answerLevel];
  for (let r = cap; r >= 1; r--) {
    const lvl = LEVELS[r - 1];
    if (difficulty >= MIN_DIFF[lvl] && assistanceLevel <= MAX_ASSIST[lvl]) return lvl;
  }
  return '';
}

/** Map the qualifying level + its score onto the 8-value demonstrated scale (§21.4). */
export function deriveDemonstratedLevel(levelScores: LevelScores, qualifyingLevel: LevelId | ''): DemonstratedLevel {
  if (qualifyingLevel) {
    const s = scoreOf(levelScores, qualifyingLevel) ?? 0;
    const strong = s >= 90;
    if (qualifyingLevel === 'L3') return strong ? 'Strong Level III' : 'Level III';
    if (qualifyingLevel === 'L2') return strong ? 'Strong Level II' : 'Level II';
    return strong ? 'Strong Level I' : 'Level I';
  }
  const best = Math.max(levelScores.L1 ?? 0, levelScores.L2 ?? 0, levelScores.L3 ?? 0);
  return best >= 50 ? 'Emerging Level I' : 'Below Level I';
}

/** Monotonic requirement: L3 ≤ L2 ≤ L1 (spec §3.2). Nulls are ignored. */
export function validateMonotonic(levelScores: LevelScores): boolean {
  const { L1, L2, L3 } = levelScores;
  if (L2 !== null && L1 !== null && L2 > L1) return false;
  if (L3 !== null && L2 !== null && L3 > L2) return false;
  if (L3 !== null && L1 !== null && L3 > L1) return false;
  return true;
}

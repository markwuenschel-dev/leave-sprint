/**
 * Live grade preview for the form. One function so the UI does not import
 * derive* / computeRaw internals.
 */

import {
  deriveAnswerLevel,
  deriveDemonstratedLevel,
  deriveQualifyingLevel,
  validateMonotonic,
} from './derive';
import { computeFinal, computeRaw, subTotal } from './scoring';
import type { DemonstratedLevel, Gates, LevelId, LevelScores, UniversalSubScores } from './types';

export interface PreviewGradeInput {
  levelScores: LevelScores;
  gates: Gates;
  subs?: UniversalSubScores | null;
  problemLevel: LevelId | '';
  difficulty: number;
  assistanceLevel: number;
  taskScore?: number;
  cap?: number | null;
  penalties?: number | string;
  /** When set, used instead of the derived answer (form override path). */
  overrideAnswer?: LevelId | '';
  /** When set, used instead of the derived qualifying level (form override path). */
  overrideQualifying?: LevelId | '';
}

export interface PreviewGrade {
  derivedAnswer: LevelId | '';
  derivedQual: LevelId | '';
  answerLevel: LevelId | '';
  qualifying: LevelId | '';
  demonstrated: DemonstratedLevel;
  universal: number;
  finalScore: number;
  monotonicOk: boolean;
}

export function previewGrade(input: PreviewGradeInput): PreviewGrade {
  const derivedAnswer = deriveAnswerLevel(input.levelScores, input.gates, input.subs);
  const derivedQual = deriveQualifyingLevel(
    derivedAnswer,
    input.problemLevel,
    input.difficulty,
    input.assistanceLevel,
  );
  const answerLevel = input.overrideAnswer !== undefined ? input.overrideAnswer : derivedAnswer;
  const qualifying = input.overrideQualifying !== undefined ? input.overrideQualifying : derivedQual;
  const demonstrated = deriveDemonstratedLevel(input.levelScores, qualifying);
  const universal = subTotal(input.subs) ?? 0;
  const finalScore = computeFinal(
    computeRaw(universal, input.taskScore ?? 0),
    input.cap ?? null,
    input.penalties ?? 0,
  );
  return {
    derivedAnswer,
    derivedQual,
    answerLevel,
    qualifying,
    demonstrated,
    universal,
    finalScore,
    monotonicOk: validateMonotonic(input.levelScores),
  };
}

/** Pure D1–D5 difficulty scoring (8 dimensions × 0–2). */

export const DIFFICULTY_DIMENSIONS = [
  { id: 'scope', label: 'Scope', options: ['One function', 'Multiple files', 'Multiple layers / services'] },
  { id: 'observe', label: 'Observability', options: ['Immediate failure', 'Clearly wrong output', 'Plausible successful output'] },
  { id: 'repro', label: 'Reproduction', options: ['Direct', 'Special input', 'Sequence / state dependent'] },
  { id: 'testq', label: 'Test quality', options: ['Accurate failing test', 'Missing / incomplete test', 'Misleading green test'] },
  { id: 'rcdist', label: 'Root-cause distance', options: ['Same line / function', 'Different component', 'Far from symptom'] },
  { id: 'contract', label: 'Contract complexity', options: ['Local behavior', 'One interface', 'Multiple contracts / invariants'] },
  { id: 'fixcoord', label: 'Fix coordination', options: ['Local edit', 'Code plus tests', 'Multi-layer / state-safe change'] },
  { id: 'falselead', label: 'False-lead density', options: ['Low', 'Moderate', 'Several plausible causes'] },
] as const;

const THRESHOLDS: [number, number, number][] = [
  [0, 2, 1],
  [3, 5, 2],
  [6, 8, 3],
  [9, 12, 4],
  [13, 16, 5],
];

export function difficultyLevelFromTotal(total: number): number {
  for (const [lo, hi, level] of THRESHOLDS) {
    if (total >= lo && total <= hi) return level;
  }
  return 5;
}

export function difficultyTotal(scores: Record<string, number>): number {
  return Object.values(scores).reduce((s, v) => s + v, 0);
}

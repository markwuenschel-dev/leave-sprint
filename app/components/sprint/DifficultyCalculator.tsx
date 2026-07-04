"use client";

import { useState } from "react";

const DIMENSIONS = [
  { id: 'scope',     label: 'Scope',               options: ['One function', 'Multiple files', 'Multiple layers / services'] },
  { id: 'observe',   label: 'Observability',        options: ['Immediate failure', 'Clearly wrong output', 'Plausible successful output'] },
  { id: 'repro',     label: 'Reproduction',         options: ['Direct', 'Special input', 'Sequence / state dependent'] },
  { id: 'testq',     label: 'Test quality',         options: ['Accurate failing test', 'Missing / incomplete test', 'Misleading green test'] },
  { id: 'rcdist',    label: 'Root-cause distance',  options: ['Same line / function', 'Different component', 'Far from symptom'] },
  { id: 'contract',  label: 'Contract complexity',  options: ['Local behavior', 'One interface', 'Multiple contracts / invariants'] },
  { id: 'fixcoord',  label: 'Fix coordination',     options: ['Local edit', 'Code plus tests', 'Multi-layer / state-safe change'] },
  { id: 'falselead', label: 'False-lead density',   options: ['Low', 'Moderate', 'Several plausible causes'] },
];

const THRESHOLDS = [
  [0, 2, 1], [3, 5, 2], [6, 8, 3], [9, 12, 4], [13, 16, 5]
];

function calculateLevel(total: number): number {
  for (const [lo, hi, level] of THRESHOLDS) {
    if (total >= lo && total <= hi) return level;
  }
  return 5;
}

interface DifficultyCalculatorProps {
  /** Fires whenever all 8 dimensions are scored, with the computed level + total. */
  onResult?: (level: number, total: number) => void;
}

export function DifficultyCalculator({ onResult }: DifficultyCalculatorProps = {}) {
  const [scores, setScores] = useState<Record<string, number>>({});
  const [result, setResult] = useState<{ level: number; total: number } | null>(null);

  const updateScore = (id: string, score: number) => {
    const newScores = { ...scores, [id]: score };
    setScores(newScores);

    const total = Object.values(newScores).reduce((sum, v) => sum + v, 0);
    const level = calculateLevel(total);
    setResult({ level, total });
    if (onResult && Object.keys(newScores).length === DIMENSIONS.length) {
      onResult(level, total);
    }
  };

  const reset = () => {
    setScores({});
    setResult(null);
  };

  const filled = Object.keys(scores).length;
  const total = Object.values(scores).reduce((s, v) => s + v, 0);
  const level = result ? result.level : filled === 8 ? calculateLevel(total) : null;

  return (
    <div className="card-glass p-6 max-w-4xl mx-auto">
      <div className="section-title mb-4">DIFFICULTY CALCULATOR (D1–D5)</div>
      <p className="text-sm text-[var(--text-mid)] mb-6">
        Score each dimension 0–2 based on the real bug / task. Total determines difficulty level.
      </p>

      <div className="space-y-4">
        {DIMENSIONS.map((dim) => (
          <div key={dim.id} className="rounded-2xl border border-white/10 bg-[#161a22] p-5">
            <div className="font-medium mb-3">{dim.label}</div>
            <div className="flex flex-wrap gap-2">
              {dim.options.map((opt, score) => (
                <button
                  key={score}
                  onClick={() => updateScore(dim.id, score)}
                  className={`px-4 py-2 rounded-xl text-sm border transition-all flex-1 min-w-[140px] text-left ${
                    scores[dim.id] === score
                      ? "border-[var(--cyan)] bg-[var(--cyan)]/10 text-[var(--cyan)]"
                      : "border-white/10 hover:border-white/30"
                  }`}
                >
                  <span className="font-mono text-xs mr-2 text-[var(--text-dim)]">{score}</span>
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Result */}
      {result && (
        <div className="mt-8 p-6 rounded-3xl border border-[var(--cyan)]/30 bg-[var(--cyan)]/5 text-center">
          <div className="text-sm text-[var(--text-dim)]">DIFFICULTY LEVEL</div>
          <div className="text-7xl font-bold tracking-tighter text-[var(--cyan)] mt-1">D{result.level}</div>
          <div className="mt-2 text-lg">
            Score: <span className="font-mono">{result.total}/16</span>
          </div>
          <div className="text-xs text-[var(--text-mid)] mt-4">
            D1 = Trivial &nbsp;•&nbsp; D3 = Moderate &nbsp;•&nbsp; D5 = Very Hard
          </div>
        </div>
      )}

      <div className="mt-6 flex justify-center">
        <button onClick={reset} className="btn text-sm">Reset Calculator</button>
      </div>
    </div>
  );
}
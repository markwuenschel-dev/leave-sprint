/**
 * Retired-tag → canonical alias maps (spec §17.21.7). Applied on ingest so
 * imported legacy/variant tags normalize to the canonical label set. Unmapped
 * tags pass through unchanged.
 */

const weaknessAliasMap: Record<string, string> = {
  'Mechanism not explained': 'Mechanism gap',
  'Mechanism partially explained': 'Mechanism gap',
  'Operational mechanism partially implicit': 'Mechanism gap',
  'Shallow reasoning': 'Mechanism gap',
  'Explanation unclear': 'Terminology imprecision',
  'Thin tradeoffs': 'Thin tradeoff analysis',
  'Alternatives not considered': 'Thin tradeoff analysis',
  'tradeoff missing': 'Thin tradeoff analysis',
  'Tradeoff missing': 'Thin tradeoff analysis',
  'Scope or blast radius missed': 'Scope boundary missed',
  'problem-level cap': 'Scope boundary missed',
  'Missing failure handling': 'Failure handling gap',
  'Insufficient validation': 'Validation gap',
  'No test strategy': 'Validation gap',
  'No explicit test evidence': 'Insufficient evidence',
  'No test evidence shown': 'Insufficient evidence',
  'Evidence gaps': 'Insufficient evidence',
  'Verification strategy thin': 'Validation gap',
  'Missed edge cases': 'Edge-case gap',
  'No complexity analysis stated': 'Complexity analysis missing',
  'Excessive prompting': 'Overprompted answer',
  'Assisted retry': 'Overprompted answer',
  'Assisted core mechanism': 'Overprompted answer',
  'answer-after-coaching': 'Overprompted answer',
  'answer-key-exposure': 'Overprompted answer',
  'answer-key exposure': 'Overprompted answer',
  'low-independent-recall': 'Overprompted answer',
  'Implementation detail incomplete': 'Implementation detail gap',
  'incomplete-definition': 'Definition gap',
  'Precision gap': 'Terminology imprecision',
  'Minor terminology imprecision': 'Terminology imprecision',
  'imprecise-terminology': 'Terminology imprecision',
  'imprecise terminology': 'Terminology imprecision',
  'minor verbal imprecision': 'Terminology imprecision',
  'bootstrap wording imprecision': 'Terminology imprecision',
  'limited precision': 'Terminology imprecision',
  'Needs interview phrasing polish': 'Interview phrasing gap',
  'limited example depth': 'Application gap',
  'generalization not explicit': 'Application gap',
  'follow-up after discussion': 'Overprompted answer',
  'Did not identify in-place optimization': 'Implementation detail gap',
  'Minor code cleanup': 'Implementation detail gap',
  'validation-set purpose incomplete': 'Validation gap',
  'test-set independence missing': 'Validation gap',
  'test-set optimism wording': 'Validation gap',
  'cross-validation nuance': 'Validation gap',
  'overfitting not explicit': 'Mechanism gap',
  'minor temporal-split wording issue': 'Terminology imprecision',
  'autocorrelation not explicit': 'Mechanism gap',
  'could name out-of-time validation more directly': 'Terminology imprecision',
  'time-series leakage mechanism incomplete': 'Mechanism gap',
  'group leakage mechanism incomplete': 'Mechanism gap',
  'split-strategy alternatives missing': 'Thin tradeoff analysis',
  'minor causal attribution wording': 'Terminology imprecision',
  'minor distribution wording': 'Terminology imprecision',
  'bias terminology missing': 'Terminology imprecision',
  'causal attribution vs sampling issue not fully separated': 'Scope boundary missed',
  'needs sharper analytic conclusion': 'Interview phrasing gap',
  'stream producer/consumer wording': 'Terminology imprecision',
  'advanced streaming mechanics missing': 'Mechanism gap',
  'bounded-vs-unbounded gap': 'Mechanism gap',
  'streaming mental model incomplete': 'Mechanism gap',
  'latency framing mismatch': 'Scope boundary missed',
  'polling vs event stream confusion': 'Incorrect reasoning',
  'windowing concepts missing': 'Mechanism gap',
  'SLA wording not explicit': 'Terminology imprecision',
  'throughput-cost tradeoff could be named': 'Thin tradeoff analysis',
  'micro-batch terminology missing': 'Terminology imprecision',
};

const gapTypeAliasMap: Record<string, string> = {
  precision: 'Communication gap',
  'evaluation nuance': 'Verification gap',
  'statistical precision': 'Verification gap',
  'method limitation nuance': 'Tradeoff gap',
  'analytics framing': 'Application gap',
  terminology: 'Communication gap',
  'Optimization gap': 'Application gap',
  'conceptual recall': 'Recall gap',
  'mechanism explanation': 'Mechanism gap',
  'example generation': 'Application gap',
  'example completeness': 'Application gap',
  'independent recall': 'Recall gap',
  'conceptual precision': 'Conceptual gap',
  'evaluation framing': 'Verification gap',
  mechanism: 'Mechanism gap',
  'evaluation design': 'Verification gap',
  'causal attribution nuance': 'Scope gap',
  'distributed systems nuance': 'Scope gap',
  'streaming mechanics': 'Mechanism gap',
  'conceptual mechanism': 'Mechanism gap',
  'data engineering vocabulary': 'Communication gap',
  'architecture framing': 'Scope gap',
  'production framing polish': 'Communication gap',
};

const knowledgeAliasMap: Record<string, string> = {
  'Docker image vs container': 'Docker image versus running container',
  'Docker image vs running container': 'Docker image versus running container',
  'Dockerfile vs docker-compose.yml': 'Dockerfile versus docker-compose.yml',
  'Host port vs container port': 'Host port versus container port',
  'temporal leakage': 'Temporal leakage',
  'out-of-time validation': 'Time-series cross-validation',
  'event time': 'Event time versus processing time',
  watermarks: 'Watermarks and late-arriving data',
  backpressure: 'Backpressure',
  'micro-batching': 'Micro-batch latency tradeoff',
  'selection mechanism': 'Review-selection bias',
  representativeness: 'Population versus sample distinction',
  'bootstrap uncertainty vs bias': 'Confidence interval interpretation',
  'Spring API boundary vs framework-owned concept': 'Spring API boundary versus framework-owned concept',
  'Spring API boundary vs Spring framework feature': 'Spring API boundary versus framework-owned concept',
  'Correlation ID vs trace ID': 'Correlation ID versus trace ID',
};

const MAPS = {
  weaknessTags: weaknessAliasMap,
  gapTypes: gapTypeAliasMap,
  knowledgeGapTags: knowledgeAliasMap,
} as const;

/** Normalize a tag array through the alias map for its class, deduped. */
export function normalizeTags(tags: unknown, cls: keyof typeof MAPS): string[] {
  if (!Array.isArray(tags)) return [];
  const map = MAPS[cls];
  const out = new Set<string>();
  for (const t of tags) {
    if (typeof t !== 'string') continue;
    out.add(map[t] ?? t);
  }
  return Array.from(out);
}

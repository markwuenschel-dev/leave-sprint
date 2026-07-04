/**
 * KGTAG_CLUSTERS — rolls the atomic knowledgeGapTags recorded on assessments up
 * into named display clusters for the analytics dashboard. Ported verbatim.
 */

export const KGTAG_CLUSTERS: Record<string, string[]> = {
  'React / TS UI state': [
    'React state ownership', 'Nearest common ancestor state placement', 'Single source of truth for shared UI state',
    'Local state versus context versus state library', 'Render-scope and rerender tradeoffs',
    'Controlled versus uncontrolled input behavior', 'React value versus defaultValue lifecycle',
    'useEffect external synchronization boundary', 'Effect cleanup lifecycle', 'Effect dependency and stale closure behavior',
    'useReducer state-transition model', 'Reducer immutability and side-effect boundary', 'State machine versus boolean flags',
    'useMemo versus useCallback distinction', 'Memoization as performance hint not correctness guarantee',
    'React profiling before memoization', 'TypeScript discriminated union state modeling', 'TypeScript narrowing',
    'Exhaustive union handling with never', 'Runtime API validation boundary', 'Type assertion versus runtime validation',
    'Frontend-backend contract evolution', 'API request loading success error states', 'Duplicate submit prevention',
    'Optimistic update rollback', 'Idempotency key and stale version handling', 'Large form field-level subscription strategy',
  ],
  'SQL / data modeling': [
    'Primary key uniqueness and stability', 'Composite key design', 'Surrogate key versus natural key',
    'Integer key versus UUID tradeoff', 'Key locality and index behavior', 'Normalization versus denormalization tradeoffs',
    'Update insert delete anomalies', 'Read/write model consistency', 'Foreign key constraint versus ID column',
    'Many-to-many join table modeling', 'Database-enforced versus application-enforced integrity',
    'Database index read-write tradeoff', 'Composite index column order', 'EXPLAIN plan interpretation',
    'Inner join versus left join row preservation', 'Left join filter placement', 'Join duplicate row diagnosis',
    'GROUP BY output grain', 'WHERE versus HAVING distinction', 'Window function versus GROUP BY',
    'Deterministic latest-row selection', 'Transaction rollback and atomicity', 'Optimistic locking version check',
    'Valid state transitions under concurrency',
  ],
  'CI/CD and Docker': [
    'Continuous integration practice definition', 'Configured CI gates versus business correctness', 'CI coverage limitations',
    'Merge-blocking versus deployment checks', 'Pull request versus git pull distinction', 'Polyglot monorepo affected-change detection',
    'Docker image versus running container', 'Container runtime isolation boundary', 'Host kernel sharing',
    'Docker Compose versus production orchestration', 'Dockerfile versus docker-compose.yml', 'Compose service discovery',
    'Compose build versus run responsibilities', 'Host port versus container port', 'Docker internal DNS',
    'Runtime configuration ownership', 'Environment variables as runtime configuration', 'Secure container image construction',
    'Container health checks and restart diagnosis', 'Infrastructure as code versus setup script', 'Infrastructure drift detection',
    'Environment module and state separation', 'Secret rotation and revocation', 'CI secret exposure boundary',
    'Health check liveness versus readiness', 'Dependency outage health-check cascade risk', 'Deployment rollback artifact versus rebuild',
    'Backward-compatible schema rollout', 'Canary versus blue-green deployment', 'Progressive delivery rollback threshold',
    'Logs metrics traces distinction', 'Correlation ID versus trace ID', 'MDC logging context', 'OpenTelemetry trace/span model',
    'RAG observability dimensions',
  ],
  'Spring API boundaries': [
    'Spring controller-service-client boundaries', 'DTO validation versus domain invariants', 'Java-Python bridge contract',
    'HTTP error translation', 'Spring controller-advice registration', 'Spring API boundary versus framework-owned concept',
    'Subprocess stdout/stderr capture', 'Subprocess envelope/environment propagation', 'React-visible error correlation ID',
    'OpenAPI contract documentation',
  ],
  'ML / RAG evaluation': [
    'Training versus inference distinction', 'Model objective versus business objective', 'Cluster validity versus operational usefulness',
    'Feature versus label distinction', 'Prediction-time feature availability', 'Data leakage through future information',
    'Train/validation/test split ownership', 'Temporal leakage', 'Group leakage', 'Duplicate-record leakage',
    'Overfitting versus underfitting pattern', 'Classification versus regression framing', 'Precision versus recall tradeoff',
    'F1 limitation under business-cost asymmetry', 'Baseline model comparison', 'Keyword baseline versus embedding retrieval',
    'Preprocessing pipeline ownership', 'Cross-validation fold independence', 'Time-series cross-validation', 'Model serving contract',
    'Inference-time missing feature handling', 'Data drift versus concept drift', 'RAG versus fine-tuning boundary',
    'RAG hallucination despite correct corpus', 'Retrieval intent versus corpus vocabulary mapping', 'RAG evaluation hit_rate@k versus MRR',
    'LLM boundary versus deterministic policy', 'Human-in-the-loop validation boundary', 'Experiment reproducibility lineage',
    'Learned parameters versus explicit rules', 'Deterministic guardrails versus probabilistic predictions', 'Hard policy constraints',
    'Rules-based versus learned pattern boundary',
  ],
  'Data engineering pipelines': [
    'Pipeline versus one-off script distinction', 'Pipeline input/output contract', 'ETL versus ELT transformation boundary',
    'Immutable raw layer', 'Curated layer as analyst-facing contract', 'Lineage, replay, and backfill',
    'Batch versus streaming boundary', 'Micro-batch latency tradeoff', 'Streaming bounded versus unbounded data',
    'Event time versus processing time', 'Watermarks and late-arriving data', 'Backpressure',
    'Source-to-target mapping contract', 'Controlled vocabulary drift', 'Operational database versus warehouse versus lake',
    'Fact table grain definition', 'Dimension table context role', 'Data-quality dimensions', 'Blocking versus warning data-quality checks',
    'Pipeline idempotency', 'Content-hash deduplication', 'Incremental load watermark safety', 'Late-arriving data overlap window',
    'Orchestration versus transformation logic', 'Cron versus orchestrator boundary', 'Partitioning versus indexing',
    'Schema evolution compatibility', 'Pipeline failure classification', 'Preserve-last-good extract staleness',
    'Backfill partitioning and source-load control', 'Pipeline production-readiness criteria',
  ],
  'Statistics / DS framing': [
    'Business decision to analytical question translation', 'Metric denominator and timeframe definition', 'Baseline and population definition',
    'Population versus sample distinction', 'Review-selection bias', 'Mean median mode distribution choice', 'Median versus tail-percentile interpretation',
    'Variance and standard deviation interpretation', 'Control limits versus specification limits', 'Correlation versus causation distinction',
    'Confounder and causal language boundary', 'Hypothesis test p-value interpretation', 'Statistical significance versus practical significance',
    'Confidence interval interpretation', 'Missingness mechanism classification', 'Informative missingness', 'Outlier removal versus rare valid signal',
    'EDA structural data-quality checks', 'Visualization choice by analytical question', 'SQL aggregation grain and denominator',
    'Join cardinality before aggregation', 'A/B test randomization and eligibility', 'Before-after comparison confounding',
    'Stakeholder result communication',
  ],
  'SWE / OOP fundamentals': [
    'Variable versus value versus type distinction', 'Static versus dynamic typing', 'Runtime validation versus static type checking',
    'Function versus method distinction', 'Input/output contract', 'Single responsibility and cohesion',
    'Class versus object distinction', 'Data record versus behavior-heavy class', 'Encapsulation and invariant protection',
    'Setter versus domain operation boundary', 'Inheritance versus composition tradeoff', 'Interface contract versus implementation detail',
    'Premature abstraction with interfaces', 'List/set/map/stack/queue operation selection', 'Hash-based lookup memory tradeoff',
    'Big-O growth versus runtime benchmark', 'I/O cost versus algorithmic complexity', 'Exception translation boundary',
    'Retryable versus permanent failure distinction', 'Unit test isolation and determinism', 'Behavior testing versus implementation-coupled testing',
    'HTTP request-response lifecycle', 'HTTP status code semantics', 'REST resource modeling and statelessness',
    'Workflow endpoint versus CRUD endpoint', 'Database transaction atomicity and rollback', 'External API inside transaction risk',
    'Git branch and pull request workflow', 'Systematic debugging loop', 'Dependency-chain inspection',
  ],
  'Java / coding invariants': [
    'Java String immutability', 'String.replaceFirst argument and return behavior', 'Regex semantics in string replacement',
    'Frequency-count invariant for anagrams', 'Single-pass min-price invariant', 'Greedy stock-profit state update',
    'Ordering constraint for buy before sell', 'O(1) state tracking', 'Odd-length two-pointer loop termination',
    'In-place reversal invariant', 'In-place prefix sum transformation', 'Space optimization using input mutation',
    'Complexity claim for implemented algorithm', 'Representative edge-case tests for coding',
  ],
};

/** Assign an atomic tag to its display cluster (or "Other" if unclassified). */
export function clusterForTag(tag: string): string {
  for (const [cluster, members] of Object.entries(KGTAG_CLUSTERS)) {
    if (members.includes(tag)) return cluster;
  }
  return 'Other';
}

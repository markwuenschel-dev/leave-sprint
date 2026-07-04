/**
 * RD — Technical Competency Scoring System reference data.
 *
 * Ported verbatim from the standalone unified_schedule.js (RUBRIC v1.10, the `RD`
 * object). This is the single source of truth for task types, competency dimensions,
 * levels, difficulty, gates, scoring bands, caps/penalties, evidence classes, roles,
 * grading principles, and the promotion-evidence standard.
 *
 * Kept as `as const` so union types can be derived from it (see ./types.ts).
 * Pure static data — no behavior.
 */

export const RUBRIC_VERSION = '1.11';
export const LABEL_SET_VERSION = '1.11-labels.2026-07-03';

export const RD = {
  taskTypes: [
    { id: 'coding', label: 'Coding', color: 'var(--cyan)' },
    { id: 'debugging', label: 'Debugging', color: 'var(--magenta)' },
    { id: 'knowledge', label: 'Technical Knowledge', color: 'var(--green)' },
    { id: 'sysdesign', label: 'System Design', color: 'var(--violet)' },
    { id: 'prodeng', label: 'Production Engineering', color: 'var(--slate)' },
    { id: 'walkthrough', label: 'Project Walkthrough', color: 'var(--yellow)' },
    { id: 'behavioral', label: 'Behavioral Technical', color: 'var(--orange)' },
    { id: 'analyticsCase', label: 'Analytics Case', color: 'var(--blue)' },
  ],

  /* §7 Universal competency dimensions */
  universalDims: [
    { id: 'correctness', label: 'Correctness and factual accuracy', short: 'Correct', max: 25 },
    { id: 'reasoning', label: 'Reasoning and decomposition', short: 'Reason', max: 20 },
    { id: 'judgment', label: 'Technical judgment and tradeoffs', short: 'Judge', max: 15 },
    { id: 'validation', label: 'Validation and evidence', short: 'Valid', max: 15 },
    { id: 'communication', label: 'Communication and explanation', short: 'Comm', max: 15 },
    { id: 'completeness', label: 'Completeness and execution quality', short: 'Compl', max: 10 },
  ],

  /* §3 Level definitions */
  levels: [
    {
      id: 'L1', label: 'Level I', subtitle: 'Scoped Contributor',
      scope: 'Functions, small components, routine defects, clearly defined requirements.',
      standard: 'Completes bounded work using established patterns; explains fundamentals; writes basic tests; recovers with guidance.',
      difficultyRange: 'D1–D3', maxAssistance: 3,
    },
    {
      id: 'L2', label: 'Level II', subtitle: 'Independent Owner',
      scope: 'Cross-file features, service boundaries, multi-layer defects, incomplete requirements.',
      standard: 'Owns a feature, service component, investigation, or technical workflow independently; makes sound tradeoffs and handles operational concerns.',
      difficultyRange: 'D3–D4', maxAssistance: 2,
    },
    {
      id: 'L3', label: 'Level III', subtitle: 'Senior Technical Owner',
      scope: 'Architecture, lifecycle/state failures, reliability, migrations, cross-team or system-wide consequences.',
      standard: 'Owns ambiguous, high-impact problems; anticipates system-wide consequences; defines reusable standards and improves others’ effectiveness.',
      difficultyRange: 'D4–D5', maxAssistance: 1,
    },
  ],

  /* §3.2 Level-specific scoring lenses */
  scoringLenses: [
    { level: 'Level I', lens: 'Correctness; fundamental concept or implementation; direct relevance; basic edge cases; readable explanation; basic verification.' },
    { level: 'Level II', lens: 'Independent decomposition; mechanism-level reasoning; meaningful tradeoffs; cross-component effects; failure handling; strong tests/evidence; operational judgment.' },
    { level: 'Level III', lens: 'Ambiguity resolution; system-wide consequences; risk and blast radius; alternatives and evolution path; prevention/standards; long-term maintainability; guidance of others.' },
  ],

  /* §4 Mandatory gates */
  gates: [
    { gate: 'Correctness', req: 'The central answer or implementation is substantially correct.' },
    { gate: 'Relevance', req: 'The response solves the problem actually asked.' },
    { gate: 'Independent explanation', req: 'The candidate can explain the work without relying on generated wording.' },
    { gate: 'Evidence', req: 'Claims are supported by tests, direct reproduction, or observable behavior.' },
    { gate: 'Safety and integrity', req: 'No fabricated tests, results, ownership, or certainty.' },
    { gate: 'Completion', req: 'The response reaches a usable conclusion or deliverable.' },
  ],

  /* §6 Difficulty */
  difficulty: [
    { d: 1, label: 'Direct', desc: 'Single-step, local, obvious failure; accurate failing test; minimal ambiguity.', level: 'Early Level I' },
    { d: 2, label: 'Local reasoning', desc: 'Bounded component; straightforward reproduction; logic understanding required; local fix.', level: 'Level I' },
    { d: 3, label: 'Bounded semantic/policy', desc: 'Code may run; output violates intended meaning or policy; weak semantic tests; bounded root cause.', level: 'Strong Level I / Level II' },
    { d: 4, label: 'Multi-layer contract', desc: 'Crosses layers or data grains; producer/consumer assumptions disagree; tests may share the mistake.', level: 'Level II' },
    { d: 5, label: 'Hidden state/lifecycle', desc: 'Plausible success; sequence, cache, fallback, retry, stale state, or provenance hides the defect.', level: 'Strong Level II / Level III' },
  ],

  /* §6.1 Difficulty attribute matrix */
  difficultyAttributes: [
    { dim: 'Scope', v0: 'One function', v1: 'Multiple files', v2: 'Multiple layers/services' },
    { dim: 'Observability', v0: 'Immediate failure', v1: 'Clearly wrong output', v2: 'Plausible successful output' },
    { dim: 'Reproduction', v0: 'Direct', v1: 'Special input', v2: 'Sequence/state dependent' },
    { dim: 'Test quality', v0: 'Accurate failing test', v1: 'Missing/incomplete test', v2: 'Misleading green test' },
    { dim: 'Root-cause distance', v0: 'Same line/function', v1: 'Different component', v2: 'Far from symptom' },
    { dim: 'Contract complexity', v0: 'Local behavior', v1: 'One interface', v2: 'Multiple contracts/invariants' },
    { dim: 'Fix coordination', v0: 'Local edit', v1: 'Code plus tests', v2: 'Multi-layer/state-safe change' },
    { dim: 'False-lead density', v0: 'Low', v1: 'Moderate', v2: 'Several plausible causes' },
  ],
  difficultyThresholds: [
    { range: '0–2', d: 1 }, { range: '3–5', d: 2 }, { range: '6–8', d: 3 },
    { range: '9–12', d: 4 }, { range: '13–16', d: 5 },
  ],

  /* §7 Universal competency score bands (per dimension) */
  universal: [
    { name: 'Correctness and factual accuracy', weight: 25, bands: [
      { range: '23–25', std: 'Correct throughout; no meaningful defects' },
      { range: '19–22', std: 'Correct core answer with minor mistakes' },
      { range: '14–18', std: 'Partially correct; one material defect or omission' },
      { range: '8–13', std: 'Major flaws despite some correct concepts' },
      { range: '0–7', std: 'Incorrect, irrelevant, or unusable' },
    ] },
    { name: 'Reasoning and decomposition', weight: 20, bands: [
      { range: '18–20', std: 'Breaks problem into correct components and handles dependencies' },
      { range: '15–17', std: 'Sound reasoning with minor gaps' },
      { range: '11–14', std: 'Understandable approach but incomplete structure' },
      { range: '6–10', std: 'Jumps to conclusions or relies on weak assumptions' },
      { range: '0–5', std: 'No coherent reasoning process' },
    ] },
    { name: 'Technical judgment and tradeoffs', weight: 15, bands: [
      { range: '14–15', std: 'Identifies realistic alternatives and chooses deliberately' },
      { range: '11–13', std: 'Makes a sound choice and names important tradeoffs' },
      { range: '8–10', std: 'Choice is acceptable but tradeoff analysis is shallow' },
      { range: '4–7', std: 'Uses patterns mechanically without understanding implications' },
      { range: '0–3', std: 'Poor or dangerous technical judgment' },
    ] },
    { name: 'Validation and evidence', weight: 15, bands: [
      { range: '14–15', std: 'Verifies behavior directly and uses strong evidence' },
      { range: '11–13', std: 'Good validation with minor missing checks' },
      { range: '8–10', std: 'Some testing or evidence, but important gaps remain' },
      { range: '4–7', std: 'Relies primarily on assumption or intuition' },
      { range: '0–3', std: 'Makes unsupported claims or ignores contradictory evidence' },
    ] },
    { name: 'Communication and explanation', weight: 15, bands: [
      { range: '14–15', std: 'Precise, structured, concise, and technically defensible' },
      { range: '11–13', std: 'Clear and mostly complete' },
      { range: '8–10', std: 'Understandable but vague, disorganized, or overly long' },
      { range: '4–7', std: 'Difficult to follow or unable to explain key mechanisms' },
      { range: '0–3', std: 'Explanation materially misrepresents the solution' },
    ] },
    { name: 'Completeness and execution quality', weight: 10, bands: [
      { range: '9–10', std: 'Fully completes the task and addresses important edge conditions' },
      { range: '7–8', std: 'Complete core solution with minor omissions' },
      { range: '5–6', std: 'Usable but incomplete' },
      { range: '2–4', std: 'Stops before a reliable conclusion' },
      { range: '0–1', std: 'No usable deliverable' },
    ] },
  ],

  /* §8 Task-specific rubrics */
  taskRubrics: [
    { id: 'coding', label: 'Coding', categories: [
      { name: 'Functional correctness', weight: 35 },
      { name: 'Algorithm/data-structure choice', weight: 20 },
      { name: 'Complexity analysis', weight: 15 },
      { name: 'Edge cases', weight: 15 },
      { name: 'Code quality', weight: 10 },
      { name: 'Verification', weight: 5 },
    ] },
    { id: 'debugging', label: 'Debugging', categories: [
      { name: 'Reproduction and problem definition', weight: 10 },
      { name: 'Dependency-chain inspection', weight: 15 },
      { name: 'Hypothesis quality', weight: 15 },
      { name: 'Evidence and falsification', weight: 20 },
      { name: 'Root-cause accuracy', weight: 20 },
      { name: 'Contract-level fix', weight: 15 },
      { name: 'Regression prevention', weight: 5 },
    ] },
    { id: 'knowledge', label: 'Technical Knowledge', categories: [
      { name: 'Conceptual accuracy', weight: 30 },
      { name: 'Mechanism-level explanation', weight: 25 },
      { name: 'Application to a real scenario', weight: 20 },
      { name: 'Tradeoffs and limitations', weight: 15 },
      { name: 'Clarity and precision', weight: 10 },
    ] },
    { id: 'sysdesign', label: 'System Design', categories: [
      { name: 'Requirements and assumptions', weight: 15 },
      { name: 'Architecture and boundaries', weight: 20 },
      { name: 'Data model and contracts', weight: 15 },
      { name: 'Scalability and performance', weight: 15 },
      { name: 'Reliability and failure handling', weight: 15 },
      { name: 'Security and operations', weight: 10 },
      { name: 'Tradeoffs and evolution path', weight: 10 },
    ] },
    { id: 'prodeng', label: 'Production Engineering', categories: [
      { name: 'Architecture and boundaries', weight: 15 },
      { name: 'Testing strategy', weight: 15 },
      { name: 'Error handling and resilience', weight: 15 },
      { name: 'Observability and diagnostics', weight: 15 },
      { name: 'Deployment and reproducibility', weight: 10 },
      { name: 'Data and migration safety', weight: 10 },
      { name: 'Security and configuration', weight: 10 },
      { name: 'Documentation and maintainability', weight: 10 },
    ] },
    { id: 'walkthrough', label: 'Project Walkthrough', categories: [
      { name: 'Problem and user value', weight: 15 },
      { name: 'Architecture explanation', weight: 20 },
      { name: 'Personal ownership', weight: 20 },
      { name: 'Design decisions and alternatives', weight: 15 },
      { name: 'Failure and learning examples', weight: 15 },
      { name: 'Production limitations and next steps', weight: 15 },
    ], note: 'Candidate must distinguish what they personally implemented vs. generated/inherited/adapted. Inflated ownership claims → severe penalty.' },
    { id: 'behavioral', label: 'Behavioral Technical', categories: [
      { name: 'Situation, stakes, and technical context', weight: 10 },
      { name: 'Personal ownership and scope', weight: 20 },
      { name: 'Actions, decisions, and technical judgment', weight: 20 },
      { name: 'Technical mechanism and problem-solving depth', weight: 15 },
      { name: 'Collaboration, disagreement, and stakeholder work', weight: 15 },
      { name: 'Results, evidence, and measurable impact', weight: 10 },
      { name: 'Reflection, learning, and recurrence prevention', weight: 10 },
    ], note: 'Scored on whether the candidate establishes what happened, separates personal ownership, explains technical and interpersonal decisions, supports results with evidence, and shows learning. Not scored as presentation polish or generic likability.' },
    {
      id: 'analyticsCase', label: 'Analytics Case',
      categories: [
        { name: 'Metric definition', weight: 20 },
        { name: 'Denominator / population / grain', weight: 15 },
        { name: 'Baseline / comparison point', weight: 10 },
        { name: 'Confounder / bias risk', weight: 15 },
        { name: 'SQL / analysis logic', weight: 20 },
        { name: 'Stakeholder recommendation', weight: 15 },
        { name: 'Limitation / caveat', weight: 5 },
      ],
      note: 'App-local category set (v1.11 §8 defines no analyticsCase task-specific rubric); derived from the §17.3 expectedElements template. Scoping and stakeholder framing are the point of the task type, not decoration around the query.',
    },
  ],

  /* §9 Domain and role evidence model */
  domainGroups: [
    { group: 'Languages', domains: ['Java', 'Python', 'TypeScript', 'SQL'] },
    { group: 'Frameworks & Platforms', domains: ['Spring Boot', 'React', 'AWS', 'Docker/CI/CD', 'Databases'] },
    { group: 'Core Engineering', domains: ['Algorithms/DSA', 'Backend/API Engineering', 'Frontend Engineering', 'Distributed Systems', 'Observability/Reliability'] },
    { group: 'Data & AI', domains: ['Data Modeling', 'Data Engineering', 'Statistical Analysis', 'Machine Learning', 'Retrieval/RAG', 'Evaluation/Experimentation'] },
  ],

  domainSubcompetencies: [
    { domain: 'Java', subs: 'Syntax/control flow; OOP; interfaces; collections/generics; exceptions; streams/lambdas; concurrency; testing; JVM concepts; DSA fluency' },
    { domain: 'Spring Boot', subs: 'Controllers/HTTP; DTOs/validation; services; dependency injection; error translation; configuration; integration testing; persistence/migrations; security; observability' },
    { domain: 'TypeScript', subs: 'Type fundamentals; narrowing; generics; unions; nullability; async/error typing; API contracts; strict-mode fluency' },
    { domain: 'React', subs: 'Components; props/state; forms; async server state; rendering; hooks; loading/error states; accessibility; testing; performance' },
    { domain: 'Python', subs: 'Core language; data structures; typing; exceptions; modules/packages; testing; data processing; APIs; concurrency; performance; reliability' },
    { domain: 'Machine Learning', subs: 'Problem formulation; feature/target design; baselines; validation; leakage; metrics; error analysis; reproducibility; monitoring; deployment implications' },
    { domain: 'Retrieval/RAG', subs: 'Ingestion; chunking; retrieval; embeddings; ranking/hybrid; evaluation; structured output; refusal/grounding; human review; serving; cost/latency; monitoring' },
    { domain: 'Data Engineering', subs: 'Data modeling/grain; pipelines; data quality; SQL; reliability/idempotency; orchestration; scale/performance; lineage/provenance' },
  ],

  roles: [
    { id: 'SWE', label: 'SWE', weights: 'Implementation/code quality 20; Debugging 20; System/API design 15; Testing 15; Reliability/operations 15; Data/persistence 5; Communication/ownership 10' },
    { id: 'MLE', label: 'MLE', weights: 'Software engineering 20; ML implementation 15; Data/feature pipelines 15; Evaluation 15; Serving 10; Reliability/monitoring 10; Reproducibility 10; Communication 5' },
    { id: 'DS', label: 'DS', weights: 'Problem formulation 15; Statistical reasoning 20; Data preparation/EDA 15; Modeling 15; Validation/error analysis 15; Experimentation/metrics 10; Communication/business interpretation 10' },
    { id: 'DE', label: 'DE', weights: 'Data modeling/grain 15; Pipeline implementation 20; Data quality 15; SQL/query reasoning 15; Reliability/idempotency 15; Orchestration/operations 10; Scale/performance 5; Communication 5' },
    { id: 'BIE', label: 'BIE', weights: 'SQL/query reasoning 25; Dashboard/semantic layer modeling 20; Data modeling/grain 15; Data quality 10; Pipeline/ETL literacy 10; Stakeholder communication/requirements translation 15; Business context/metric definition 5' },
    { id: 'BIA', label: 'BIA', weights: 'SQL/query reasoning 25; Business context/metric definition 20; Stakeholder communication/requirements translation 20; Dashboard/semantic layer modeling 15; Statistical reasoning (descriptive) 10; Data quality 10' },
  ],

  domainContributionWeights: [
    { role: 'Primary technical domain', pct: '60%' },
    { role: 'First secondary technical domain', pct: '25%' },
    { role: 'Second secondary technical domain', pct: '15%' },
    { role: 'Primary role', pct: '70%' },
    { role: 'Secondary role', pct: '20%' },
    { role: 'Tertiary role', pct: '10%' },
  ],

  /* §10 Retrospective evidence classes */
  evidenceClasses: [
    { id: 'prospective', label: 'Prospective controlled', weight: 1.0, desc: 'Difficulty precommitted; prompt, answer, assistance, tests, and expected behavior captured.' },
    { id: 'classA', label: 'Class A — Strong retrospective', weight: 0.75, desc: 'Complete prompt/answer/code, observable outputs, reconstructable assistance and expected behavior.' },
    { id: 'classB', label: 'Class B — Partial retrospective', weight: 0.4, desc: 'Answer exists, but testing, autonomy, or difficulty evidence is incomplete.' },
    { id: 'classC', label: 'Class C — Anecdotal', weight: 0.0, desc: 'Only summary claims or project bullets remain; not numerically scorable.' },
  ],

  /* §11 Multi-bug exercise */
  bugCompletionStandards: [
    { evidence: 'Symptom only', maxCredit: '20%' },
    { evidence: 'Affected area only', maxCredit: '40%' },
    { evidence: 'Exact root cause, incomplete fix', maxCredit: '70%' },
    { evidence: 'Correct fix without explanation', maxCredit: '75%' },
    { evidence: 'Root cause, invariant, source-level fix, regression proof', maxCredit: '100%' },
  ],
  difficultyMultipliers: [
    { d: 1, mult: 0.75 }, { d: 2, mult: 0.9 }, { d: 3, mult: 1.0 },
    { d: 4, mult: 1.25 }, { d: 5, mult: 1.5 },
  ],

  /* §12 Assistance */
  assistance: [
    { lvl: 0, desc: 'None', autonomy: 'Full autonomy evidence' },
    { lvl: 1, desc: 'Task clarification only', autonomy: 'Full autonomy evidence' },
    { lvl: 2, desc: 'General directional hint', autonomy: 'Reduces autonomy confidence' },
    { lvl: 3, desc: 'Relevant subsystem identified', autonomy: 'Cannot establish clean Level II independence' },
    { lvl: 4, desc: 'Affected file or contract identified', autonomy: 'Cannot establish independent competency' },
    { lvl: 5, desc: 'Root cause or fix substantially revealed', autonomy: 'Cannot establish independent competency' },
  ],

  /* §13 Caps */
  caps: [
    { condition: 'Correct result with materially wrong reasoning', max: '65' },
    { condition: 'Correct code with no meaningful explanation', max: '70' },
    { condition: 'Cannot reproduce or explain submitted code', max: '60' },
    { condition: 'Claims testing without evidence', max: '55' },
    { condition: 'Debugging fix without reproduction', max: '70' },
    { condition: 'Debugging conclusion unsupported by evidence', max: '60' },
    { condition: 'Symptom fix preserving root cause', max: '65' },
    { condition: 'Changes tests to accept wrong behavior', max: '50' },
    { condition: 'System design omits failure handling', max: '70 at Level II; 60 at Level III' },
    { condition: 'Production work has no test strategy', max: '65' },
    { condition: 'Confident materially false claim', max: '50' },
    { condition: 'Fabricated results, tests, ownership, or experience', max: '0–40' },
  ],

  /* §13 Penalties */
  penalties: [
    { deficiency: 'Minor factual error', penalty: '−2 to −5' },
    { deficiency: 'Material factual error', penalty: '−6 to −15' },
    { deficiency: 'Missed important edge case', penalty: '−3 to −8' },
    { deficiency: 'Vague tradeoff language', penalty: '−2 to −6' },
    { deficiency: 'Excessive prompting required', penalty: '−3 to −15' },
    { deficiency: 'Continues disproved debugging theory', penalty: '−5 to −10' },
    { deficiency: 'Edits before reproducing', penalty: '−3 to −8' },
    { deficiency: 'Broad speculative refactor', penalty: '−5 to −15' },
    { deficiency: 'Counts unrelated technical debt as a seeded bug', penalty: '−5' },
    { deficiency: 'Breaks unrelated behavior', penalty: '−10 to −25' },
  ],

  /* §14 Demonstrated-level rules */
  levelRules: [
    { level: 'Level I', pattern: 'Passing D1–D3 work; bounded implementation/debugging; basic explanation and verification; some guidance acceptable.' },
    { level: 'Level II', pattern: 'Passing D3–D4 work; independent multi-file or multi-layer reasoning; contract understanding; meaningful tests; assistance ≤2.' },
    { level: 'Level III', pattern: 'Strong D4–D5 work; ambiguous system-level reasoning; lifecycle/provenance/reliability judgment; blast-radius analysis; assistance ≤1.' },
  ],

  /* §15 Score bands */
  scoreBands: [
    { range: '90–100', verdict: 'Exceptional', cls: 'verdict-exceptional', min: 90 },
    { range: '80–89', verdict: 'Strong pass', cls: 'verdict-pass', min: 80 },
    { range: '70–79', verdict: 'Pass', cls: 'verdict-pass', min: 70 },
    { range: '60–69', verdict: 'Borderline', cls: 'verdict-border', min: 60 },
    { range: '50–59', verdict: 'Fail', cls: 'verdict-fail', min: 50 },
    { range: '<50', verdict: 'Clear fail', cls: 'verdict-fail', min: 0 },
  ],

  demonstratedLevels: [
    'Below Level I', 'Emerging Level I', 'Level I', 'Strong Level I',
    'Level II', 'Strong Level II', 'Level III', 'Strong Level III',
  ],

  weaknessTags: [
    'Mechanism gap', 'Thin tradeoff analysis', 'Incomplete execution',
    'Insufficient evidence', 'Incorrect reasoning', 'Confident false claim',
    'Terminology imprecision', 'Scope boundary missed', 'Failure handling gap',
    'Validation gap', 'Edge-case gap', 'Complexity analysis missing',
    'Overprompted answer', 'Ownership unclear', 'Application gap',
    'Interview phrasing gap', 'Definition gap', 'Implementation detail gap',
  ],

  /* v1.10 attempt types */
  attemptTypes: [
    'initial', 'retry', 'assisted_retry', 'post_coaching_retry',
    'final_retry', 'retention_retest', 'session_parent', 'rollup',
  ],

  /* v1.10 assessment outcomes */
  assessmentOutcomes: ['Demonstrated', 'Partial discovery', 'Concept discovery'],

  /* v1.10 coverage statuses */
  coverageStatuses: ['included', 'excluded', 'suspected_missing', 'duplicate_linked', 'rollup_only'],

  /* §19 Grading principles */
  gradingPrinciples: [
    'Grade demonstrated behavior, not potential.',
    'Do not award points for effort.',
    'Do not reward terminology without mechanism.',
    'Do not assume missing evidence is favorable.',
    'Honest uncertainty is better than confident error.',
    'A correct answer does not prove sound reasoning.',
    'Passing tests do not prove the tests are meaningful.',
    'Project size does not prove ownership.',
    'Career transition does not lower the bar.',
    'Difficulty is assigned before performance whenever possible.',
    'A difficult task solved with heavy assistance does not prove independence.',
    'A simple task cannot establish seniority by itself.',
    'Stop pursuing disproved theories immediately.',
    'Prefer contract-level fixes over symptom patches.',
    'Always report all three level scores for every answer.',
    'Do not average the Level I, Level II, and Level III scores.',
    'Do not let a low-level problem establish higher-level readiness.',
    'Use the problem level to cap qualifying evidence, not to suppress developmental scoring.',
    'Version rubric changes explicitly.',
  ],

  /* §20 Promotion evidence standard — canonical source of truth */
  promotionEvidence: {
    L1: [
      { type: 'coding', min: 3, label: 'Coding / implementation tasks' },
      { type: 'debugging', min: 2, label: 'Debugging tasks' },
      { type: 'knowledge', min: 3, label: 'Technical explanations' },
      { type: 'walkthrough', min: 1, label: 'Project or feature walkthrough' },
    ],
    L2: [
      { type: 'coding', min: 3, label: 'Independent feature / medium-complexity coding', maxAssist: 2 },
      { type: 'debugging', min: 3, label: 'Cross-file / cross-component debugging', maxAssist: 2 },
      { type: 'sysdesign', min: 2, label: 'System design exercises' },
      { type: 'walkthrough', min: 1, label: 'Production-shaped project walkthrough' },
    ],
    L3: [
      { type: 'prodeng', min: 3, label: 'Ambiguous system or production investigations', minDiff: 4 },
      { type: 'sysdesign', min: 3, label: 'System design at Difficulty 4 or 5', minDiff: 4 },
      { type: 'walkthrough', min: 1, label: 'Architecture / reliability / migration judgment' },
      { type: 'behavioral', min: 1, label: 'Evidence of improving others or defining reusable standards' },
    ],
  },
} as const;

/** Canonical promotion-evidence standard (alias of RD.promotionEvidence). */
export const PROMOTION_EVIDENCE = RD.promotionEvidence;

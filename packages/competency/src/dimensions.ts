/**
 * COMPETENCY DIMENSIONS — the shared axis every role projects onto.
 *
 * §9.3 of Technical_Competency_Scoring_System_v1_11.md gives each role a weighted
 * competency list, but it names overlapping skills differently per role: SWE calls it
 * "Implementation/code quality", MLE calls the same underlying capability "Software
 * engineering"; DE/BIE/BIA all say "SQL/query reasoning"; four roles each have their
 * own phrasing for communication. In `RD.roles` (referenceData.ts:244-251) the whole
 * table is one prose string per role and nothing parses it.
 *
 * Here those role-local labels are folded onto ONE canonical dimension set. That fold
 * is what makes the goal's requirement real: role readiness becomes a different
 * *projection* of the same evidence rather than seven unrelated scoreboards. Evidence
 * that lands on `sql-reasoning` raises DE, BIE and BIA at once, weighted 15/25/25.
 *
 * INVARIANT (pinned by dimensions.test.ts): every role's weights sum to exactly 100.
 */

import type { CareerRoleId } from './roles';

export const COMPETENCY_IDS = [
  // Software engineering core
  'implementation',
  'debugging',
  'system-design',
  'testing',
  'reliability',
  'data-persistence',
  // Cross-cutting
  'communication',
  'stakeholder-translation',
  // ML
  'ml-implementation',
  'evaluation',
  'serving',
  'reproducibility',
  'modeling',
  // Analytics / statistics
  'problem-formulation',
  'statistical-reasoning',
  'data-preparation',
  'experimentation',
  'business-context',
  'semantic-modeling',
  // Data engineering
  'data-modeling',
  'data-pipelines',
  'data-quality',
  'sql-reasoning',
  'orchestration',
  'scale-performance',
  // Offensive security
  'recon',
  'exploitation',
  'hypothesis-formation',
  'scope-discipline',
  'evidence-collection',
  'adaptability',
  'reporting',
  'defensive-understanding',
] as const;

export type CompetencyId = (typeof COMPETENCY_IDS)[number];

/** Coarse grouping, for UI sectioning only. Never used in scoring. */
export type CompetencyGroup =
  | 'engineering'
  | 'cross-cutting'
  | 'ml'
  | 'analytics'
  | 'data'
  | 'security';

export interface Competency {
  id: CompetencyId;
  label: string;
  group: CompetencyGroup;
  /**
   * The role-local names §9.3 uses for this capability, kept so the fold is
   * auditable against the spec rather than being an undocumented judgement call.
   */
  specAliases: string[];
  /** What demonstrating this actually looks like — shown in the UI, not scored. */
  demonstratedBy: string;
}

export const COMPETENCIES: readonly Competency[] = [
  {
    id: 'implementation',
    label: 'Implementation & code quality',
    group: 'engineering',
    specAliases: ['Implementation/code quality', 'Software engineering'],
    demonstratedBy: 'Writing correct, readable, idiomatic code that survives review.',
  },
  {
    id: 'debugging',
    label: 'Debugging & fault isolation',
    group: 'engineering',
    specAliases: ['Debugging'],
    demonstratedBy: 'Reproducing first, isolating root cause, fixing at the source with proof.',
  },
  {
    id: 'system-design',
    label: 'System & API design',
    group: 'engineering',
    specAliases: ['System/API design'],
    demonstratedBy: 'Choosing boundaries and contracts, and naming the failure modes.',
  },
  {
    id: 'testing',
    label: 'Testing & verification',
    group: 'engineering',
    specAliases: ['Testing'],
    demonstratedBy: 'Tests that would actually fail if the behaviour regressed.',
  },
  {
    id: 'reliability',
    label: 'Reliability & operations',
    group: 'engineering',
    specAliases: ['Reliability/operations', 'Reliability/monitoring', 'Reliability/idempotency'],
    demonstratedBy: 'Timeouts, retries, idempotency, observability and blast-radius awareness.',
  },
  {
    id: 'data-persistence',
    label: 'Data & persistence',
    group: 'engineering',
    specAliases: ['Data/persistence'],
    demonstratedBy: 'Schema and transaction choices inside an application.',
  },
  {
    id: 'communication',
    label: 'Communication & ownership',
    group: 'cross-cutting',
    specAliases: [
      'Communication/ownership',
      'Communication',
      'Communication/business interpretation',
    ],
    demonstratedBy: 'Explaining mechanism concisely and owning the outcome end to end.',
  },
  {
    id: 'stakeholder-translation',
    label: 'Stakeholder translation',
    group: 'cross-cutting',
    specAliases: ['Stakeholder communication/requirements translation'],
    demonstratedBy:
      'Turning an ambiguous business ask into a scoped question with metric, population, timeframe and baseline.',
  },
  {
    id: 'ml-implementation',
    label: 'ML implementation',
    group: 'ml',
    specAliases: ['ML implementation'],
    demonstratedBy: 'Feature and target design, baselines, and leakage-free training code.',
  },
  {
    id: 'evaluation',
    label: 'Evaluation & error analysis',
    group: 'ml',
    specAliases: ['Evaluation', 'Validation/error analysis'],
    demonstratedBy: 'Metric choice fit to the decision, plus honest error analysis.',
  },
  {
    id: 'serving',
    label: 'Model serving',
    group: 'ml',
    specAliases: ['Serving'],
    demonstratedBy: 'Latency, cost and correctness of a model behind an interface.',
  },
  {
    id: 'reproducibility',
    label: 'Reproducibility',
    group: 'ml',
    specAliases: ['Reproducibility'],
    demonstratedBy: 'Someone else can rerun it and get your numbers.',
  },
  {
    id: 'modeling',
    label: 'Modelling',
    group: 'ml',
    specAliases: ['Modeling'],
    demonstratedBy: 'Choosing and fitting a model family suited to the data and question.',
  },
  {
    id: 'problem-formulation',
    label: 'Problem formulation',
    group: 'analytics',
    specAliases: ['Problem formulation'],
    demonstratedBy: 'Converting a vague goal into a measurable, falsifiable question.',
  },
  {
    id: 'statistical-reasoning',
    label: 'Statistical reasoning',
    group: 'analytics',
    specAliases: ['Statistical reasoning', 'Statistical reasoning (descriptive)'],
    demonstratedBy: 'Inference, variance and uncertainty reasoned about correctly.',
  },
  {
    id: 'data-preparation',
    label: 'Data preparation & EDA',
    group: 'analytics',
    specAliases: ['Data preparation/EDA'],
    demonstratedBy: 'Cleaning, joining and interrogating a dataset before trusting it.',
  },
  {
    id: 'experimentation',
    label: 'Experimentation & metrics',
    group: 'analytics',
    specAliases: ['Experimentation/metrics'],
    demonstratedBy: 'Designing a test that can actually detect the effect claimed.',
  },
  {
    id: 'business-context',
    label: 'Business context & metric definition',
    group: 'analytics',
    specAliases: ['Business context/metric definition'],
    demonstratedBy: 'Defining a metric a business will act on, and its denominator.',
  },
  {
    id: 'semantic-modeling',
    label: 'Dashboard & semantic layer modelling',
    group: 'analytics',
    specAliases: ['Dashboard/semantic layer modeling'],
    demonstratedBy: 'A semantic layer where two people asking the same question agree.',
  },
  {
    id: 'data-modeling',
    label: 'Data modelling & grain',
    group: 'data',
    specAliases: ['Data modeling/grain'],
    demonstratedBy: 'Declaring the grain and keeping every join honest about it.',
  },
  {
    id: 'data-pipelines',
    label: 'Pipelines & ETL',
    group: 'data',
    specAliases: ['Data/feature pipelines', 'Pipeline implementation', 'Pipeline/ETL literacy'],
    demonstratedBy: 'Building a pipeline that reruns safely and fails loudly.',
  },
  {
    id: 'data-quality',
    label: 'Data quality',
    group: 'data',
    specAliases: ['Data quality'],
    demonstratedBy: 'Checks that catch bad data before a stakeholder does.',
  },
  {
    id: 'sql-reasoning',
    label: 'SQL & query reasoning',
    group: 'data',
    specAliases: ['SQL/query reasoning'],
    demonstratedBy: 'Window functions, grain-safe joins, and reading a query plan.',
  },
  {
    id: 'orchestration',
    label: 'Orchestration & operations',
    group: 'data',
    specAliases: ['Orchestration/operations'],
    demonstratedBy: 'Scheduling, dependencies, backfills and on-call reality.',
  },
  {
    id: 'scale-performance',
    label: 'Scale & performance',
    group: 'data',
    specAliases: ['Scale/performance'],
    demonstratedBy: 'Knowing what breaks first as volume grows, and why.',
  },
  {
    id: 'recon',
    label: 'Reconnaissance & enumeration',
    group: 'security',
    specAliases: [],
    demonstratedBy: 'Systematic surface mapping before touching anything.',
  },
  {
    id: 'exploitation',
    label: 'Exploitation & execution',
    group: 'security',
    specAliases: [],
    demonstratedBy: 'Turning a hypothesis into a working, controlled proof.',
  },
  {
    id: 'hypothesis-formation',
    label: 'Hypothesis formation & attack paths',
    group: 'security',
    specAliases: [],
    demonstratedBy: 'Ranking candidate attack paths by evidence, not by habit.',
  },
  {
    id: 'scope-discipline',
    label: 'Scope discipline & authorisation',
    group: 'security',
    specAliases: [],
    demonstratedBy: 'Staying inside the rules of engagement when a path leads outside them.',
  },
  {
    id: 'evidence-collection',
    label: 'Evidence collection & handling',
    group: 'security',
    specAliases: [],
    demonstratedBy: 'Capturing reproducible artefacts without destroying state.',
  },
  {
    id: 'adaptability',
    label: 'Adaptability under failure',
    group: 'security',
    specAliases: [],
    demonstratedBy: 'Abandoning a dead path quickly and re-planning from evidence.',
  },
  {
    id: 'reporting',
    label: 'Reporting & remediation',
    group: 'security',
    specAliases: [],
    demonstratedBy: 'A finding a defender can reproduce, prioritise and fix.',
  },
  {
    id: 'defensive-understanding',
    label: 'Defensive understanding',
    group: 'security',
    specAliases: [],
    demonstratedBy: 'Knowing what would have detected or prevented what you just did.',
  },
] as const;

const COMPETENCY_BY_ID = new Map<CompetencyId, Competency>(COMPETENCIES.map((c) => [c.id, c]));

export function getCompetency(id: CompetencyId): Competency {
  const c = COMPETENCY_BY_ID.get(id);
  if (!c) throw new Error(`unknown competency: ${String(id)}`);
  return c;
}

export function isCompetencyId(v: unknown): v is CompetencyId {
  return typeof v === 'string' && (COMPETENCY_IDS as readonly string[]).includes(v);
}

/**
 * ROLE PROFILES — §9.3 weights, refolded onto canonical ids.
 *
 * Read each row against the spec table: the numbers are unchanged, only the labels
 * are canonicalised. `redteam` is the one calibrated locally (see roles.ts).
 */
export type RoleProfile = Partial<Record<CompetencyId, number>>;

export const ROLE_PROFILES: Record<CareerRoleId, RoleProfile> = {
  // §9.3 SWE: Implementation/code quality 20; Debugging 20; System/API design 15;
  // Testing 15; Reliability/operations 15; Data/persistence 5; Communication/ownership 10
  swe: {
    implementation: 20,
    debugging: 20,
    'system-design': 15,
    testing: 15,
    reliability: 15,
    'data-persistence': 5,
    communication: 10,
  },
  // §9.3 MLE: Software engineering 20; ML implementation 15; Data/feature pipelines 15;
  // Evaluation 15; Serving 10; Reliability/monitoring 10; Reproducibility 10; Communication 5
  mle: {
    implementation: 20,
    'ml-implementation': 15,
    'data-pipelines': 15,
    evaluation: 15,
    serving: 10,
    reliability: 10,
    reproducibility: 10,
    communication: 5,
  },
  // §9.3 DS: Problem formulation 15; Statistical reasoning 20; Data preparation/EDA 15;
  // Modeling 15; Validation/error analysis 15; Experimentation/metrics 10;
  // Communication/business interpretation 10
  ds: {
    'problem-formulation': 15,
    'statistical-reasoning': 20,
    'data-preparation': 15,
    modeling: 15,
    evaluation: 15,
    experimentation: 10,
    communication: 10,
  },
  // §9.3 DE: Data modeling/grain 15; Pipeline implementation 20; Data quality 15;
  // SQL/query reasoning 15; Reliability/idempotency 15; Orchestration/operations 10;
  // Scale/performance 5; Communication 5
  de: {
    'data-modeling': 15,
    'data-pipelines': 20,
    'data-quality': 15,
    'sql-reasoning': 15,
    reliability: 15,
    orchestration: 10,
    'scale-performance': 5,
    communication: 5,
  },
  // §9.3 BIE: SQL/query reasoning 25; Dashboard/semantic layer modeling 20;
  // Data modeling/grain 15; Data quality 10; Pipeline/ETL literacy 10;
  // Stakeholder communication/requirements translation 15;
  // Business context/metric definition 5
  bie: {
    'sql-reasoning': 25,
    'semantic-modeling': 20,
    'data-modeling': 15,
    'data-quality': 10,
    'data-pipelines': 10,
    'stakeholder-translation': 15,
    'business-context': 5,
  },
  // §9.3 BIA: SQL/query reasoning 25; Business context/metric definition 20;
  // Stakeholder communication/requirements translation 20;
  // Dashboard/semantic layer modeling 15; Statistical reasoning (descriptive) 10;
  // Data quality 10
  bia: {
    'sql-reasoning': 25,
    'business-context': 20,
    'stakeholder-translation': 20,
    'semantic-modeling': 15,
    'statistical-reasoning': 10,
    'data-quality': 10,
  },
  // LOCAL CALIBRATION — no spec row exists. `implementation` earns a slice because
  // tooling and scripting are load-bearing in real engagements, and because a role
  // whose dimensions are all bespoke would never benefit from shared evidence,
  // which defeats the point of a single graph.
  redteam: {
    exploitation: 20,
    recon: 15,
    'hypothesis-formation': 15,
    'scope-discipline': 10,
    reporting: 10,
    'defensive-understanding': 10,
    'evidence-collection': 8,
    adaptability: 7,
    implementation: 5,
  },
};

/** Weight of one competency for one role; 0 when the role does not use it. */
export function roleWeight(role: CareerRoleId, competency: CompetencyId): number {
  return ROLE_PROFILES[role][competency] ?? 0;
}

/** Competencies a role actually uses, heaviest first, ties broken by id for stability. */
export function competenciesForRole(role: CareerRoleId): { id: CompetencyId; weight: number }[] {
  return Object.entries(ROLE_PROFILES[role])
    .map(([id, weight]) => ({ id: id as CompetencyId, weight: weight as number }))
    .sort((a, b) => b.weight - a.weight || a.id.localeCompare(b.id));
}

/** Every role that draws on this competency, and how heavily. */
export function rolesUsingCompetency(
  competency: CompetencyId,
): { role: CareerRoleId; weight: number }[] {
  return (Object.keys(ROLE_PROFILES) as CareerRoleId[])
    .map((role) => ({ role, weight: roleWeight(role, competency) }))
    .filter((r) => r.weight > 0)
    .sort((a, b) => b.weight - a.weight || a.role.localeCompare(b.role));
}

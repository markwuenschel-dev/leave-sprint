/**
 * TECHNICAL DOMAIN AXIS, and the feeder maps that connect it to competencies.
 *
 * §9 of the scoring spec insists on two separate axes: *technical domain* (what
 * technology or field the work was in) and *role competency* (what capability it
 * demonstrated). `RD.domainGroups` (referenceData.ts:227-231) already lists the
 * domains, but `RubricEntry.primaryDomain` is an unvalidated free string
 * (rubric/src/types.ts:48) and nothing maps a domain onto a competency.
 *
 * The feeder maps below are that missing edge. They are what lets an entry tagged
 * only `primaryDomain: "SQL"` — which is the overwhelmingly common shape of real
 * data in this repo — raise `sql-reasoning`, and through it DE, BIE and BIA.
 *
 * Three contribution channels exist, with deliberately declining strength:
 *
 *   direct    1.00  the evidence names a competency outright
 *   taskType  0.70  inferred from what kind of task it was
 *   domain    0.50  inferred from what technology it was in
 *
 * Inference is weaker than assertion on purpose. A grade tagged "SQL" is genuine
 * evidence about SQL reasoning, but it is weaker evidence than a grade that was
 * explicitly scored against that competency, and the graph should say so rather
 * than flattening the difference.
 */

import type { CompetencyId } from './dimensions';

export const DOMAIN_GROUPS = [
  {
    group: 'Languages',
    domains: ['Java', 'Python', 'TypeScript', 'SQL'],
  },
  {
    group: 'Frameworks & Platforms',
    domains: ['Spring Boot', 'React', 'AWS', 'Docker/CI/CD', 'Databases'],
  },
  {
    group: 'Core Engineering',
    domains: [
      'Algorithms/DSA',
      'Backend/API Engineering',
      'Frontend Engineering',
      'Distributed Systems',
      'Observability/Reliability',
    ],
  },
  {
    group: 'Data & AI',
    domains: [
      'Data Modeling',
      'Data Engineering',
      // Present in spec §9.1 and emitted by QB_TRACK_MAP.bi (qbank/src/trackMap.ts:17)
      // but missing from RD.domainGroups — an orphan string until now.
      'Data Analysis',
      'Statistical Analysis',
      'Machine Learning',
      'Retrieval/RAG',
      'Evaluation/Experimentation',
    ],
  },
  {
    // New group. The scoring spec has no security domains because it predates the
    // Red Team role; these are the local calibration that goes with `redteam`.
    group: 'Security',
    domains: [
      'Offensive Security',
      'Network & Protocols',
      'Web Application Security',
      'Identity & Access',
      'Detection & Response',
    ],
  },
] as const;

export type DomainId = (typeof DOMAIN_GROUPS)[number]['domains'][number];

export const ALL_DOMAINS: readonly string[] = DOMAIN_GROUPS.flatMap((g) => [...g.domains]);

export function isKnownDomain(v: unknown): v is DomainId {
  return typeof v === 'string' && ALL_DOMAINS.includes(v);
}

/** Task types, mirroring RD.taskTypes (referenceData.ts:17-26). */
export const TASK_TYPES = [
  'coding',
  'debugging',
  'knowledge',
  'sysdesign',
  'prodeng',
  'walkthrough',
  'behavioral',
  'analyticsCase',
] as const;

export type TaskTypeId = (typeof TASK_TYPES)[number];

export function isTaskTypeId(v: unknown): v is TaskTypeId {
  return typeof v === 'string' && (TASK_TYPES as readonly string[]).includes(v);
}

/** Relative strength of each inference channel. See the module header. */
export const CHANNEL_STRENGTH = {
  direct: 1.0,
  taskType: 0.7,
  domain: 0.5,
} as const;

export type ChannelId = keyof typeof CHANNEL_STRENGTH;

/**
 * DOMAIN → COMPETENCY.
 *
 * Read as: "work in this domain is evidence about these capabilities". Kept
 * deliberately tight — a domain that plausibly touches everything (e.g. Python)
 * would wash out the signal if it fed every competency, so each entry lists only
 * the capabilities the domain genuinely exercises.
 */
export const DOMAIN_FEEDERS: Record<string, CompetencyId[]> = {
  Java: ['implementation', 'debugging', 'testing'],
  Python: ['implementation', 'debugging', 'testing'],
  TypeScript: ['implementation', 'debugging', 'testing'],
  SQL: ['sql-reasoning', 'data-modeling', 'data-quality'],

  'Spring Boot': ['implementation', 'system-design', 'data-persistence', 'testing'],
  React: ['implementation', 'testing'],
  AWS: ['reliability', 'system-design', 'orchestration', 'scale-performance'],
  'Docker/CI/CD': ['reliability', 'reproducibility', 'orchestration'],
  Databases: ['data-persistence', 'sql-reasoning', 'data-modeling', 'scale-performance'],

  'Algorithms/DSA': ['implementation'],
  'Backend/API Engineering': ['implementation', 'system-design', 'debugging', 'serving'],
  'Frontend Engineering': ['implementation'],
  'Distributed Systems': ['system-design', 'reliability', 'scale-performance'],
  'Observability/Reliability': ['reliability', 'debugging', 'defensive-understanding'],

  'Data Modeling': ['data-modeling', 'semantic-modeling', 'data-quality'],
  'Data Engineering': ['data-pipelines', 'data-quality', 'orchestration', 'data-modeling'],
  'Data Analysis': [
    'data-preparation',
    'business-context',
    'semantic-modeling',
    'problem-formulation',
  ],
  'Statistical Analysis': ['statistical-reasoning', 'experimentation', 'modeling'],
  'Machine Learning': ['ml-implementation', 'modeling', 'evaluation'],
  'Retrieval/RAG': ['ml-implementation', 'serving', 'evaluation'],
  'Evaluation/Experimentation': ['evaluation', 'experimentation'],

  'Offensive Security': ['recon', 'exploitation', 'hypothesis-formation', 'scope-discipline'],
  'Network & Protocols': ['recon', 'hypothesis-formation'],
  'Web Application Security': ['exploitation', 'hypothesis-formation'],
  'Identity & Access': ['defensive-understanding', 'scope-discipline'],
  'Detection & Response': ['defensive-understanding', 'evidence-collection'],
};

/**
 * TASK TYPE → COMPETENCY.
 *
 * `knowledge` is deliberately absent: a knowledge question tells you about the
 * domain it was asked in, not about a capability, so it should route through the
 * domain channel alone rather than inventing a competency signal it did not earn.
 */
export const TASK_TYPE_FEEDERS: Partial<Record<TaskTypeId, CompetencyId[]>> = {
  coding: ['implementation', 'testing'],
  debugging: ['debugging', 'hypothesis-formation'],
  sysdesign: ['system-design'],
  prodeng: ['reliability', 'orchestration'],
  walkthrough: ['communication'],
  behavioral: ['communication'],
  analyticsCase: ['problem-formulation', 'business-context', 'stakeholder-translation'],
};

/**
 * Competencies a domain string feeds; empty for an unrecognised domain.
 *
 * `Object.hasOwn` rather than a bare index: `primaryDomain` is an unvalidated free
 * string (packages/rubric/src/types.ts:48), so a row carrying "toString" would
 * otherwise resolve through Object.prototype and hand back a function.
 */
export function competenciesForDomain(domain: string | null | undefined): CompetencyId[] {
  if (!domain) return [];
  return Object.hasOwn(DOMAIN_FEEDERS, domain) ? DOMAIN_FEEDERS[domain] : [];
}

/** Competencies a task type feeds; empty for `knowledge` and for unknown values. */
export function competenciesForTaskType(taskType: string | null | undefined): CompetencyId[] {
  if (!taskType || !isTaskTypeId(taskType)) return [];
  return TASK_TYPE_FEEDERS[taskType] ?? [];
}

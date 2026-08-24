/**
 * PRIORITISATION — the two optimisation modes.
 *
 * The product question is "what should I be able to do or answer next, and why is
 * that the highest-value use of my time?", and it has two different right answers:
 *
 *   long-term  what most improves overall capability and career optionality
 *   campaign   what most improves the chance of clearing the next interview stage
 *
 * Today's engine has neither. `pickNextMove` (apps/waypoint/lib/nextMove.ts:21-154)
 * has a single code path with hand-tuned magic constants (`100 + need*10`,
 * `95 + need*15`, `90 + need*10`) and returns a *navigation instruction* rather than
 * a work item. A campaign horizon was, in fact, deliberately removed — see the note
 * at packages/rubric/src/promotion.ts:10.
 *
 * Every term the goal names is a named, separately-computed field here — role
 * relevance, stage likelihood, gap severity, expected lift, urgency, retention risk,
 * evidence strength, time cost — and the mode is just a different weight vector over
 * them. Nothing is hidden inside a magic number: `why` reports the terms that
 * actually decided the ranking, so a recommendation can be argued with.
 */

import { type CareerRoleId, ROLE_TIER_WEIGHT, getRole } from './roles';
import { type CompetencyId, getCompetency, roleWeight, rolesUsingCompetency } from './dimensions';
import { recencyFactor } from './evidence';
import type { CompetencyGraph, CompetencyNode } from './graph';

export type OptimizationMode = 'long-term' | 'campaign';

/**
 * The learning loop from the product goal:
 * cold attempt → probe → diagnose → teach → retry → transfer → retention retest.
 * An action names where in that loop this competency should re-enter.
 */
export type ActionKind =
  | 'cold-attempt'
  | 'probe'
  | 'teach'
  | 'retry'
  | 'transfer'
  | 'retention-retest'
  | 'build'
  | 'mock';

/** Typical hours to complete one rep of each action. Divides value into value-per-hour. */
export const ACTION_HOURS: Record<ActionKind, number> = {
  'retention-retest': 0.5,
  probe: 0.75,
  'cold-attempt': 1,
  retry: 1,
  mock: 1.5,
  teach: 2,
  transfer: 2,
  build: 6,
};

export const ACTION_LABEL: Record<ActionKind, string> = {
  'cold-attempt': 'Cold attempt',
  probe: 'Probe',
  teach: 'Teach & rebuild',
  retry: 'Retry unaided',
  transfer: 'Transfer problem',
  'retention-retest': 'Retention retest',
  build: 'Build evidence',
  mock: 'Mock interview',
};

/** Severity assigned to a competency that has never been measured. */
export const UNPROVEN_SEVERITY = 0.7;

export interface ModeWeights {
  roleRelevance: number;
  severity: number;
  lift: number;
  urgency: number;
  retentionRisk: number;
  /** Subtracted: already-strong evidence lowers the value of more of the same. */
  provenPenalty: number;
}

export const MODE_WEIGHTS: Record<OptimizationMode, ModeWeights> = {
  // Optionality: breadth and durability matter, deadlines do not exist.
  'long-term': {
    roleRelevance: 0.2,
    severity: 0.25,
    lift: 0.25,
    urgency: 0,
    retentionRisk: 0.2,
    provenPenalty: 0.1,
  },
  // One stage, one role, a date. Relevance and urgency dominate; long-run decay
  // barely matters because the horizon is shorter than the forgetting curve.
  campaign: {
    roleRelevance: 0.3,
    severity: 0.2,
    lift: 0.2,
    urgency: 0.2,
    retentionRisk: 0.05,
    provenPenalty: 0.05,
  },
};

export interface CampaignContext {
  role: CareerRoleId;
  /** 0–1. How likely the next stage is to happen / how much it counts. Default 1. */
  stageLikelihood?: number;
  /** Competencies the next stage is expected to probe. Boosts relevance when listed. */
  expectedCompetencies?: CompetencyId[];
  /** Calendar days until the stage. `null` when unscheduled — urgency then decays to a floor. */
  daysUntil?: number | null;
}

/** Full urgency inside a week, tapering to nothing at a month out. */
export const URGENCY_HORIZON_DAYS = 30;
export const URGENCY_FULL_WITHIN_DAYS = 7;
/** Unscheduled stages still carry some pressure — the invite can land any day. */
export const UNSCHEDULED_URGENCY = 0.4;

export function urgencyFromDays(daysUntil: number | null | undefined): number {
  if (daysUntil == null) return UNSCHEDULED_URGENCY;
  if (daysUntil <= URGENCY_FULL_WITHIN_DAYS) return 1;
  if (daysUntil >= URGENCY_HORIZON_DAYS) return 0;
  const span = URGENCY_HORIZON_DAYS - URGENCY_FULL_WITHIN_DAYS;
  return Math.round(((URGENCY_HORIZON_DAYS - daysUntil) / span) * 1000) / 1000;
}

export interface PriorityTerms {
  roleRelevance: number;
  severity: number;
  lift: number;
  urgency: number;
  retentionRisk: number;
  evidenceStrength: number;
  timeCostHours: number;
}

export interface PrioritizedAction {
  competency: CompetencyId;
  label: string;
  mode: OptimizationMode;
  /** The role this action most serves. */
  role: CareerRoleId;
  action: ActionKind;
  actionLabel: string;
  /** Value per hour. Comparable within one call; not an absolute scale. */
  score: number;
  terms: PriorityTerms;
  /** Plain-language reasons, strongest term first. */
  why: string[];
}

/**
 * Role relevance.
 *
 * Long-term takes the best tier-weighted claim any role has on this competency, so a
 * skill that serves two primary roles outranks one that serves a single exploratory
 * role. Campaign mode ignores every role but the campaign's, and scales by how
 * likely the stage is — a maybe-interview should not outrank a booked one.
 */
function roleRelevanceFor(
  competency: CompetencyId,
  scope: PriorityScope,
): { value: number; role: CareerRoleId } {
  if (scope.kind === 'role') {
    // Single declared target: relevance is that role's weight and nothing else. A
    // competency only another role uses scores 0 here and drops out of the ranking.
    return { value: roleWeight(scope.role, competency) / 100, role: scope.role };
  }
  if (scope.kind === 'campaign') {
    const { campaign } = scope;
    const w = roleWeight(campaign.role, competency) / 100;
    const likelihood = campaign.stageLikelihood ?? 1;
    // An explicitly expected competency is relevant even when the role profile
    // weights it lightly — the interviewer's agenda beats the generic profile.
    const expected = campaign.expectedCompetencies?.includes(competency) ? 0.35 : 0;
    return { value: Math.min(1, (w + expected) * likelihood), role: campaign.role };
  }
  // Portfolio only: the tier-weighted best claim any role has on this competency.
  const users = rolesUsingCompetency(competency);
  let best = 0;
  let bestRole: CareerRoleId = users[0]?.role ?? 'swe';
  for (const u of users) {
    const v = (u.weight / 100) * ROLE_TIER_WEIGHT[getRole(u.role).tier];
    if (v > best) {
      best = v;
      bestRole = u.role;
    }
  }
  return { value: best, role: bestRole };
}

function severityFor(node: CompetencyNode): number {
  if (node.score == null) return UNPROVEN_SEVERITY;
  return Math.max(0, Math.min(1, 1 - node.score / 100));
}

/**
 * Retention risk is decay that has already happened to something you *had*.
 * A competency with no evidence has nothing to forget, so its risk is zero — its
 * problem is severity and lift, not retention. Keeping these separate is what stops
 * "never learned" and "learning slipping away" from producing the same advice.
 */
function retentionRiskFor(node: CompetencyNode, asOf: string): number {
  if (node.score == null || node.lastEvidenceDate == null) return 0;
  return Math.round((1 - recencyFactor(node.lastEvidenceDate, asOf)) * 1000) / 1000;
}

/** Where in the learning loop this competency should re-enter. */
export function chooseAction(node: CompetencyNode, roleWeightPct: number): ActionKind {
  if (node.score == null) {
    // Never measured. Heavy dimensions deserve a real artefact; light ones just need
    // a baseline number before anything else can be said about them.
    return roleWeightPct >= 20 ? 'build' : 'cold-attempt';
  }
  if (node.staleness === 'High' && node.score >= 70) return 'retention-retest';
  if (node.score < 60) return 'teach';
  if (node.score < 70) return 'retry';
  if (node.status === 'emerging') return 'transfer';
  if (node.count < 2) return 'probe';
  return 'mock';
}

/**
 * Ranking scope. Long-term optimises ONE declared target role; campaign derives its
 * role from the campaign itself. Both are required by the type rather than defaulted,
 * because the previous permissive shape silently fell back to an all-role maximum —
 * which let a warm, locally-calibrated role outrank the chosen transition target.
 */
export type PrioritizeOptions =
  | {
      mode: 'long-term';
      /** Required. There is no fallback: an unscoped long-term rank is not expressible. */
      role: CareerRoleId;
      asOf: string;
      /** How many actions to return. */
      limit?: number;
      /** Restrict to these competencies. */
      only?: CompetencyId[];
    }
  | {
      mode: 'campaign';
      /** Required. The role comes from here and nowhere else. */
      campaign: CampaignContext;
      asOf: string;
      limit?: number;
      /** Restrict to these competencies. Used by a campaign that knows its agenda. */
      only?: CompetencyId[];
    };

/** Deliberate portfolio ranking across every pursued role. Never a fallback. */
export interface PrioritizePortfolioOptions {
  asOf: string;
  limit?: number;
  only?: CompetencyId[];
}

type PriorityScope =
  | { kind: 'role'; role: CareerRoleId }
  | { kind: 'campaign'; campaign: CampaignContext }
  | { kind: 'portfolio' };

const TERM_PHRASE: Record<keyof ModeWeights, (t: PriorityTerms, role: CareerRoleId) => string> = {
  roleRelevance: (t, role) => `${getRole(role).label} weights this at ${Math.round(t.roleRelevance * 100)}%`,
  severity: (t) => `gap severity ${Math.round(t.severity * 100)}%`,
  lift: (t) => `proving it lifts role evidence by ${Math.round(t.lift * 100)}%`,
  urgency: (t) => `stage urgency ${Math.round(t.urgency * 100)}%`,
  retentionRisk: (t) => `${Math.round(t.retentionRisk * 100)}% decayed since last shown`,
  provenPenalty: (t) => `already ${Math.round(t.evidenceStrength * 100)}% evidenced`,
};

function rankWith(
  graph: CompetencyGraph,
  scope: PriorityScope,
  mode: OptimizationMode,
  asOf: string,
  limit: number,
  only: CompetencyId[] | undefined,
): PrioritizedAction[] {
  const campaign = scope.kind === 'campaign' ? scope.campaign : null;
  const w = MODE_WEIGHTS[mode];

  const ids = (only ?? (Object.keys(graph.nodes) as CompetencyId[])).filter(
    (id) => graph.nodes[id] != null,
  );

  const out: PrioritizedAction[] = [];

  for (const id of ids) {
    const node = graph.nodes[id];
    const { value: roleRelevance, role } = roleRelevanceFor(id, scope);
    // A competency no pursued role uses is not worth ranking at all.
    if (roleRelevance <= 0) continue;

    const roleWeightPct = roleWeight(role, id);
    const severity = severityFor(node);
    const lift = Math.round((roleWeightPct * (1 - node.confidence)) / 100 * 1000) / 1000;
    const urgency = mode === 'campaign' ? urgencyFromDays(campaign?.daysUntil ?? null) : 0;
    const retentionRisk = retentionRiskFor(node, asOf);
    const evidenceStrength = node.confidence;

    const action = chooseAction(node, roleWeightPct);
    const timeCostHours = ACTION_HOURS[action];

    const value =
      w.roleRelevance * roleRelevance +
      w.severity * severity +
      w.lift * lift +
      w.urgency * urgency +
      w.retentionRisk * retentionRisk -
      w.provenPenalty * evidenceStrength;

    // sqrt, not linear: a half-hour retest should be favoured over a six-hour build
    // at equal value, but not twelvefold — otherwise nothing substantial is ever
    // recommended and the model quietly optimises for busywork.
    const score = Math.round((value / Math.sqrt(timeCostHours)) * 1000) / 1000;

    const terms: PriorityTerms = {
      roleRelevance: Math.round(roleRelevance * 1000) / 1000,
      severity: Math.round(severity * 1000) / 1000,
      lift,
      urgency,
      retentionRisk,
      evidenceStrength,
      timeCostHours,
    };

    const contributions: { key: keyof ModeWeights; amount: number }[] = [
      { key: 'roleRelevance', amount: w.roleRelevance * roleRelevance },
      { key: 'severity', amount: w.severity * severity },
      { key: 'lift', amount: w.lift * lift },
      { key: 'urgency', amount: w.urgency * urgency },
      { key: 'retentionRisk', amount: w.retentionRisk * retentionRisk },
    ];
    const why = contributions
      .filter((c) => c.amount > 0.001)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3)
      .map((c) => TERM_PHRASE[c.key](terms, role));

    out.push({
      competency: id,
      label: getCompetency(id).label,
      mode,
      role,
      action,
      actionLabel: ACTION_LABEL[action],
      score,
      terms,
      why,
    });
  }

  return out
    .sort((a, b) => b.score - a.score || a.competency.localeCompare(b.competency))
    .slice(0, limit);
}

/**
 * Rank what to do next for one scope. Long-term ranks the declared target role;
 * campaign ranks the campaign's role. Neither can silently widen to a portfolio.
 */
export function prioritize(
  graph: CompetencyGraph,
  opts: PrioritizeOptions,
): PrioritizedAction[] {
  const scope: PriorityScope =
    opts.mode === 'campaign'
      ? { kind: 'campaign', campaign: opts.campaign }
      : { kind: 'role', role: opts.role };
  return rankWith(graph, scope, opts.mode, opts.asOf, opts.limit ?? 5, opts.only);
}

/**
 * Rank across every pursued role, tier-weighted. This is the old default, kept only
 * as an explicit choice — call it when comparing the portfolio is the actual question,
 * never as a stand-in for a target role that was not supplied.
 */
export function prioritizePortfolio(
  graph: CompetencyGraph,
  opts: PrioritizePortfolioOptions,
): PrioritizedAction[] {
  return rankWith(graph, { kind: 'portfolio' }, 'long-term', opts.asOf, opts.limit ?? 5, opts.only);
}

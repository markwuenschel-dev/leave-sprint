/**
 * THE COMPETENCY GRAPH — one longitudinal model of demonstrated capability.
 *
 * Every scored attempt is routed onto the canonical competency axis through the
 * three channels in domains.ts, weighted by the five spec factors in evidence.ts,
 * and rolled up per competency. Roles are then projections over this one structure
 * (see projection.ts) rather than independent scoreboards.
 *
 * Two properties are load-bearing and easy to get wrong:
 *
 *   1. One attempt contributes AT MOST ONCE to any competency, at its strongest
 *      channel. A coding grade tagged `Python` would otherwise land on
 *      `implementation` twice — once via task type, once via domain — and quietly
 *      double its own influence.
 *
 *   2. A competency with no evidence scores `null`, never 0. Those are completely
 *      different claims: 0 means "tried and failed", null means "never measured".
 *      Collapsing them is how a readiness model starts lying, so the distinction is
 *      preserved all the way to the UI (ScoreDonut already renders `null` as a
 *      dashed track — app/components/ui/ScoreDonut.tsx:24-37).
 */

import {
  type CompetencyGroup,
  type CompetencyId,
  COMPETENCIES,
  getCompetency,
} from './dimensions';
import {
  type ChannelId,
  CHANNEL_STRENGTH,
  competenciesForDomain,
  competenciesForTaskType,
} from './domains';
import {
  type CompetencyEvidence,
  type EvidenceWeightBreakdown,
  type StalenessRisk,
  domainContribution,
  recencyFactor,
  stalenessRisk,
  weighEvidence,
} from './evidence';

/** How much evidence weight saturates confidence. Four full-strength attempts. */
export const CONFIDENCE_SATURATION_WEIGHT = 4;
/** How many distinct attempts saturate the breadth term. */
export const CONFIDENCE_SATURATION_COUNT = 4;

export const CONFIDENCE_MIX = { volume: 0.5, breadth: 0.25, freshness: 0.25 } as const;

/** Below `emerging` a competency is not claimed at all. */
export const STATUS_THRESHOLDS = { emerging: 0.25, established: 0.5 } as const;

export type CompetencyStatus = 'unproven' | 'emerging' | 'established';

export interface CompetencyContribution {
  evidenceId: string;
  label?: string;
  date: string;
  score: number;
  channel: ChannelId;
  /** Evidence weight × channel strength × §9.4 domain position weight. */
  weight: number;
  breakdown: EvidenceWeightBreakdown;
}

export interface CompetencyNode {
  id: CompetencyId;
  label: string;
  group: CompetencyGroup;
  /** Weighted mean of contributing scores, 0–100. `null` when never measured. */
  score: number | null;
  /** Sum of contribution weights. */
  weight: number;
  /** Distinct attempts contributing. */
  count: number;
  /** 0–1. How much this score should be trusted. */
  confidence: number;
  status: CompetencyStatus;
  lastEvidenceDate: string | null;
  staleness: StalenessRisk;
  strongestChannel: ChannelId | null;
  /** Newest first, so "why is this my score?" is answerable in one click. */
  contributions: CompetencyContribution[];
}

export interface CompetencyGraph {
  /** The date the decay was computed against. Passed in — never `Date.now()`. */
  asOf: string;
  nodes: Record<CompetencyId, CompetencyNode>;
  /** Attempts that produced at least one contribution. */
  evidenceCount: number;
  /** Attempts that produced none — unscored, Class C, or unmappable tags. */
  unroutedCount: number;
}

/** Strongest-channel-wins routing for one attempt. */
function routeEvidence(e: CompetencyEvidence): Map<CompetencyId, { channel: ChannelId; positional: number }> {
  const hits = new Map<CompetencyId, { channel: ChannelId; positional: number }>();

  const consider = (id: CompetencyId, channel: ChannelId, positional: number) => {
    const strength = CHANNEL_STRENGTH[channel] * positional;
    const existing = hits.get(id);
    if (!existing) {
      hits.set(id, { channel, positional });
      return;
    }
    const existingStrength = CHANNEL_STRENGTH[existing.channel] * existing.positional;
    if (strength > existingStrength) hits.set(id, { channel, positional });
  };

  for (const id of e.competencies ?? []) consider(id, 'direct', 1);
  for (const id of competenciesForTaskType(e.taskType)) consider(id, 'taskType', 1);

  const domains = e.domains ?? [];
  for (let i = 0; i < domains.length; i += 1) {
    const positional = domainContribution(i);
    if (positional === 0) continue;
    for (const id of competenciesForDomain(domains[i])) consider(id, 'domain', positional);
  }

  return hits;
}

function emptyNode(id: CompetencyId): CompetencyNode {
  const c = getCompetency(id);
  return {
    id,
    label: c.label,
    group: c.group,
    score: null,
    weight: 0,
    count: 0,
    confidence: 0,
    status: 'unproven',
    lastEvidenceDate: null,
    staleness: 'Unknown',
    strongestChannel: null,
    contributions: [],
  };
}

function statusFor(confidence: number, hasScore: boolean): CompetencyStatus {
  if (!hasScore || confidence < STATUS_THRESHOLDS.emerging) return 'unproven';
  if (confidence < STATUS_THRESHOLDS.established) return 'emerging';
  return 'established';
}

/**
 * Build the graph.
 *
 * `asOf` is required rather than defaulted to today so the whole engine stays
 * clock-free and every test can assert exact numbers — the same discipline
 * vitest.config.mts:26 already imposes on the rest of the repo.
 */
export function buildCompetencyGraph(
  evidence: readonly CompetencyEvidence[],
  asOf: string,
): CompetencyGraph {
  const nodes = {} as Record<CompetencyId, CompetencyNode>;
  for (const c of COMPETENCIES) nodes[c.id] = emptyNode(c.id);

  let evidenceCount = 0;
  let unroutedCount = 0;

  for (const e of evidence) {
    // An unscored attempt carries no score signal. It still happened, but averaging
    // it in would require inventing a number, so it is reported as unrouted instead.
    if (e.score == null || !Number.isFinite(e.score)) {
      unroutedCount += 1;
      continue;
    }
    const breakdown = weighEvidence(e, asOf);
    if (breakdown.total <= 0) {
      // Class C is defined as not numerically scorable (§10). Excluded by weight, by design.
      unroutedCount += 1;
      continue;
    }

    const routed = routeEvidence(e);
    if (routed.size === 0) {
      unroutedCount += 1;
      continue;
    }
    evidenceCount += 1;

    for (const [id, { channel, positional }] of routed) {
      const weight = breakdown.total * CHANNEL_STRENGTH[channel] * positional;
      if (weight <= 0) continue;
      const node = nodes[id];
      node.contributions.push({
        evidenceId: e.id,
        ...(e.label != null ? { label: e.label } : {}),
        date: e.date,
        score: e.score,
        channel,
        weight,
        breakdown,
      });
    }
  }

  for (const id of Object.keys(nodes) as CompetencyId[]) {
    const node = nodes[id];
    if (node.contributions.length === 0) continue;

    node.contributions.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

    let weighted = 0;
    let total = 0;
    let best: ChannelId | null = null;
    let bestStrength = 0;
    const seen = new Set<string>();
    let latest = node.contributions[0].date;

    for (const c of node.contributions) {
      weighted += c.score * c.weight;
      total += c.weight;
      seen.add(c.evidenceId);
      if (c.date > latest) latest = c.date;
      const s = CHANNEL_STRENGTH[c.channel];
      if (s > bestStrength) {
        bestStrength = s;
        best = c.channel;
      }
    }

    node.weight = total;
    node.count = seen.size;
    node.score = total > 0 ? Math.round((weighted / total) * 10) / 10 : null;
    node.lastEvidenceDate = latest;
    node.staleness = stalenessRisk(latest, asOf);
    node.strongestChannel = best;

    const volume = Math.min(1, total / CONFIDENCE_SATURATION_WEIGHT);
    const breadth = Math.min(1, node.count / CONFIDENCE_SATURATION_COUNT);
    const freshness = recencyFactor(latest, asOf);
    node.confidence =
      Math.round(
        (CONFIDENCE_MIX.volume * volume +
          CONFIDENCE_MIX.breadth * breadth +
          CONFIDENCE_MIX.freshness * freshness) *
          1000,
      ) / 1000;
    node.status = statusFor(node.confidence, node.score != null);
  }

  return { asOf, nodes, evidenceCount, unroutedCount };
}

/** Nodes as a stable array, registry order. */
export function graphNodes(graph: CompetencyGraph): CompetencyNode[] {
  return COMPETENCIES.map((c) => graph.nodes[c.id]);
}

/** Nodes carrying any evidence at all, strongest first. */
export function provenNodes(graph: CompetencyGraph): CompetencyNode[] {
  return graphNodes(graph)
    .filter((n) => n.status !== 'unproven')
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || a.id.localeCompare(b.id));
}

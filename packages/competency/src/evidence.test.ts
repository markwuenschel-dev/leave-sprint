/**
 * Pins the five spec weighting factors (§10 class, §12 assistance, §17.5 source,
 * §17.7 LLM independence, §17.10 staleness) and the §9.4 positional weights.
 *
 * Regression class: a calibration constant drifting away from the spec table it
 * claims to reproduce (an 0.4 quietly becoming 0.5 rescales every historical
 * score), a factor escaping [0, 1] and letting one item outweigh several, decay
 * that no longer passes through the documented Low/Medium/High bands, and a gap
 * tag silently dropping out of the tally instead of landing in `unclassified`.
 *
 * All dates are literals or offsets from a literal — no clock is read.
 */

import { describe, expect, it } from 'vitest';

import {
  type CompetencyEvidence,
  type GapKind,
  type LlmSignals,
  DEFAULT_SOURCE_STRENGTH,
  DOMAIN_CONTRIBUTION,
  EVIDENCE_CLASS_WEIGHT,
  RECENCY_FLOOR,
  RECENCY_HALF_LIFE_DAYS,
  assistanceFactor,
  classifyGap,
  daysBetween,
  domainContribution,
  isEvidenceClassId,
  llmFactor,
  recencyFactor,
  sourceFactor,
  stalenessRisk,
  tallyGapKinds,
  weighEvidence,
} from './evidence';

const ASOF = '2026-08-23';

/** Clock-free: derived from the literal above, never from `new Date()`. */
function isoDaysBefore(days: number, asOf: string = ASOF): string {
  return new Date(Date.parse(asOf) - days * 86_400_000).toISOString().slice(0, 10);
}

function ev(over: Partial<CompetencyEvidence> & { id: string }): CompetencyEvidence {
  return { date: ASOF, score: 80, ...over };
}

describe('EVIDENCE_CLASS_WEIGHT (§10)', () => {
  it('matches the spec table exactly', () => {
    expect(EVIDENCE_CLASS_WEIGHT).toEqual({
      prospective: 1.0,
      classA: 0.75,
      classB: 0.4,
      classC: 0.0,
    });
  });

  it('is strictly ordered and only classC is zero', () => {
    expect(EVIDENCE_CLASS_WEIGHT.prospective).toBeGreaterThan(EVIDENCE_CLASS_WEIGHT.classA);
    expect(EVIDENCE_CLASS_WEIGHT.classA).toBeGreaterThan(EVIDENCE_CLASS_WEIGHT.classB);
    expect(EVIDENCE_CLASS_WEIGHT.classB).toBeGreaterThan(EVIDENCE_CLASS_WEIGHT.classC);
    expect(EVIDENCE_CLASS_WEIGHT.classC).toBe(0);
  });

  it('guards ids', () => {
    expect(isEvidenceClassId('classB')).toBe(true);
    expect(isEvidenceClassId('classD')).toBe(false);
    expect(isEvidenceClassId(null)).toBe(false);
    expect(isEvidenceClassId(0.75)).toBe(false);
  });
});

describe('assistanceFactor (§12)', () => {
  it('treats A0 and A1 alike as full autonomy', () => {
    expect(assistanceFactor(0)).toBe(1.0);
    expect(assistanceFactor(1)).toBe(1.0);
  });

  it('is monotonically non-increasing across levels 0..5', () => {
    const series = [0, 1, 2, 3, 4, 5].map((l) => assistanceFactor(l));
    expect(series).toEqual([1.0, 1.0, 0.85, 0.6, 0.35, 0.2]);
    for (let i = 1; i < series.length; i += 1) {
      expect(series[i], `level ${i}`).toBeLessThanOrEqual(series[i - 1]);
    }
  });

  it('never drops to zero — A5 still describes something that happened', () => {
    for (const l of [0, 1, 2, 3, 4, 5]) {
      expect(assistanceFactor(l), `level ${l}`).toBeGreaterThan(0);
      expect(assistanceFactor(l), `level ${l}`).toBeLessThanOrEqual(1);
    }
  });

  it('clamps out-of-range levels into the table', () => {
    expect(assistanceFactor(-3)).toBe(1.0);
    expect(assistanceFactor(9)).toBe(0.2);
    expect(assistanceFactor(5.4)).toBe(0.2);
  });

  it('rounds fractional levels to the nearest band', () => {
    expect(assistanceFactor(2.4)).toBe(0.85);
    expect(assistanceFactor(2.5)).toBe(0.6);
  });

  it('defaults to 1.0 for null, undefined and non-finite input', () => {
    expect(assistanceFactor(null)).toBe(1.0);
    expect(assistanceFactor(undefined)).toBe(1.0);
    expect(assistanceFactor(Number.NaN)).toBe(1.0);
    expect(assistanceFactor(Number.POSITIVE_INFINITY)).toBe(1.0);
  });
});

describe('llmFactor (§17.7)', () => {
  it('is neutral when there is no LLM signal at all', () => {
    expect(llmFactor(undefined)).toBe(1.0);
    expect(llmFactor(null)).toBe(1.0);
    expect(llmFactor({})).toBe(1.0);
    expect(llmFactor({ used: false })).toBe(1.0);
    // Artefact flags without `used` do not discount — `used !== true` short-circuits.
    expect(llmFactor({ used: false, answerDrafted: true })).toBe(1.0);
  });

  it('discounts mere use by a small amount', () => {
    expect(llmFactor({ used: true })).toBeCloseTo(0.85, 10);
  });

  it('discounts generated artefacts to at most 0.5', () => {
    expect(llmFactor({ used: true, answerDrafted: true })).toBeLessThanOrEqual(0.5);
    expect(llmFactor({ used: true, answerDrafted: true })).toBeCloseTo(0.5, 10);
    expect(llmFactor({ used: true, implementationGenerated: true })).toBeCloseTo(0.5, 10);
    expect(llmFactor({ used: true, testsGenerated: true })).toBeCloseTo(0.7225, 6);
  });

  it('lets recovery signals raise the factor back up', () => {
    const drafted = llmFactor({ used: true, answerDrafted: true });
    expect(llmFactor({ used: true, answerDrafted: true, reproducedWithout: true })).toBeGreaterThan(
      drafted,
    );
    expect(llmFactor({ used: true, answerDrafted: true, explainedWithout: true })).toBeGreaterThan(
      drafted,
    );
    expect(
      llmFactor({ used: true, answerDrafted: true, reproducedWithout: true }),
    ).toBeCloseTo(0.6, 10);
    expect(
      llmFactor({ used: true, answerDrafted: true, explainedWithout: true }),
    ).toBeCloseTo(0.575, 10);
    expect(
      llmFactor({
        used: true,
        answerDrafted: true,
        reproducedWithout: true,
        explainedWithout: true,
      }),
    ).toBeCloseTo(0.69, 10);
  });

  it('caps at 1.0 — full recovery from mere use returns to neutral, never above it', () => {
    expect(llmFactor({ used: true, reproducedWithout: true, explainedWithout: true })).toBe(1);
  });

  it('lands inside [0, 1] for every combination of the five signals', () => {
    const keys: (keyof LlmSignals)[] = [
      'implementationGenerated',
      'testsGenerated',
      'answerDrafted',
      'reproducedWithout',
      'explainedWithout',
    ];
    for (let mask = 0; mask < 1 << keys.length; mask += 1) {
      const sig: LlmSignals = { used: true };
      keys.forEach((k, i) => {
        if (mask & (1 << i)) sig[k] = true;
      });
      const f = llmFactor(sig);
      expect(f, JSON.stringify(sig)).toBeGreaterThanOrEqual(0);
      expect(f, JSON.stringify(sig)).toBeLessThanOrEqual(1);
    }
  });
});

describe('sourceFactor (§17.5)', () => {
  it('uses the neutral default when no source is recorded', () => {
    expect(sourceFactor(undefined)).toBe(DEFAULT_SOURCE_STRENGTH);
    expect(sourceFactor(null)).toBe(DEFAULT_SOURCE_STRENGTH);
    expect(sourceFactor([])).toBe(DEFAULT_SOURCE_STRENGTH);
  });

  it('takes the strongest listed source, not the average', () => {
    expect(sourceFactor(['written answer', 'live coding'])).toBe(1.0);
    expect(sourceFactor(['written answer'])).toBe(0.75);
  });

  it('is case- and whitespace-insensitive', () => {
    expect(sourceFactor(['  Live Coding '])).toBe(1.0);
  });

  it('falls back to the default when nothing recognisable is listed', () => {
    expect(sourceFactor(['carrier pigeon'])).toBe(DEFAULT_SOURCE_STRENGTH);
  });

  it('does not resolve an Object.prototype key through the strength table', () => {
    // `evidenceSource` is a free string[] upstream, so a bare index would let
    // "toString" resolve to a Function and poison the multiplicative weight.
    for (const key of ['toString', 'constructor', 'valueOf', 'hasOwnProperty']) {
      expect(sourceFactor([key]), key).toBe(DEFAULT_SOURCE_STRENGTH);
    }
    expect(sourceFactor(['toString', 'live coding'])).toBe(1.0);
  });
});

describe('recencyFactor (§17.10)', () => {
  it('confirms the day offsets this suite relies on', () => {
    expect(daysBetween(isoDaysBefore(14), ASOF)).toBe(14);
    expect(daysBetween(isoDaysBefore(45), ASOF)).toBe(45);
    expect(daysBetween(isoDaysBefore(120), ASOF)).toBe(120);
    expect(daysBetween('nonsense', ASOF)).toBeNull();
    expect(daysBetween(ASOF, 'nonsense')).toBeNull();
  });

  it('is 1.0 for same-day evidence', () => {
    expect(recencyFactor(ASOF, ASOF)).toBe(1.0);
  });

  it('is 1.0 for future-dated evidence rather than dropping it', () => {
    expect(recencyFactor('2027-01-01', ASOF)).toBe(1.0);
  });

  it('is 1.0 for an unparseable date rather than deleting the attempt', () => {
    expect(recencyFactor('not-a-date', ASOF)).toBe(1.0);
  });

  it('hits the calibration the docblock claims', () => {
    expect(recencyFactor(isoDaysBefore(14), ASOF)).toBeCloseTo(0.9, 2);
    expect(recencyFactor(isoDaysBefore(45), ASOF)).toBeCloseTo(0.71, 2);
    expect(recencyFactor(isoDaysBefore(120), ASOF)).toBeCloseTo(0.4, 2);
  });

  it('halves at exactly the stated half-life', () => {
    expect(recencyFactor(isoDaysBefore(RECENCY_HALF_LIFE_DAYS), ASOF)).toBeCloseTo(0.5, 10);
  });

  it('decreases strictly with age until the floor, then holds', () => {
    let prev = recencyFactor(ASOF, ASOF);
    for (let d = 5; d <= 200; d += 5) {
      const f = recencyFactor(isoDaysBefore(d), ASOF);
      expect(f, `day ${d}`).toBeLessThan(prev);
      prev = f;
    }
    for (const d of [400, 800, 3650]) {
      expect(recencyFactor(isoDaysBefore(d), ASOF), `day ${d}`).toBe(RECENCY_FLOOR);
    }
  });

  it('never falls below the floor for any age', () => {
    for (let d = 0; d <= 2000; d += 37) {
      const f = recencyFactor(isoDaysBefore(d), ASOF);
      expect(f, `day ${d}`).toBeGreaterThanOrEqual(RECENCY_FLOOR);
      expect(f, `day ${d}`).toBeLessThanOrEqual(1);
    }
  });
});

describe('stalenessRisk band boundaries (§17.10)', () => {
  it('places exactly 14 days in Low and 15 in Medium', () => {
    expect(stalenessRisk(isoDaysBefore(14), ASOF)).toBe('Low');
    expect(stalenessRisk(isoDaysBefore(15), ASOF)).toBe('Medium');
  });

  it('places exactly 45 days in Medium and 46 in High', () => {
    expect(stalenessRisk(isoDaysBefore(45), ASOF)).toBe('Medium');
    expect(stalenessRisk(isoDaysBefore(46), ASOF)).toBe('High');
  });

  it('treats same-day and future-dated evidence as Low', () => {
    expect(stalenessRisk(ASOF, ASOF)).toBe('Low');
    expect(stalenessRisk('2027-01-01', ASOF)).toBe('Low');
  });

  it('returns Unknown for an unparseable date', () => {
    expect(stalenessRisk('', ASOF)).toBe('Unknown');
    expect(stalenessRisk('yesterday-ish', ASOF)).toBe('Unknown');
    expect(stalenessRisk(ASOF, 'whenever')).toBe('Unknown');
  });
});

describe('domainContribution (§9.4)', () => {
  it('is 0.6 / 0.25 / 0.15 then nothing', () => {
    expect(DOMAIN_CONTRIBUTION).toEqual([0.6, 0.25, 0.15]);
    expect(domainContribution(0)).toBe(0.6);
    expect(domainContribution(1)).toBe(0.25);
    expect(domainContribution(2)).toBe(0.15);
    expect(domainContribution(3)).toBe(0);
    expect(domainContribution(10)).toBe(0);
  });

  it('sums to 1 across the three declared positions', () => {
    expect(domainContribution(0) + domainContribution(1) + domainContribution(2)).toBeCloseTo(1, 10);
  });

  it('is 0 for a negative index', () => {
    expect(domainContribution(-1)).toBe(0);
  });
});

describe('weighEvidence', () => {
  it('total is exactly the product of the five factors', () => {
    const b = weighEvidence(
      ev({
        id: 'w1',
        date: isoDaysBefore(30),
        evidenceClass: 'classA',
        assistanceLevel: 3,
        llm: { used: true, testsGenerated: true },
        sources: ['written answer'],
      }),
      ASOF,
    );
    expect(b.evidenceClass).toBe(0.75);
    expect(b.assistance).toBe(0.6);
    expect(b.llm).toBeCloseTo(0.7225, 10);
    expect(b.source).toBe(0.75);
    expect(b.recency).toBeCloseTo(Math.pow(0.5, 30 / 90), 10);
    expect(b.total).toBe(b.evidenceClass * b.assistance * b.llm * b.source * b.recency);
  });

  it('is a clean 1.0 for prospective, unaided, LLM-free, live-coding, same-day evidence', () => {
    const b = weighEvidence(
      ev({ id: 'w2', evidenceClass: 'prospective', assistanceLevel: 0, sources: ['live coding'] }),
      ASOF,
    );
    expect(b.total).toBe(1);
  });

  it('treats a missing evidenceClass as neutral, not as Class C', () => {
    const b = weighEvidence(ev({ id: 'w3', sources: ['live coding'] }), ASOF);
    expect(b.evidenceClass).toBe(1);
    expect(b.total).toBe(1);
  });

  it('a Class C item totals exactly 0 whatever else it carries', () => {
    const b = weighEvidence(
      ev({
        id: 'w4',
        evidenceClass: 'classC',
        assistanceLevel: 0,
        sources: ['real interview feedback'],
      }),
      ASOF,
    );
    expect(b.evidenceClass).toBe(0);
    expect(b.total).toBe(0);
  });

  it('every factor and the total land inside [0, 1]', () => {
    const b = weighEvidence(
      ev({
        id: 'w5',
        date: isoDaysBefore(365),
        evidenceClass: 'classB',
        assistanceLevel: 5,
        llm: { used: true, implementationGenerated: true, testsGenerated: true },
        sources: ['README or design doc'],
      }),
      ASOF,
    );
    for (const [k, v] of Object.entries(b)) {
      expect(v, k).toBeGreaterThanOrEqual(0);
      expect(v, k).toBeLessThanOrEqual(1);
    }
  });
});

describe('classifyGap / tallyGapKinds', () => {
  const SPEC_GAP_TYPES: [string, GapKind][] = [
    ['Conceptual gap', 'conceptual'],
    ['Mechanism gap', 'conceptual'],
    ['Application gap', 'application'],
    ['Tradeoff gap', 'application'],
    ['Verification gap', 'execution'],
    ['Autonomy gap', 'execution'],
    ['Communication gap', 'communication'],
    ['Recall gap', 'retrieval'],
    ['Scope gap', 'application'],
    ['Evidence quality gap', 'record'],
    ['Requirements translation gap', 'communication'],
  ];

  it('maps all eleven spec GAP_TYPES to their documented kind', () => {
    expect(SPEC_GAP_TYPES).toHaveLength(11);
    for (const [tag, kind] of SPEC_GAP_TYPES) {
      expect(classifyGap(tag), tag).toBe(kind);
    }
  });

  it('maps the weakness tags that carry retrieval / communication / execution signal', () => {
    expect(classifyGap('Terminology imprecision')).toBe('retrieval');
    expect(classifyGap('Definition gap')).toBe('retrieval');
    expect(classifyGap('Interview phrasing gap')).toBe('communication');
    expect(classifyGap('Incomplete execution')).toBe('execution');
  });

  it('is case- and whitespace-insensitive', () => {
    expect(classifyGap('CONCEPTUAL GAP')).toBe('conceptual');
    expect(classifyGap('  recall gap  ')).toBe('retrieval');
    expect(classifyGap('Evidence Quality Gap')).toBe('record');
  });

  it('returns unclassified for anything unrecognised', () => {
    expect(classifyGap('vibes gap')).toBe('unclassified');
    expect(classifyGap('')).toBe('unclassified');
  });

  it('keeps the record bucket separate from the five skill families', () => {
    expect(classifyGap('Evidence quality gap')).toBe('record');
    expect(classifyGap('Evidence quality gap')).not.toBe('execution');
  });

  it('tallies every tag, counting unclassified rather than dropping it', () => {
    const tally = tallyGapKinds([
      'Conceptual gap',
      'mechanism gap',
      'Recall gap',
      'Scope gap',
      'Communication gap',
      'Autonomy gap',
      'Evidence quality gap',
      'vibes gap',
      'another mystery',
    ]);
    expect(tally).toEqual({
      conceptual: 2,
      retrieval: 1,
      application: 1,
      communication: 1,
      execution: 1,
      record: 1,
      unclassified: 2,
    });
    const total = Object.values(tally).reduce((a, n) => a + n, 0);
    expect(total).toBe(9);
  });

  it('returns an all-zero tally for no tags', () => {
    expect(tallyGapKinds([])).toEqual({
      conceptual: 0,
      retrieval: 0,
      application: 0,
      communication: 0,
      execution: 0,
      record: 0,
      unclassified: 0,
    });
  });
});

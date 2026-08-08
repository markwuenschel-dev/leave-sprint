import { describe, expect, it } from 'vitest';

import { normalizeTags } from './aliases';
import { clusterForTag, KGTAG_CLUSTERS } from './clusters';
import { RD } from './referenceData';

describe('normalizeTags', () => {
  it('maps a retired weakness tag onto its canonical replacement', () => {
    expect(normalizeTags(['Shallow reasoning'], 'weaknessTags')).toEqual(['Mechanism gap']);
    expect(normalizeTags(['No test strategy'], 'weaknessTags')).toEqual(['Validation gap']);
  });

  it('collapses several retired tags that share one canonical target', () => {
    expect(
      normalizeTags(
        ['Shallow reasoning', 'Mechanism not explained', 'Operational mechanism partially implicit'],
        'weaknessTags',
      ),
    ).toEqual(['Mechanism gap']);
  });

  it('passes an unmapped tag through unchanged', () => {
    expect(normalizeTags(['Some brand new tag'], 'weaknessTags')).toEqual(['Some brand new tag']);
  });

  it('is case sensitive — only the exact recorded spellings are aliased', () => {
    expect(normalizeTags(['tradeoff missing'], 'weaknessTags')).toEqual(['Thin tradeoff analysis']);
    expect(normalizeTags(['Tradeoff missing'], 'weaknessTags')).toEqual(['Thin tradeoff analysis']);
    expect(normalizeTags(['TRADEOFF MISSING'], 'weaknessTags')).toEqual(['TRADEOFF MISSING']);
  });

  it('preserves first-seen order while deduping', () => {
    expect(
      normalizeTags(['Missed edge cases', 'Shallow reasoning', 'Edge-case gap'], 'weaknessTags'),
    ).toEqual(['Edge-case gap', 'Mechanism gap']);
  });

  it('returns an empty array for anything that is not an array', () => {
    expect(normalizeTags('Shallow reasoning', 'weaknessTags')).toEqual([]);
    expect(normalizeTags(null, 'weaknessTags')).toEqual([]);
    expect(normalizeTags(undefined, 'weaknessTags')).toEqual([]);
    expect(normalizeTags({ 0: 'Shallow reasoning' }, 'weaknessTags')).toEqual([]);
  });

  it('skips non-string members instead of throwing on them', () => {
    expect(normalizeTags([1, null, undefined, 'Shallow reasoning', {}], 'weaknessTags')).toEqual([
      'Mechanism gap',
    ]);
    expect(normalizeTags([], 'weaknessTags')).toEqual([]);
  });

  it('uses a separate map per tag class', () => {
    // 'mechanism' is a gapTypes alias, not a weaknessTags one.
    expect(normalizeTags(['mechanism'], 'gapTypes')).toEqual(['Mechanism gap']);
    expect(normalizeTags(['mechanism'], 'weaknessTags')).toEqual(['mechanism']);
    expect(normalizeTags(['precision'], 'gapTypes')).toEqual(['Communication gap']);
  });

  it('normalises knowledge-gap tags onto the canonical cluster vocabulary', () => {
    expect(normalizeTags(['Docker image vs container'], 'knowledgeGapTags')).toEqual([
      'Docker image versus running container',
    ]);
    expect(normalizeTags(['watermarks'], 'knowledgeGapTags')).toEqual([
      'Watermarks and late-arriving data',
    ]);
  });
});

describe('alias-map invariants', () => {
  it('is idempotent — normalising an already-canonical tag is a fixed point', () => {
    const canonical = Object.values(KGTAG_CLUSTERS).flat();
    for (const tag of canonical) {
      expect(normalizeTags([tag], 'knowledgeGapTags')).toEqual([tag]);
    }
    for (const tag of RD.weaknessTags) {
      expect(normalizeTags([tag], 'weaknessTags')).toEqual([tag]);
    }
  });

  it('resolves every aliased weakness tag into the canonical RD.weaknessTags set', () => {
    const legacy = [
      'Shallow reasoning',
      'Explanation unclear',
      'Alternatives not considered',
      'Scope or blast radius missed',
      'Missing failure handling',
      'Insufficient validation',
      'Evidence gaps',
      'Missed edge cases',
      'No complexity analysis stated',
      'Excessive prompting',
      'incomplete-definition',
      'imprecise terminology',
      'Needs interview phrasing polish',
      'limited example depth',
      'Minor code cleanup',
    ];
    const canonical: readonly string[] = RD.weaknessTags;
    const offenders = legacy
      .map((tag) => ({ tag, mapped: normalizeTags([tag], 'weaknessTags')[0] }))
      .filter(({ mapped }) => !canonical.includes(mapped))
      .map(({ tag, mapped }) => `${tag} -> ${mapped}`);
    expect(offenders).toEqual([]);
  });

  it('resolves every aliased knowledge tag into a classified cluster, never "Other"', () => {
    const legacy = [
      'Docker image vs container',
      'Docker image vs running container',
      'Dockerfile vs docker-compose.yml',
      'Host port vs container port',
      'temporal leakage',
      'out-of-time validation',
      'event time',
      'watermarks',
      'backpressure',
      'micro-batching',
      'selection mechanism',
      'representativeness',
      'bootstrap uncertainty vs bias',
      'Spring API boundary vs framework-owned concept',
      'Correlation ID vs trace ID',
    ];
    const unclassified = legacy
      .map((tag) => ({ tag, mapped: normalizeTags([tag], 'knowledgeGapTags')[0] }))
      .filter(({ mapped }) => clusterForTag(mapped) === 'Other')
      .map(({ tag, mapped }) => `${tag} -> ${mapped}`);
    expect(unclassified).toEqual([]);
  });
});

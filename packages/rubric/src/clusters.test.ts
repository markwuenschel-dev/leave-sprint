import { describe, expect, it } from 'vitest';

import { clusterForTag, KGTAG_CLUSTERS } from './clusters';

describe('clusterForTag', () => {
  it('resolves a tag to the cluster that lists it', () => {
    expect(clusterForTag('React state ownership')).toBe('React / TS UI state');
    expect(clusterForTag('Composite index column order')).toBe('SQL / data modeling');
    expect(clusterForTag('Backpressure')).toBe('Data engineering pipelines');
    expect(clusterForTag('Measure versus dimension distinction')).toBe('BI / analytics communication');
  });

  it('falls back to "Other" for an unclassified tag', () => {
    expect(clusterForTag('Nothing in particular')).toBe('Other');
    expect(clusterForTag('')).toBe('Other');
  });

  it('matches exactly — near-miss spellings are not classified', () => {
    expect(clusterForTag('backpressure')).toBe('Other');
    expect(clusterForTag('React state ownership ')).toBe('Other');
  });

  it('classifies every declared member of every cluster', () => {
    const misfiled: string[] = [];
    for (const [cluster, members] of Object.entries(KGTAG_CLUSTERS)) {
      for (const tag of members) {
        const got = clusterForTag(tag);
        if (got !== cluster) misfiled.push(`${tag}: expected ${cluster}, got ${got}`);
      }
    }
    expect(misfiled).toEqual([]);
  });
});

describe('KGTAG_CLUSTERS shape', () => {
  it('assigns each tag to exactly one cluster', () => {
    const owner = new Map<string, string>();
    const duplicates: string[] = [];
    for (const [cluster, members] of Object.entries(KGTAG_CLUSTERS)) {
      for (const tag of members) {
        if (owner.has(tag)) duplicates.push(`${tag} (${owner.get(tag)} + ${cluster})`);
        else owner.set(tag, cluster);
      }
    }
    // A tag in two clusters would make the dashboard cluster counts double-count it.
    expect(duplicates).toEqual([]);
  });

  it('has no empty cluster', () => {
    const empty = Object.entries(KGTAG_CLUSTERS)
      .filter(([, members]) => members.length === 0)
      .map(([cluster]) => cluster);
    expect(empty).toEqual([]);
  });

  it('never names a cluster "Other", which is the reserved fallback', () => {
    expect(Object.keys(KGTAG_CLUSTERS)).not.toContain('Other');
  });
});

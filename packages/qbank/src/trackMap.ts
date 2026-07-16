/** QB_TRACK_MAP — track → rubric classification for the mastered→log bridge. */

import type { TrackKey, TrackMapEntry } from './types';

export const QB_TRACK_MAP: Record<TrackKey, TrackMapEntry> = {
  swe: { taskType: 'coding', domain: 'Java', role: 'SWE' },
  mle: { taskType: 'knowledge', domain: 'Machine Learning', role: 'MLE' },
  ds: { taskType: 'knowledge', domain: 'Statistical Analysis', role: 'DS' },
  de: { taskType: 'knowledge', domain: 'Data Engineering', role: 'DE' },
  react: { taskType: 'coding', domain: 'TypeScript', role: 'SWE' },
  sql: { taskType: 'knowledge', domain: 'SQL', role: 'DE' },
  sdlc: { taskType: 'knowledge', domain: 'Docker/CI/CD', role: 'SWE' },
  diag: { taskType: 'coding', domain: 'Backend/API Engineering', role: 'SWE' },
  // The bi track is calculated fields, semantic layers, and dashboard performance
  // — BIE work. BIA (business context, stakeholder translation) has no questions
  // yet, so nothing routes there until the track grows.
  bi: { taskType: 'knowledge', domain: 'Data Analysis', role: 'BIE' },
};

/** Reverse lookup: a RubricEntry's primaryDomain (e.g. "SQL") -> the qbank track that covers it, if any. */
export function domainToTrack(domain: string): TrackKey | null {
  const hit = (Object.entries(QB_TRACK_MAP) as [TrackKey, TrackMapEntry][]).find(
    ([, v]) => v.domain === domain,
  );
  return hit ? hit[0] : null;
}

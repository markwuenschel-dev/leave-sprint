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
};

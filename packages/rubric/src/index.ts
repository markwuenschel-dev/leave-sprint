export * from './referenceData';
export * from './types';
export * from './scoring';
export * from './normalize';
export * from './promotion';
export * from './clusters';
export * from './io';
export * from './difficulty';
// diagnostics: import from '@waypoint/rubric/diagnostics' path if needed —
// types re-exports GateVerdict etc., so do not export * diagnostics here.
export {
  ROLE_WEIGHT_TABLE,
  TARGET_ROLES,
  ROLE_WEIGHT_TIERS,
  roleTier,
  ROLE_TIER_WEIGHT,
} from './diagnostics';
export * from './dashboards';
export * from './aliases';

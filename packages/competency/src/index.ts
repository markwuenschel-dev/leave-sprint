/**
 * @waypoint/competency — the single longitudinal competency graph.
 *
 * Pure data and pure functions: no I/O, no clock, no dependency on any other
 * @waypoint package. Callers pass `asOf` explicitly so every number is reproducible.
 *
 *   roles.ts       the one canonical role vocabulary (incl. Red Team)
 *   dimensions.ts  §9.3 role weights refolded onto shared competency ids
 *   domains.ts     the technical-domain axis and the feeder edges into competencies
 *   evidence.ts    §10/§12/§17.5/§17.7/§17.10 weighting, finally applied
 *   graph.ts       evidence -> competency nodes with score, confidence and status
 *   projection.ts  competency nodes -> per-role readiness
 *   prioritize.ts  long-term vs campaign ranking of what to do next
 */

export * from './roles';
export * from './dimensions';
export * from './domains';
export * from './evidence';
export * from './graph';
export * from './projection';
export * from './prioritize';

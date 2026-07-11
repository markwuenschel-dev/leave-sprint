/**
 * Portfolio ingest — wire externally-extracted project data into Waypoint.
 * Flow: your LLM emits a PortfolioHandoff JSON (see HANDOFF.md) → validateHandoff
 * grounds + repairs it → toDefenseItems / toTieMap project it → mergeDefense
 * folds it into state without wiping practice progress.
 */

export * from "./schema";
export { validateHandoff, summarizeReport, type ValidationReport } from "./validate";
export { defenseId, dedupeIds, slug, conceptSlug } from "./ids";
export {
  toDefenseItems,
  toTieMap,
  mergeDefense,
  mergeProjectDefense,
  type DefenseProjection,
  type TieResult,
} from "./project";

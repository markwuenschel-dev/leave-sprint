/**
 * LEGACY ROLE VOCABULARY → CANONICAL `CareerRoleId`.
 *
 * The repo accumulated nine overlapping ways to say "role" (enumerated in the
 * docblock of packages/competency/src/roles.ts). None of them are deleted here —
 * they are load-bearing for persisted rows, for the grade form, and for the
 * evidence floor. This module is the one-way bridge that lets the competency graph
 * consume all of them without any of them having to change.
 *
 * It lives in the app rather than in @waypoint/competency on purpose: the app is
 * the only layer that knows about all the vocabularies at once, and the package
 * stays free of legacy knowledge it would otherwise have to carry forever.
 *
 * Every mapper returns `null` rather than guessing. That is the whole point — the
 * bug this replaces is `roleTier` (packages/rubric/src/diagnostics.ts:69-75)
 * silently defaulting an unrecognised role to 'Secondary' and giving it a
 * plausible-looking but arbitrary weight.
 */

import { type CareerRoleId, isCareerRoleId } from "@waypoint/competency";
import type { PrimaryRole, RoleFilter, TargetRole } from "@/lib/domain";

/**
 * Guarded index. Every input here is a free string off persisted data, so a bare
 * `map[key]` could resolve an inherited Object.prototype member instead of missing.
 */
function lookup(map: Record<string, CareerRoleId>, key: string): CareerRoleId | null {
  return Object.hasOwn(map, key) ? map[key] : null;
}

/** `RD.roles` ids — packages/rubric/src/referenceData.ts:244-251. */
const RUBRIC_ROLE_TO_CAREER: Record<string, CareerRoleId> = {
  SWE: "swe",
  MLE: "mle",
  DS: "ds",
  DE: "de",
  BIE: "bie",
  BIA: "bia",
};

/** `RoleFilter` — apps/waypoint/lib/domain.ts:18. "ALL" is a scope, not a role. */
export function careerRoleFromFilter(filter: RoleFilter): CareerRoleId | null {
  if (filter === "ALL") return null;
  return lookup(RUBRIC_ROLE_TO_CAREER, filter);
}

/** `PrimaryRole` — apps/waypoint/lib/domain.ts:19. The two evidence-floor roles. */
export function careerRoleFromPrimary(role: PrimaryRole): CareerRoleId {
  return role === "SWE_FS_II" ? "swe" : "mle";
}

/** `TargetRole` — apps/waypoint/lib/domain.ts:51-58, used on application rows. */
export function careerRoleFromTarget(role: TargetRole): CareerRoleId | null {
  if (role === "SWE_FS_II") return "swe";
  if (role === "MLE_II") return "mle";
  if (role === "other") return null;
  return lookup(RUBRIC_ROLE_TO_CAREER, role);
}

/**
 * `RubricEntry.primaryRole` — a `Role | ''` (packages/rubric/src/types.ts:67).
 * Empty string is extremely common on imported history, so `null` is the normal
 * answer here, not an error case.
 */
export function careerRoleFromRubric(role: string | null | undefined): CareerRoleId | null {
  if (!role) return null;
  if (isCareerRoleId(role)) return role;
  return lookup(RUBRIC_ROLE_TO_CAREER, role);
}

/**
 * Q-Bank `TrackKey` — packages/qbank/src/types.ts:5.
 *
 * The mapping mirrors QB_TRACK_MAP.role (packages/qbank/src/trackMap.ts:5-18) so
 * the two never disagree: react/sdlc/diag are SWE-flavoured, sql is DE, bi is BIE.
 */
const TRACK_TO_CAREER: Record<string, CareerRoleId> = {
  swe: "swe",
  mle: "mle",
  ds: "ds",
  de: "de",
  react: "swe",
  sql: "de",
  sdlc: "swe",
  diag: "swe",
  bi: "bie",
};

export function careerRoleFromTrack(track: string | null | undefined): CareerRoleId | null {
  if (!track) return null;
  return lookup(TRACK_TO_CAREER, track);
}

/**
 * The reverse direction, for surfaces that still speak `RoleFilter`.
 * `redteam` has no legacy counterpart, so it maps to `null` — a caller that needs
 * to filter legacy data by Red Team has no legacy data to filter.
 */
export function filterFromCareerRole(role: CareerRoleId): RoleFilter | null {
  switch (role) {
    case "swe":
      return "SWE";
    case "mle":
      return "MLE";
    case "ds":
      return "DS";
    case "de":
      return "DE";
    case "bie":
      return "BIE";
    case "bia":
      return "BIA";
    case "redteam":
      return null;
  }
}

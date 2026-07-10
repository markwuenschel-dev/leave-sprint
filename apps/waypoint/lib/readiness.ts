import type { FileDefenseItem, Problem } from "@waypoint/practice-types";
import type { RubricEntry } from "@waypoint/rubric";
import type { PrimaryRole, WaypointState } from "./domain";

const PRACTICE_THRESHOLD = 0.8;
const MIN_SOLID_INTERVIEWS = 2;

export interface DimStatus {
  met: boolean;
  label: string;
  detail: string;
  ratio?: number;
  count?: number;
  need?: number;
}

export interface RoleFloor {
  role: PrimaryRole;
  practice: DimStatus;
  interview: DimStatus;
  defense: DimStatus;
  green: boolean;
}

export interface ReadinessSnapshot {
  roles: RoleFloor[];
  evidenceGreen: boolean;
}

function problemsForRole(problems: Problem[], role: PrimaryRole): Problem[] {
  const track = role === "SWE_FS_II" ? "SWE" : "MLE";
  const core = problems.filter((p) => p.core);
  const scoped = core.filter(
    (p) => !p.roleTrack || p.roleTrack === "BOTH" || p.roleTrack === track,
  );
  // If no core tagged, fall back to all problems with matching track or untagged
  if (scoped.length === 0) {
    return problems.filter(
      (p) => !p.roleTrack || p.roleTrack === "BOTH" || p.roleTrack === track,
    );
  }
  return scoped;
}

function defenseForRole(items: FileDefenseItem[], role: PrimaryRole): FileDefenseItem[] {
  const track = role === "SWE_FS_II" ? "SWE" : "MLE";
  const core = items.filter((i) => i.core);
  const scoped = core.filter(
    (i) => !i.roleTrack || i.roleTrack === "BOTH" || i.roleTrack === track,
  );
  if (scoped.length === 0) {
    return items.filter(
      (i) => !i.roleTrack || i.roleTrack === "BOTH" || i.roleTrack === track,
    );
  }
  return scoped;
}

function solidInterviewCount(
  entries: RubricEntry[],
  logs: string[],
  role: PrimaryRole,
): number {
  const roleHints =
    role === "SWE_FS_II"
      ? ["SWE", "SWE Full Stack", "Full Stack"]
      : ["MLE", "Machine Learning"];
  const fromRubric = entries.filter((e) => {
    const pr = (e.primaryRole || e.domain || "").toString();
    const hit = roleHints.some((h) => pr.includes(h));
    const solid =
      (e.finalScore != null && e.finalScore >= 70) ||
      e.demonstratedLevel === "Level II" ||
      e.demonstratedLevel === "Strong Level II" ||
      e.demonstratedLevel === "Level III" ||
      e.demonstratedLevel === "Strong Level III" ||
      e.qualifyingDemonstratedLevel === "L2" ||
      e.qualifyingDemonstratedLevel === "L3";
    // Coached sessions (the model helped mid-answer) don't count toward the floor.
    const coached = e.llmIndependence?.llmUsed === true;
    return hit && solid && !coached;
  }).length;
  // Prefer max of explicit logs vs derived so either path works
  return Math.max(fromRubric, logs.length);
}

export function computeReadiness(state: WaypointState): ReadinessSnapshot {
  const roles: PrimaryRole[] = ["SWE_FS_II", "MLE_II"];
  const floors: RoleFloor[] = roles.map((role) => {
    const plist = problemsForRole(state.problems, role);
    const solid = plist.filter((p) => p.status === "solid").length;
    const ratio = plist.length === 0 ? 0 : solid / plist.length;
    const practice: DimStatus = {
      met: plist.length > 0 && ratio >= PRACTICE_THRESHOLD,
      label: "Practice solidity",
      detail:
        plist.length === 0
          ? "No core problems tagged for this role"
          : `${solid}/${plist.length} Solid (${Math.round(ratio * 100)}%, need ≥80%)`,
      ratio,
      count: solid,
      need: Math.ceil(plist.length * PRACTICE_THRESHOLD),
    };

    const logs = state.solidInterviewLogs?.[role] ?? [];
    const icount = solidInterviewCount(state.rubricEntries, logs, role);
    const interview: DimStatus = {
      met: icount >= MIN_SOLID_INTERVIEWS,
      label: "Interview performance",
      detail: `${icount} solid mocks/scored (need ≥${MIN_SOLID_INTERVIEWS})`,
      count: icount,
      need: MIN_SOLID_INTERVIEWS,
    };

    const dlist = defenseForRole(state.fileDefense, role);
    const cold = dlist.filter((d) => (d.practicedDates?.length ?? 0) > 0).length;
    const defense: DimStatus = {
      met: dlist.length > 0 && cold >= dlist.length,
      label: "Stories / file defense cold",
      detail:
        dlist.length === 0
          ? "No core defense items for this role"
          : `${cold}/${dlist.length} practiced at least once`,
      count: cold,
      need: dlist.length,
    };

    const green = practice.met && interview.met && defense.met;
    return { role, practice, interview, defense, green };
  });

  return {
    roles: floors,
    evidenceGreen: floors.every((r) => r.green),
  };
}

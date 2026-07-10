/**
 * Single "do this next" recommendation for Today — highest-leverage open floor
 * gap, else due retest, else rhythm.
 */

import type { RubricEntry } from "@waypoint/rubric";
import type { FileDefenseItem, Problem } from "@waypoint/practice-types";
import type { MainTabId, InterviewTabId } from "./nav";
import type { PrimaryRole, RoleFilter, WaypointState } from "./domain";
import { computeReadiness } from "./readiness";
import { activeRetestQueue } from "./gaps";

export interface NextMove {
  title: string;
  why: string;
  cta: string;
  tab: MainTabId;
  interviewTab?: InterviewTabId;
}

export function pickNextMove(input: {
  problems: Problem[];
  fileDefense: FileDefenseItem[];
  rubricEntries: RubricEntry[];
  solidInterviewLogs: WaypointState["solidInterviewLogs"];
  roleFilter: RoleFilter;
  rhythmDone: { practice: boolean; defense: boolean; interview: boolean; admin: boolean };
  phase: "B" | "A";
}): NextMove {
  const snap = computeReadiness({
    problems: input.problems,
    fileDefense: input.fileDefense,
    rubricEntries: input.rubricEntries,
    solidInterviewLogs: input.solidInterviewLogs,
  } as WaypointState);

  // Prefer unfinished dimensions with largest remaining gap
  type Cand = { score: number; move: NextMove };
  const cands: Cand[] = [];

  // The floor snapshot only covers the two primary roles. Map the scope onto a
  // primary; a non-primary scope (DS/DE) has no floor to chase, so we skip these
  // candidates entirely and fall through to that scope's retest queue below.
  const floorRole: PrimaryRole | null =
    input.roleFilter === "SWE"
      ? "SWE_FS_II"
      : input.roleFilter === "MLE"
        ? "MLE_II"
        : null;
  const floorInScope = input.roleFilter === "ALL" || floorRole !== null;

  for (const r of floorInScope ? snap.roles : []) {
    if (floorRole && r.role !== floorRole) continue;
    const label = r.role === "SWE_FS_II" ? "SWE" : "MLE";

    if (!r.practice.met) {
      const need = Math.max(0, (r.practice.need ?? 0) - (r.practice.count ?? 0));
      cands.push({
        score: 100 + need * 10 + (1 - (r.practice.ratio ?? 0)) * 20,
        move: {
          title: `Practice · ${label} core solid`,
          why: r.practice.detail,
          cta: "Open Practice",
          tab: "practice",
        },
      });
    }
    if (!r.defense.met) {
      const need = Math.max(0, (r.defense.need ?? 0) - (r.defense.count ?? 0));
      cands.push({
        score: 90 + need * 10,
        move: {
          title: `Defense · ${label} stories cold`,
          why: r.defense.detail,
          cta: "Open Defense",
          tab: "defense",
        },
      });
    }
    if (!r.interview.met) {
      const need = Math.max(0, (r.interview.need ?? 0) - (r.interview.count ?? 0));
      cands.push({
        score: 95 + need * 15,
        move: {
          title: `Interview · ${label} solid reps`,
          why: r.interview.detail,
          cta: "Open Grade",
          tab: "interview",
          interviewTab: "grade",
        },
      });
    }
  }

  if (cands.length) {
    cands.sort((a, b) => b.score - a.score);
    return cands[0].move;
  }

  // Floor green for filter — use due retest if any
  const queue = activeRetestQueue(input.rubricEntries, input.roleFilter);
  const due = queue.find((i) => i.bucket === "due-now") || queue[0];
  if (due) {
    return {
      title: `Retest · ${due.task}`,
      why: due.action || "Open gap / retest is waiting.",
      cta: "Open Gaps",
      tab: "interview",
      interviewTab: "gaps",
    };
  }

  // Rhythm incomplete
  if (!input.rhythmDone.practice) {
    return {
      title: "Daily rhythm · Practice",
      why: "Checkbox still open — one solid rep or status update counts.",
      cta: "Open Practice",
      tab: "practice",
    };
  }
  if (!input.rhythmDone.defense) {
    return {
      title: "Daily rhythm · Defense",
      why: "One 45–90s cold story keeps the floor honest.",
      cta: "Open Defense",
      tab: "defense",
    };
  }
  if (!input.rhythmDone.interview) {
    return {
      title: "Daily rhythm · Interview",
      why: "Q bank or a quick grade log — keep the reps moving.",
      cta: "Open Q Bank",
      tab: "interview",
      interviewTab: "qbank",
    };
  }
  if (!input.rhythmDone.admin) {
    return {
      title: input.phase === "A" ? "Admin · pipeline touch" : "Admin · plan / log",
      why:
        input.phase === "A"
          ? "One application row update or outreach note."
          : "Light admin — journal, wishlist, or readiness glance.",
      cta: input.phase === "A" ? "Open Applications" : "Open Readiness",
      tab: input.phase === "A" ? "applications" : "readiness",
    };
  }

  return {
    title: "Floor held · optional depth",
    why: "Evidence dimensions look met for this scope. Performance or a stretch problem is free choice.",
    cta: "Open Performance",
    tab: "interview",
    interviewTab: "performance",
  };
}

import type { WaypointState } from "@/lib/domain";
import { CATALOG_DEFENSE, CATALOG_PROBLEMS } from "./catalog";

export const SEED: WaypointState = {
  phase: "B",
  roleFilter: "ALL",
  rhythmDays: {},
  weeklyReviews: {},
  problems: CATALOG_PROBLEMS.map((p) => ({ ...p })),
  fileDefense: CATALOG_DEFENSE.map((f) => ({ ...f, practicedDates: [...f.practicedDates] })),
  rubricEntries: [],
  qbankStatus: {},
  qbankPos: { track: "swe", idx: 0 },
  applications: [],
  solidInterviewLogs: { SWE_FS_II: [], MLE_II: [] },
};

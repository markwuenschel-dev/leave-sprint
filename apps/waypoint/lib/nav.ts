/** Lightweight in-app navigation (Today → Interview Gaps, etc.). */

export type MainTabId =
  | "today"
  | "readiness"
  | "practice"
  | "defense"
  | "interview"
  | "applications"
  | "weekly"
  | "mock"
  | "more";

export type InterviewTabId =
  | "qbank"
  | "grade"
  | "history"
  | "gaps"
  | "retest"
  | "performance";

export const MAIN_TAB_KEY = "wp-active-tab";
export const INTERVIEW_TAB_KEY = "wp-interview-tab";
export const WP_NAV_EVENT = "wp-nav";

export interface WpNavDetail {
  tab: MainTabId;
  interviewTab?: InterviewTabId;
}

/** Synchronous handoff so Interview can open the right subtab on first paint. */
let pendingInterviewTab: InterviewTabId | null = null;

export function consumePendingInterviewTab(): InterviewTabId | null {
  const t = pendingInterviewTab;
  pendingInterviewTab = null;
  return t;
}

export function peekPendingInterviewTab(): InterviewTabId | null {
  return pendingInterviewTab;
}

export function requestNav(tab: MainTabId, interviewTab?: InterviewTabId): void {
  if (typeof window === "undefined") return;
  if (interviewTab) {
    pendingInterviewTab = interviewTab;
    try {
      localStorage.setItem(INTERVIEW_TAB_KEY, interviewTab);
    } catch {
      /* ignore */
    }
  }
  window.dispatchEvent(
    new CustomEvent<WpNavDetail>(WP_NAV_EVENT, {
      detail: { tab, interviewTab },
    }),
  );
}

export function readInterviewTab(): InterviewTabId | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(INTERVIEW_TAB_KEY) as InterviewTabId | null;
  } catch {
    return null;
  }
}

export function isInterviewTabId(s: string | null | undefined): s is InterviewTabId {
  return (
    s === "qbank" ||
    s === "grade" ||
    s === "history" ||
    s === "gaps" ||
    s === "retest" ||
    s === "performance"
  );
}

/** Resolve subtab for Interview mount: pending request > storage > default. */
export function resolveInterviewTab(fallback: InterviewTabId = "qbank"): InterviewTabId {
  const pending = consumePendingInterviewTab();
  if (pending) return pending;
  const saved = readInterviewTab();
  if (isInterviewTabId(saved)) return saved;
  return fallback;
}

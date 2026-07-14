"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Target,
  Gauge,
  BookOpen,
  Shield,
  Mic2,
  Briefcase,
  CalendarRange,
  Sparkles,
  MoreHorizontal,
} from "lucide-react";
import { useWaypointStore } from "@/lib/store";
import { computeReadiness } from "@/lib/readiness";
import { SaveIndicator } from "./components/ui/SaveIndicator";
import { ThemeToggle } from "./components/ThemeToggle";
import {
  TodaySurface,
  ReadinessSurface,
  PracticeSurface,
  DefenseSurface,
  InterviewSurface,
  ApplicationsSurface,
  WeeklySurface,
  MockSurface,
  MoreSurface,
} from "./components/surfaces";
import { ROLE_FILTER_OPTIONS, type RoleFilter, type WaypointState } from "@/lib/domain";
import {
  MAIN_TAB_KEY,
  WP_NAV_EVENT,
  type InterviewTabId,
  type MainTabId,
  type WpNavDetail,
} from "@/lib/nav";

type TabId = MainTabId;

const TABS: { id: TabId; label: string; icon: typeof Target }[] = [
  { id: "today", label: "Today", icon: Target },
  { id: "readiness", label: "Readiness", icon: Gauge },
  { id: "practice", label: "Practice", icon: BookOpen },
  { id: "defense", label: "Defense", icon: Shield },
  { id: "interview", label: "Interview", icon: Mic2 },
  { id: "applications", label: "Applications", icon: Briefcase },
  { id: "weekly", label: "Weekly", icon: CalendarRange },
  { id: "mock", label: "AI Questions", icon: Sparkles },
  { id: "more", label: "More", icon: MoreHorizontal },
];

export default function WaypointHome() {
  const [tab, setTab] = useState<TabId>("today");
  const [interviewTab, setInterviewTab] = useState<InterviewTabId>("qbank");
  const roleFilter = useWaypointStore((s) => s.roleFilter);
  const setRoleFilter = useWaypointStore((s) => s.setRoleFilter);
  // Never call computeReadiness inside a zustand selector — new object every
  // time → useSyncExternalStore infinite loop / getServerSnapshot warning.
  const problems = useWaypointStore((s) => s.problems);
  const fileDefense = useWaypointStore((s) => s.fileDefense);
  const rubricEntries = useWaypointStore((s) => s.rubricEntries);
  const solidInterviewLogs = useWaypointStore((s) => s.solidInterviewLogs);
  const evidenceGreen = useMemo(() => {
    // Only readiness inputs; cast is fine — computeReadiness doesn't need full state.
    const slice = {
      problems,
      fileDefense,
      rubricEntries,
      solidInterviewLogs,
    } as WaypointState;
    return computeReadiness(slice).evidenceGreen;
  }, [problems, fileDefense, rubricEntries, solidInterviewLogs]);

  useEffect(() => {
    const s = localStorage.getItem(MAIN_TAB_KEY) as TabId | null;
    if (s && TABS.some((t) => t.id === s)) setTab(s);
  }, []);
  useEffect(() => {
    localStorage.setItem(MAIN_TAB_KEY, tab);
  }, [tab]);

  useEffect(() => {
    const onNav = (ev: Event) => {
      const detail = (ev as CustomEvent<WpNavDetail>).detail;
      if (detail?.tab && TABS.some((t) => t.id === detail.tab)) {
        setTab(detail.tab);
      }
      if (detail?.interviewTab) {
        setInterviewTab(detail.interviewTab);
      }
    };
    window.addEventListener(WP_NAV_EVENT, onNav);
    return () => window.removeEventListener(WP_NAV_EVENT, onNav);
  }, []);

  return (
    <div className="min-h-screen pb-8">
      <header
        className="sticky top-0 z-50 border-b"
        style={{
          borderColor: "var(--hairline)",
          background: "var(--overlay)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div
          className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4"
        >
          <div className="min-w-0">
            <div className="text-xl font-semibold tracking-tight">Waypoint</div>
            <div className="truncate text-[10px]" style={{ color: "var(--text-dim)" }}>
              Evidence {evidenceGreen ? "green" : "open"} · EC2-ready
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <label className="flex items-center gap-1.5" title="Scopes Practice, Defense, Interview analytics, Readiness matrix">
              <span className="hidden text-[10px] uppercase tracking-wider text-[var(--text-dim)] sm:inline">
                Scope
              </span>
              <select
                className="rounded-lg border px-2 py-1 text-xs"
                style={{
                  background: "var(--bg)",
                  borderColor: "var(--hairline)",
                  color: "var(--text)",
                }}
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
                aria-label="Role scope filter"
              >
                {ROLE_FILTER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <SaveIndicator />
            <ThemeToggle />
          </div>
        </div>
        {/* Always-visible tab row (do not gate on md: — broken if Tailwind breakpoints miss) */}
        <nav
          className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-2 pb-2"
          aria-label="Main"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm"
                style={{
                  background: active ? "var(--fill-strong)" : "transparent",
                  color: active ? "var(--cyan)" : "var(--text-mid)",
                  border: active ? "1px solid var(--hairline-strong)" : "1px solid transparent",
                }}
              >
                <Icon size={14} aria-hidden />
                {label}
              </button>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {tab === "today" && <TodaySurface />}
        {tab === "readiness" && <ReadinessSurface />}
        {tab === "practice" && <PracticeSurface />}
        {tab === "defense" && <DefenseSurface />}
        {tab === "interview" && (
          <InterviewSurface key={interviewTab} initialTab={interviewTab} />
        )}
        {tab === "applications" && <ApplicationsSurface />}
        {tab === "weekly" && <WeeklySurface />}
        {tab === "mock" && <MockSurface />}
        {tab === "more" && <MoreSurface />}
      </main>
    </div>
  );
}

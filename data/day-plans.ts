import type { DayPlan, Tier } from '../lib/types';

/**
 * Static day plans & milestones.
 * All entries now consistently use 'title'.
 */

export const DAY_PLANS: Record<number, DayPlan> = {
  1: {
    day: 1,
    date: "Jun 17",
    focus: "Phase 5 Gate",
    coding: { title: "Two Sum + Contains Duplicate", tier: "A", time: "30m" },
    file: { title: "reviewApi.ts + types.ts contracts", time: "20m" },
    qa: { title: "Why does stdout have to be JSON-only?", time: "15m" },
    build: { title: "Finalize Phase 5 gate + docs polish", time: "varies" },
  },
  2: {
    day: 2,
    date: "Jun 18",
    focus: "CI Pipeline",
    coding: { title: "Valid Anagram + Valid Parentheses", tier: "A", time: "30m" },
    file: { title: "Spring Boot shell + /health", time: "20m" },
    qa: { title: "What does a green CI check actually prove?", time: "15m" },
    build: { title: "GitHub Actions 3-job (pytest + gradle + npm)", time: "45m" },
  },
  3: {
    day: 3,
    date: "Jun 19",
    focus: "Docker Images",
    coding: { title: "Best Time + Binary Search", tier: "A", time: "30m" },
    file: { title: "Dockerfiles + health checks", time: "20m" },
    qa: { title: "Why containerize the Java/Python boundary?", time: "15m" },
    build: { title: "Docker images + compose skeleton", time: "45m" },
  },
  4: {
    day: 4,
    date: "Jun 20",
    focus: "Docker Compose + Health",
    coding: { title: "Reverse String + Running Sum", tier: "A", time: "30m" },
    file: { title: "Docker Compose network + env contracts", time: "20m" },
    qa: { title: "How do services find each other in Docker Compose?", time: "15m" },
    build: { title: "Compose + health verification", time: "30m" },
  },
  5: {
    day: 5,
    date: "Jun 21",
    focus: "Structured Logging + Correlation IDs",
    coding: { title: "Merge Two Sorted Lists + FizzBuzz", tier: "A", time: "30m" },
    file: { title: "Correlation ID propagation (Spring → Python)", time: "20m" },
    qa: { title: "How do you trace a single failed request across runtimes?", time: "15m" },
    build: { title: "Logging + requestId across layers", time: "40m" },
  },
  6: {
    day: 6,
    date: "Jun 22",
    focus: "RUNBOOK + Error Contract",
    coding: { title: "Longest Substring (sliding window)", tier: "B", time: "30m" },
    file: { title: "RUNBOOK.md + error envelope contract", time: "20m" },
    qa: { title: "What belongs in RUNBOOK vs README?", time: "15m" },
    build: { title: "Error handling + runbook", time: "45m" },
  },
  7: {
    day: 7,
    date: "Jun 23",
    focus: "Phase 6 Gate + Controller Tests",
    coding: { title: "Group Anagrams", tier: "B", time: "30m" },
    file: { title: "Controller tests (Retrieve + FinalAssessment)", time: "20m" },
    qa: { title: "What does the 2-minute CI/Docker story sound like?", time: "15m" },
    build: { title: "Phase 6 gate + test smoke", time: "60m" },
  },
  16: {
    day: 16,
    date: "Jul 2",
    focus: "Retrieval Metrics Depth",
    coding: { title: "Top K Frequent Elements", tier: "B", time: "30m" },
    file: { title: "File defense: retrieval.py + ingestion.py", time: "20m" },
    qa: { title: "Why is the UI thin?", time: "15m" },
    build: { title: "Build complete — shift fully to interview prep", time: "30m" },
  },
  17: {
    day: 17,
    date: "Jul 3",
    focus: "Data Quality + Leakage",
    coding: { title: "LRU Cache", tier: "B", time: "30m" },
    file: { title: "File defense depth: RagEngineClient + PythonProcess", time: "20m" },
    qa: { title: "How do you design leakage-safe splits?", time: "15m" },
    build: { title: "No build — pure prep mode", time: "—" },
  },
};

// Fallback
export function getDayPlan(day: number): DayPlan {
  const explicit = DAY_PLANS[day];
  if (explicit) return explicit;

  const tier: Tier = day <= 7 ? "A" : day <= 14 ? "B" : "C";
  return {
    day,
    date: `Day ${day}`,
    focus: day < 22 ? "Interview Prep Focus" : "Applications & Mock",
    coding: { title: "Next unsolved Tier problem (see Problem Bank)", tier, time: "30m" },
    file: { title: "Next File Defense card", time: "20m" },
    qa: { title: "One Q Bank question aloud (no notes)", time: "15m" },
    build: { title: "Catch-up / review / rest as needed", time: "—" },
  };
}

export const MILESTONES = [
  { day: 21, label: "Mock #1", short: "Mock #1" },
  { day: 22, label: "Applications ⭐", short: "Apps ⭐" },
  { day: 26, label: "Mock #2", short: "Mock #2" },
  { day: 29, label: "Sprint End", short: "End" },
];
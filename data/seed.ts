/**
 * Type-safe seed data for the Zustand store.
 *
 * Prefer editing `data/app-state.json` for content.
 * This file exists so the store can import without JSON module resolution issues.
 *
 * Keep the shape in sync with app-state.json.
 */

import type { AppState } from "../lib/types";

export const SEED: AppState = {
  days: {
    "1": { rhythm: { coding: true, file: true, qa: true, build: true }, journal: "Phase 5 gate. Strong start.", energy: "high" },
    "16": { rhythm: { coding: true, file: true, qa: false, build: true }, focusNote: "Build complete. Interview prep is live risk." },
    "17": { rhythm: { coding: true, file: true, qa: false, build: true } },
  },
  stages: {
    "0": { done: true, doneAt: "2026-05-05T10:00:00.000Z" },
    "1": { done: true, doneAt: "2026-05-06T14:20:00.000Z" },
    "13": { done: true, doneAt: "2026-05-23T18:00:00.000Z" },
    "15a": { done: true },
    "15d": { done: false },
    "17": { done: true },
    "18a": { done: true },
    "18g": { done: false },
    "19": { done: false },
    "20": { done: false },
    "21": { done: false },
  },
  problems: [
    { id: "p-two-sum", title: "Two Sum + Contains Duplicate", tier: "A", pattern: "HashMap lookup", status: "solid", leetcodeSlug: "two-sum" },
    { id: "p-longest-substr", title: "Longest Substring Without Repeating Characters", tier: "B", pattern: "Sliding window", status: "practicing", leetcodeSlug: "longest-substring-without-repeating-characters" },
    { id: "p-lru", title: "LRU Cache", tier: "B", pattern: "Doubly-linked + map", status: "practicing", leetcodeSlug: "lru-cache" },
    { id: "p-metrics", title: "Precision + Recall + F1 from scratch", tier: "D", pattern: "Derive metrics", status: "practicing" },
  ],
  fileDefense: [
    { id: "f-demotoolbar", title: "DemoToolbar.tsx", why: "Operator controls + fixture separation.", terminology: "fixture injection", interviewLine: "Not product core — demo tooling.", practicedDates: ["2026-06-25"], notes: "" },
    { id: "f-ragengineclient", title: "RagEngineClient", why: "Stable contract over Python engine.", terminology: "polymorphism", interviewLine: "Controllers depend on the contract.", practicedDates: [], notes: "" },
  ],
  lastUpdated: "2026-07-02T20:00:00.000Z",
};

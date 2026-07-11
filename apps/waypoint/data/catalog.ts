/**
 * Canonical practice + file-defense catalogs for Waypoint.
 * Status/notes live in persisted state; this file is the title/pattern/core source of truth.
 * `mergeCatalog` adds missing rows and refreshes metadata without wiping progress.
 */

import type { FileDefenseItem, Problem, Tier } from "@waypoint/practice-types";
import { DEFENSE as CQ_RAG_DEFENSE } from "./portfolio/compounding-quality-rag.defense.gen";

type RoleTrack = NonNullable<Problem["roleTrack"]>;

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function problem(
  title: string,
  tier: Tier,
  pattern: string,
  opts: {
    id?: string;
    core?: boolean;
    roleTrack?: RoleTrack;
    leetcodeSlug?: string;
  } = {},
): Problem {
  return {
    id: opts.id ?? `p-${slug(title)}`,
    title,
    tier,
    pattern,
    status: "not-started",
    core: !!opts.core,
    ...(opts.roleTrack ? { roleTrack: opts.roleTrack } : {}),
    ...(opts.leetcodeSlug ? { leetcodeSlug: opts.leetcodeSlug } : {}),
  };
}

/** Full coding bank (tiers A–D) with readiness core tags. */
export const CATALOG_PROBLEMS: Problem[] = [
  // Tier A — foundation · SWE core
  problem("Two Sum + Contains Duplicate", "A", "HashMap lookup; HashSet for seen", {
    id: "p-two-sum",
    core: true,
    roleTrack: "SWE",
    leetcodeSlug: "two-sum",
  }),
  problem("Valid Anagram + Valid Parentheses", "A", "Char-count array; Stack/ArrayDeque", {
    core: true,
    roleTrack: "SWE",
    leetcodeSlug: "valid-anagram",
  }),
  problem("Best Time to Buy and Sell Stock + Binary Search", "A", "Min tracking; binary search invariant", {
    core: true,
    roleTrack: "SWE",
    leetcodeSlug: "best-time-to-buy-and-sell-stock",
  }),
  problem("Reverse String (in-place) + Running Sum", "A", "Two-pointer; prefix sum", {
    core: true,
    roleTrack: "SWE",
    leetcodeSlug: "reverse-string",
  }),
  problem("Merge Two Sorted Lists + FizzBuzz", "A", "Dummy head; modulo precedence", {
    core: true,
    roleTrack: "SWE",
    leetcodeSlug: "merge-two-sorted-lists",
  }),

  // Tier B — SWE II patterns · all core for screens
  problem("Longest Substring Without Repeating Characters", "B", "Sliding window; last-seen map", {
    id: "p-longest-substr",
    core: true,
    roleTrack: "SWE",
    leetcodeSlug: "longest-substring-without-repeating-characters",
  }),
  problem("Group Anagrams", "B", "Canonical key → list map", {
    core: true,
    roleTrack: "SWE",
    leetcodeSlug: "group-anagrams",
  }),
  problem("Top K Frequent Elements", "B", "Min-heap size k / bucket sort", {
    core: true,
    roleTrack: "SWE",
    leetcodeSlug: "top-k-frequent-elements",
  }),
  problem("K Closest Points to Origin", "B", "Heap by distance / quickselect", {
    core: true,
    roleTrack: "SWE",
    leetcodeSlug: "k-closest-points-to-origin",
  }),
  problem("Merge Intervals", "B", "Sort + sweep merge", {
    core: true,
    roleTrack: "SWE",
    leetcodeSlug: "merge-intervals",
  }),
  problem("Meeting Rooms II", "B", "Min-heap of end times", {
    core: true,
    roleTrack: "SWE",
    leetcodeSlug: "meeting-rooms-ii",
  }),
  problem("Number of Islands", "B", "Grid DFS; mark in-place", {
    core: true,
    roleTrack: "SWE",
    leetcodeSlug: "number-of-islands",
  }),
  problem("Rotting Oranges", "B", "Multi-source BFS", {
    core: true,
    roleTrack: "SWE",
    leetcodeSlug: "rotting-oranges",
  }),
  problem("Course Schedule (cycle detection)", "B", "Topological sort / DFS coloring", {
    core: true,
    roleTrack: "SWE",
    leetcodeSlug: "course-schedule",
  }),
  problem("Clone Graph", "B", "BFS + old→new identity map", {
    core: true,
    roleTrack: "SWE",
    leetcodeSlug: "clone-graph",
  }),
  problem("LRU Cache", "B", "Doubly-linked list + HashMap", {
    id: "p-lru",
    core: true,
    roleTrack: "SWE",
    leetcodeSlug: "lru-cache",
  }),
  problem("Decode String", "B", "Stack for nested encoding", {
    core: true,
    roleTrack: "SWE",
    leetcodeSlug: "decode-string",
  }),
  problem("Search in Rotated Sorted Array", "B", "Modified binary search", {
    core: true,
    roleTrack: "SWE",
    leetcodeSlug: "search-in-rotated-sorted-array",
  }),
  problem("Subarray Sum Equals K", "B", "Prefix sum + HashMap", {
    core: true,
    roleTrack: "SWE",
    leetcodeSlug: "subarray-sum-equals-k",
  }),
  problem("Product of Array Except Self", "B", "Prefix/suffix product; no division", {
    core: true,
    roleTrack: "SWE",
    leetcodeSlug: "product-of-array-except-self",
  }),

  // Tier C — systems · select core
  problem("LRU Cache with tests", "C", "DLL + map; edge-case tests", {
    core: true,
    roleTrack: "SWE",
  }),
  problem("Rate Limiter (sliding window)", "C", "Deque of timestamps", {
    core: true,
    roleTrack: "SWE",
  }),
  problem("Cursor Pagination", "C", "Opaque stable cursor vs offset", {
    core: true,
    roleTrack: "SWE",
  }),
  problem("Idempotency Key Store", "C", "Key → response TTL + conflict", {
    core: false,
    roleTrack: "SWE",
  }),
  problem("Subprocess wrapper with timeout", "C", "ProcessBuilder + timeout + envelopes", {
    core: true,
    roleTrack: "BOTH",
  }),

  // Tier D — MLE / DS / DE · all core for MLE floor
  problem("Precision + Recall + F1 + Confusion Matrix from scratch", "D", "Derive metrics from TP/FP/TN/FN", {
    id: "p-metrics",
    core: true,
    roleTrack: "MLE",
  }),
  problem("Recall@k + MRR from scratch", "D", "Hit rate@k; mean reciprocal rank", {
    core: true,
    roleTrack: "MLE",
  }),
  problem("Cosine similarity top-k retrieval", "D", "Embeddings + min-heap top-k", {
    core: true,
    roleTrack: "MLE",
  }),
  problem("Group/time-based split (leakage prevention)", "D", "Group-aware + time splits", {
    core: true,
    roleTrack: "MLE",
  }),
  problem("Latest event per task + left join (SQL)", "D", "ROW_NUMBER + LEFT JOIN", {
    core: true,
    roleTrack: "MLE",
  }),
  problem("Dedupe by hash + data quality checks", "D", "Content hash; null/row asserts", {
    core: true,
    roleTrack: "MLE",
  }),
];

/** File-defense cards — generated per project from data/portfolio/ hand-offs.
 * Catalog is authoritative for defense (mergeCatalogLists drops stale ids). */
export const CATALOG_DEFENSE: FileDefenseItem[] = [...CQ_RAG_DEFENSE];

/** Merge catalog metadata into persisted lists; keep status / practiced / notes. */
export function mergeCatalogLists(
  problems: Problem[],
  fileDefense: FileDefenseItem[],
): { problems: Problem[]; fileDefense: FileDefenseItem[] } {
  const pMap = new Map(problems.map((p) => [p.id, p]));
  const mergedProblems = CATALOG_PROBLEMS.map((cat) => {
    const existing = pMap.get(cat.id);
    if (!existing) return { ...cat };
    return {
      ...cat,
      status: existing.status,
      ...(existing.difficulty != null ? { difficulty: existing.difficulty } : {}),
    };
  });
  // Keep any user-added rows not in catalog
  for (const p of problems) {
    if (!CATALOG_PROBLEMS.some((c) => c.id === p.id)) mergedProblems.push(p);
  }

  // Defense is catalog-authoritative: cards come only from the catalog (generated
  // per project in data/portfolio/). Preserve practice progress by id, and DROP
  // persisted rows no longer in the catalog — e.g. a project's pre-refactor cards
  // after a re-ingest. There is no "add defense card" UI, so nothing is user-owned.
  const fMap = new Map(fileDefense.map((f) => [f.id, f]));
  const mergedDefense = CATALOG_DEFENSE.map((cat) => {
    const existing = fMap.get(cat.id);
    if (!existing) return { ...cat };
    return {
      ...cat,
      practicedDates: existing.practicedDates ?? [],
      notes: existing.notes ?? "",
    };
  });

  return { problems: mergedProblems, fileDefense: mergedDefense };
}

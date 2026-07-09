/**
 * Canonical practice + file-defense catalogs for Waypoint.
 * Status/notes live in persisted state; this file is the title/pattern/core source of truth.
 * `mergeCatalog` adds missing rows and refreshes metadata without wiping progress.
 */

import type { FileDefenseItem, Problem, Tier } from "@waypoint/practice-types";

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

function defense(
  title: string,
  why: string,
  terminology: string,
  interviewLine: string,
  opts: { id?: string; core?: boolean; roleTrack?: RoleTrack } = {},
): FileDefenseItem {
  return {
    id: opts.id ?? `f-${slug(title)}`,
    title,
    why,
    terminology,
    interviewLine: interviewLine.replace(/^["']|["']$/g, ""),
    practicedDates: [],
    notes: "",
    core: !!opts.core,
    ...(opts.roleTrack ? { roleTrack: opts.roleTrack } : {}),
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

/** 20-file defense map (portfolio talk tracks). */
export const CATALOG_DEFENSE: FileDefenseItem[] = [
  defense(
    "demoCases.ts",
    "Reusable typed synthetic demo data; prefilled reviewer findings. Keeps demo data outside components.",
    "Separation of concerns · fixtures · synthetic-data boundary",
    "Demo data lives outside components so UI logic stays testable and the demo is repeatable without typing.",
    { core: true, roleTrack: "SWE" },
  ),
  defense(
    "DemoToolbar.tsx",
    "Operator controls: case selector, load, start-over. Not product core — demo tooling.",
    "Component composition · operator tooling · fixture injection",
    "Not product core — demo tooling that reduces live-demo risk.",
    { id: "f-demotoolbar", core: true, roleTrack: "SWE" },
  ),
  defense(
    "reviewApi.ts",
    "Transport boundary to Spring; typed AsyncState returns; error mapping; no React state.",
    "API client · DTO · discriminated union · unknown vs any",
    "Fetch logic should not scatter across presentational components — this boundary prevents that.",
    { core: true, roleTrack: "SWE" },
  ),
  defense(
    "types.ts",
    "Shared DTO and UI types; AsyncState<T> discriminated union; ApiError.",
    "Discriminated union · exhaustive switch · impossible states · generics",
    "Types make state explicit at compile time; runtime validation still matters at the network boundary.",
    { core: true, roleTrack: "SWE" },
  ),
  defense(
    "ConcernInputForm.tsx",
    "Controlled concern textarea with 5k counter, validation, disabled-while-loading submit.",
    "Controlled component · single source of truth · form validation · accessibility",
    "Controlled inputs support predictable submission.",
    { core: false, roleTrack: "SWE" },
  ),
  defense(
    "ChecklistPanel.tsx",
    "Renders checklist items, metric cards, evidence cards, takeaway, missing info, limitations.",
    "Presentational component · empty/loading/error states · conditional rendering",
    "Makes retrieved output reviewable rather than chatbot-like.",
    { core: false, roleTrack: "SWE" },
  ),
  defense(
    "EvidencePanel / EvidenceCard",
    "Citation display: source ID, title, section, score, matched terms, snippet, selection state.",
    "RAG grounding · evidence-aware UI · trust boundary · citation",
    "Evidence cards are the UI expression of RAG grounding.",
    { core: true, roleTrack: "BOTH" },
  ),
  defense(
    "ReviewSummaryForm.tsx",
    "Two-column form capturing reviewer-confirmed findings; prefill-and-edit from demo cases.",
    "Human-in-the-loop · reviewer confirmation · controlled form",
    "The model proposes; the reviewer owns confirmed facts — this form is the boundary.",
    { core: true, roleTrack: "BOTH" },
  ),
  defense(
    "FinalAssessmentPanel.tsx",
    "Displays classification, handling path, risk lane, escalation triggers, limitations, clipboard copy.",
    "Side effect · async feedback · accessible status · refusal state",
    "Separates final structured output from evidence; keeps limitations visible.",
    { core: false, roleTrack: "SWE" },
  ),
  defense(
    "assessmentSummary.ts",
    "Pure function: deterministic plain-text serialization of the final assessment for clipboard.",
    "Pure function · deterministic serialization · side-effect isolation",
    "Export logic is isolated so the panel owns UI feedback but not formatting.",
    { core: false, roleTrack: "SWE" },
  ),
  defense(
    "Spring Controller classes",
    "HTTP routes, request binding, validation trigger, response status codes. No domain logic.",
    "@RestController · @Valid · DTO binding · status code semantics",
    "Controllers translate HTTP into use cases — no business logic lives here.",
    { core: true, roleTrack: "SWE" },
  ),
  defense(
    "Spring DTO classes",
    "Request/response contracts; decouple API shape from internal domain objects.",
    "DTO · serialization · schema evolution · API contract",
    "DTOs stop internal shapes leaking into the public API.",
    { core: true, roleTrack: "SWE" },
  ),
  defense(
    "Spring Service layer",
    "Orchestrates use cases; calls RagEngineClient; maps between DTOs and RAG results.",
    "Orchestration · testability · dependency injection · use case layer",
    "The service owns workflow orchestration, not the controller.",
    { core: true, roleTrack: "SWE" },
  ),
  defense(
    "RagEngineClient (interface)",
    "Stable Java abstraction for the Python engine. Hides subprocess details.",
    "Polymorphism · dependency inversion · interface · contract",
    "Controllers depend on the contract, not subprocess details — swapping to HTTP later doesn't change the controller.",
    { id: "f-ragengineclient", core: true, roleTrack: "BOTH" },
  ),
  defense(
    "PythonProcessRagEngineClient",
    "Subprocess launch, JSON stdin/stdout, exit-code handling, timeout, error envelope parsing, UTF-8.",
    "Adapter pattern · process boundary · error envelope · timeout handling",
    "All Java-to-Python integration risk is isolated here.",
    { core: true, roleTrack: "BOTH" },
  ),
  defense(
    "GlobalExceptionHandler",
    "@RestControllerAdvice mapping all exceptions to structured ApiErrorResponse with requestId.",
    "Cross-cutting concern · exception mapping · stable error contract · correlation ID",
    "Clients need stable error shapes, not stack traces.",
    { core: false, roleTrack: "SWE" },
  ),
  defense(
    "api_runner.py",
    "Process bridge: reads one JSON from stdin, routes to domain functions, writes one JSON to stdout.",
    "Process boundary · protocol discipline · adapter · subprocess",
    "Lets Spring wrap the tested engine without rewriting it.",
    { core: true, roleTrack: "BOTH" },
  ),
  defense(
    "retrieval.py",
    "Retriever protocol, KeywordRetriever, EmbeddingRetriever; SearchResult contract; Recall@k eval.",
    "Strategy pattern · protocol · cosine similarity · top-k · retrieval metrics",
    "Retrieval quality drives answer quality more than prompt polish.",
    { core: true, roleTrack: "MLE" },
  ),
  defense(
    "refusal.py",
    "Three boundary types: external drug ref, internal record access, clinical/legal conclusion.",
    "Guardrail · boundary detection · fail-safe · controlled vocabulary",
    "The correct answer can be 'I do not have enough evidence.'",
    { core: true, roleTrack: "MLE" },
  ),
  defense(
    "final_assessment.py",
    "Deterministic routing from ReviewSummary to DerivedAssessment; severe triggers only from structured field.",
    "Deterministic routing · structured extraction · safety-critical decision · fail-safe defaults",
    "Final assessment depends on reviewer-confirmed facts, not inference from prose.",
    { core: true, roleTrack: "MLE" },
  ),
];

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
  for (const f of fileDefense) {
    if (!CATALOG_DEFENSE.some((c) => c.id === f.id)) mergedDefense.push(f);
  }

  return { problems: mergedProblems, fileDefense: mergedDefense };
}

type Row = string[];

type TierColor = "cyan" | "green" | "yellow" | "violet";

const tierColorVar: Record<TierColor, string> = {
  cyan: "var(--cyan)",
  green: "var(--green)",
  yellow: "var(--yellow)",
  violet: "var(--violet)",
};

function TierBadge({ letter, color }: { letter: string; color: TierColor }) {
  const c = tierColorVar[color];
  return (
    <span
      className="inline-flex h-5 w-5 items-center justify-center rounded font-mono text-[11px] font-bold"
      style={{ color: c, background: "var(--surface-2)", border: `1px solid ${c}` }}
    >
      {letter}
    </span>
  );
}

function RefTable({ headers, rows }: { headers: string[]; rows: Row[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--surface)]">
      <table className="w-full border-collapse text-left text-xs">
        <thead>
          <tr>
            {headers.map((h) => (
              <th
                key={h}
                className="border-b border-[var(--border)] px-3 py-2.5 font-semibold uppercase tracking-wide text-[var(--text-dim)] whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="align-top">
              {row.map((cell, j) => (
                <td
                  key={j}
                  className={
                    "border-b border-[var(--border-subtle)] px-3 py-2.5 leading-relaxed " +
                    (j === 0
                      ? "font-medium text-[var(--text)] min-w-[180px]"
                      : "text-[var(--text-mid)]")
                  }
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const tierA: Row[] = [
  [
    "Two Sum + Contains Duplicate",
    "HashMap for value→index lookup; HashSet for seen elements",
    "Explain O(n²) vs O(n) tradeoff; state when HashMap wins over brute force; handle negative numbers and duplicates in Two Sum",
  ],
  [
    "Valid Anagram + Valid Parentheses",
    "int[26] char-count array (fixed alphabet); Stack/ArrayDeque for matching",
    "Explain when int[26] beats HashMap (fixed alphabet); handle Unicode edge case; use ArrayDeque, not Stack; state why Stack is legacy",
  ],
  [
    "Best Time to Buy and Sell Stock + Binary Search",
    "Single-pass min tracking; loop invariant binary search",
    "No off-by-one at left≤right vs left<right; handle empty array; state the loop invariant for binary search before writing it",
  ],
  [
    "Reverse String (in-place) + Running Sum",
    "Two-pointer swap; prefix sum accumulation",
    "Write without helper functions; explain O(1) space; show how prefix sums enable O(1) range queries later",
  ],
  [
    "Merge Two Sorted Lists + FizzBuzz",
    "Dummy head + two pointers; modulo precedence",
    "Step through ordering and boundary cases for merge; FizzBuzz: check 15 before 3 and 5; both should be solved in under 3 minutes",
  ],
];

const tierB: Row[] = [
  [
    "Longest Substring Without Repeating Characters",
    "Sliding window; HashMap of char → last-seen index",
    "Jump left to lastSeen+1, not left+1 — explain why; window shrink vs pointer jump; O(n) time. Common SWE II screen question.",
  ],
  [
    "Group Anagrams",
    "Sorted string as canonical key → HashMap<String, List<String>>",
    "Explain canonical key approach; variation: char-count array as key for O(n·k) instead of O(n·k log k)",
  ],
  [
    "Top K Frequent Elements",
    "Min-heap of size k, or bucket sort when values bounded",
    "O(n log k) heap vs O(n log n) sort; mention that top-k maps directly to RAG retrieval ranking — this is interview gold",
  ],
  [
    "K Closest Points to Origin",
    "Min-heap by distance, or quickselect for O(n) average",
    "Heap gives O(n log k); quickselect gives O(n) average. Say which you'd use in production and why.",
  ],
  [
    "Merge Intervals",
    "Sort by start time, then sweep and merge",
    "Sorting first enables single-pass O(n) merge; explain merge condition: current start ≤ previous end",
  ],
  [
    "Meeting Rooms II",
    "Min-heap of end times; heap size = rooms needed",
    "Sorted starts + min-heap of ends; explain why earliest-ending room might be reused; O(n log n)",
  ],
  [
    "Number of Islands",
    "Grid DFS; mark visited in-place",
    "Marking '0' in-place avoids visited array; how BFS would differ; time O(m·n); edge: all water",
  ],
  [
    "Rotting Oranges",
    "Multi-source BFS (all rotten oranges in queue at time 0)",
    "Why multi-source BFS gives minimum time; how to detect unreachable fresh oranges; BFS time layers",
  ],
  [
    "Course Schedule (cycle detection)",
    "Topological sort via Kahn's (in-degree) or DFS 3-state coloring",
    "Cycle = no valid ordering; explain both approaches; relate to dependency graphs and data pipelines",
  ],
  [
    "Clone Graph",
    "BFS + HashMap old_node → new_node for object identity",
    "Why you need the map (cycles + identity); BFS ensures all neighbors processed; this tests object identity, not just traversal",
  ],
  [
    "LRU Cache",
    "Doubly-linked list + HashMap for O(1) get/put",
    "Sentinel head/tail avoid null checks; map for O(1) lookup; list for O(1) eviction. Explain the two-structure design before coding.",
  ],
  [
    "Decode String",
    "Stack — on ']', pop until '[', repeat string, push back",
    "Stack naturally handles nested encodings; time O(n·k) where k is max repetition; practice with 2[a3[b]]",
  ],
  [
    "Search in Rotated Sorted Array",
    "Modified binary search; identify which half is sorted",
    "One half is always sorted; determine if target is in the sorted half; O(log n). Say the invariant before writing.",
  ],
  [
    "Subarray Sum Equals K",
    "Prefix sum + HashMap; prefixSum[i] - k = prefixSum[j] → subarray [j+1..i] sums to k",
    "Initialize map with {0: 1} to handle subarrays from index 0; O(n) time space; this pattern is subtle — practice until it's automatic",
  ],
  [
    "Product of Array Except Self",
    "Two-pass prefix product + suffix product; no division; O(n) time O(1) extra space",
    "Why the no-division constraint forces two passes; relate to situations where division is unsafe (zeros)",
  ],
];

const tierC: Row[] = [
  [
    "LRU Cache with tests",
    "Doubly-linked list + HashMap; eviction at tail; O(1) get/put",
    "Edge cases: capacity 1, single element, put existing key. Write one test per edge case. Explain why a linked list node needs prev + next.",
  ],
  [
    "Rate Limiter (sliding window)",
    "Deque of timestamps; evict old timestamps on each request",
    "Fairness tradeoffs; memory bounded by limit; why token bucket differs; distributed caveats (single-node assumption)",
  ],
  [
    "Cursor Pagination",
    "Stable key (created_at or id) as opaque cursor; vs offset pagination",
    "Why offset skips/duplicates on concurrent inserts; how to encode cursor opaquely (base64); time complexity vs offset",
  ],
  [
    "Idempotency Key Store",
    "key → response cache with TTL; conflict detection (same key, different payload)",
    "Why retries without idempotency duplicate side effects; key expiry; what to return on a conflicting payload",
  ],
  [
    "Subprocess wrapper with timeout",
    "ProcessBuilder + timeout + stdout/stderr separation + encoding",
    "The exact failure modes: timeout, nonzero exit, invalid stdout, encoding corruption. This is your PythonProcessRagEngineClient — you already built it.",
  ],
];

const tierD: Row[] = [
  [
    "Precision + Recall + F1 + Confusion Matrix from scratch",
    "TP/FP/TN/FN from (predicted, actual) pairs; P=TP/(TP+FP); R=TP/(TP+FN); F1=2PR/(P+R)",
    "Derive all four from first principles; pick the right metric for the use case (high recall when false negatives are costly — your escalation system)",
  ],
  [
    "Recall@k + MRR from scratch",
    "hit_rate@k = per-question binary; MRR = average 1/rank of first hit",
    "Distinguish Recall@k from hit_rate@k; multiple expected sources don't give additive MRR credit; implement both in Python",
  ],
  [
    "Cosine similarity top-k retrieval",
    "Embed all docs; compute dot-product similarity; min-heap of size k",
    "Why normalization makes dot product equal cosine similarity; time O(n·d + n·log k); relate to your EmbeddingRetriever",
  ],
  [
    "Group/time-based split (leakage prevention)",
    "No source group in both train and test; time-based: no future data in train",
    "Why random split leaks document knowledge; how group-aware split prevents it; mention this proactively in any MLE interview",
  ],
  [
    "Latest event per task + left join (SQL)",
    "ROW_NUMBER() OVER (PARTITION BY task_id ORDER BY created_at DESC); LEFT JOIN to include unreviewd rows",
    "When GROUP BY + MAX fails (need all columns); why LEFT JOIN vs INNER JOIN; run both against your eval_run table",
  ],
  [
    "Dedupe by hash + data quality checks",
    "Hash content → seen set; assert row count and null checks on required fields",
    "Why idempotent ingest prevents silent data bloat; what field-level null check catches; relate to your ingestion.py",
  ],
];

const tiers: {
  letter: string;
  color: TierColor;
  title: string;
  headers: string[];
  rows: Row[];
}[] = [
  {
    letter: "A",
    color: "cyan",
    title: "Tier A — Foundation · 30 minutes · Java preferred",
    headers: ["Problem", "Pattern / Key Idea", "Done when you can..."],
    rows: tierA,
  },
  {
    letter: "B",
    color: "green",
    title:
      "Tier B — SWE II Patterns · 30–45 minutes · Java · High ROI for Level II screens",
    headers: ["Problem", "Pattern / Key Idea", "Why high ROI + what to say"],
    rows: tierB,
  },
  {
    letter: "C",
    color: "yellow",
    title:
      "Tier C — Level III Systems · 45–60 minutes · Design + Implementation · Shows senior instinct",
    headers: ["Problem", "Core Idea", "Done when you can explain..."],
    rows: tierC,
  },
  {
    letter: "D",
    color: "violet",
    title: "Tier D — MLE / DS / DE · Python preferred · Metrics and data pipeline patterns",
    headers: ["Problem", "Pattern", "Done when you can..."],
    rows: tierD,
  },
];

const defenseMap: Row[] = [
  [
    "demoCases.ts",
    "Reusable typed synthetic demo data; prefilled reviewer findings. Keeps demo data outside components.",
    "Separation of concerns · fixtures · synthetic-data boundary",
    '"Demo data lives outside components so UI logic stays testable and the demo is repeatable without typing."',
  ],
  [
    "DemoToolbar.tsx",
    "Operator controls: case selector, load, start-over. Not product core — demo tooling.",
    "Component composition · operator tooling · fixture injection",
    '"Not product core — demo tooling that reduces live-demo risk."',
  ],
  [
    "reviewApi.ts",
    "Transport boundary to Spring; typed AsyncState returns; error mapping; no React state.",
    "API client · DTO · discriminated union · unknown vs any",
    '"Fetch logic should not scatter across presentational components — this boundary prevents that."',
  ],
  [
    "types.ts",
    "Shared DTO and UI types; AsyncState<T> discriminated union; ApiError.",
    "Discriminated union · exhaustive switch · impossible states · generics",
    '"Types make state explicit at compile time; runtime validation still matters at the network boundary."',
  ],
  [
    "ConcernInputForm.tsx",
    "Controlled concern textarea with 5k counter, validation, disabled-while-loading submit.",
    "Controlled component · single source of truth · form validation · accessibility",
    '"Controlled inputs support predictable submission."',
  ],
  [
    "ChecklistPanel.tsx",
    "Renders checklist items, metric cards, evidence cards, takeaway, missing info, limitations.",
    "Presentational component · empty/loading/error states · conditional rendering",
    '"Makes retrieved output reviewable rather than chatbot-like."',
  ],
  [
    "EvidencePanel / EvidenceCard",
    "Citation display: source ID, title, section, score, matched terms, snippet, selection state.",
    "RAG grounding · evidence-aware UI · trust boundary · citation",
    '"Evidence cards are the UI expression of RAG grounding."',
  ],
  [
    "ReviewSummaryForm.tsx",
    "Two-column form capturing reviewer-confirmed findings; prefill-and-edit from demo cases.",
    "Human-in-the-loop · reviewer confirmation · controlled form",
    '"The model proposes; the reviewer owns confirmed facts — this form is the boundary."',
  ],
  [
    "FinalAssessmentPanel.tsx",
    "Displays classification, handling path, risk lane, escalation triggers, limitations, clipboard copy.",
    "Side effect · async feedback · accessible status · refusal state",
    '"Separates final structured output from evidence; keeps limitations visible."',
  ],
  [
    "assessmentSummary.ts",
    "Pure function: deterministic plain-text serialization of the final assessment for clipboard.",
    "Pure function · deterministic serialization · side-effect isolation",
    '"Export logic is isolated so the panel owns UI feedback but not formatting."',
  ],
  [
    "Spring Controller classes",
    "HTTP routes, request binding, validation trigger, response status codes. No domain logic.",
    "@RestController · @Valid · DTO binding · status code semantics",
    '"Controllers translate HTTP into use cases — no business logic lives here."',
  ],
  [
    "Spring DTO classes",
    "Request/response contracts; decouple API shape from internal domain objects.",
    "DTO · serialization · schema evolution · API contract",
    '"DTOs stop internal shapes leaking into the public API."',
  ],
  [
    "Spring Service layer",
    "Orchestrates use cases; calls RagEngineClient; maps between DTOs and RAG results.",
    "Orchestration · testability · dependency injection · use case layer",
    '"The service owns workflow orchestration, not the controller."',
  ],
  [
    "RagEngineClient (interface)",
    "Stable Java abstraction for the Python engine. Hides subprocess details.",
    "Polymorphism · dependency inversion · interface · contract",
    '"Controllers depend on the contract, not subprocess details — swapping to HTTP later doesn\'t change the controller."',
  ],
  [
    "PythonProcessRagEngineClient",
    "Subprocess launch, JSON stdin/stdout, exit-code handling, timeout, error envelope parsing, UTF-8.",
    "Adapter pattern · process boundary · error envelope · timeout handling",
    '"All Java-to-Python integration risk is isolated here."',
  ],
  [
    "GlobalExceptionHandler",
    "@RestControllerAdvice mapping all exceptions to structured ApiErrorResponse with requestId.",
    "Cross-cutting concern · exception mapping · stable error contract · correlation ID",
    '"Clients need stable error shapes, not stack traces."',
  ],
  [
    "api_runner.py",
    "Process bridge: reads one JSON from stdin, routes to domain functions, writes one JSON to stdout.",
    "Process boundary · protocol discipline · adapter · subprocess",
    '"Lets Spring wrap the tested engine without rewriting it."',
  ],
  [
    "retrieval.py",
    "Retriever protocol, KeywordRetriever, EmbeddingRetriever; SearchResult contract; Recall@k eval.",
    "Strategy pattern · protocol · cosine similarity · top-k · retrieval metrics",
    '"Retrieval quality drives answer quality more than prompt polish."',
  ],
  [
    "refusal.py",
    "Three boundary types: external drug ref, internal record access, clinical/legal conclusion.",
    "Guardrail · boundary detection · fail-safe · controlled vocabulary",
    '"The correct answer can be \'I do not have enough evidence.\'"',
  ],
  [
    "final_assessment.py",
    "Deterministic routing from ReviewSummary to DerivedAssessment; severe triggers only from structured field.",
    "Deterministic routing · structured extraction · safety-critical decision · fail-safe defaults",
    '"Final assessment depends on reviewer-confirmed facts, not inference from prose."',
  ],
];

export function CodingBankTiers() {
  return (
    <div className="flex flex-col gap-7">
      <div>
        <div className="section-title">Coding Problem Bank — Tiers A–D</div>
        <div className="mb-4 rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5 text-xs leading-relaxed text-[var(--text-mid)]">
          <strong className="text-[var(--text)]">
            Daily discipline during leave sprint:
          </strong>{" "}
          Pick the next unsolved problem from the relevant tier. Implement in{" "}
          <strong className="text-[var(--text)]">Java</strong> for SWE screens; Python is
          fine for MLE/DS drills. Repeat problems until you can solve them without hints
          and explain the pattern + edge cases aloud in under 90 seconds. Do not skip
          tiers — Tier A problems appear as filter screens at all levels.
        </div>

        <div className="flex flex-col gap-5">
          {tiers.map((tier) => (
            <div key={tier.letter}>
              <div className="mb-2 flex items-center gap-2">
                <TierBadge letter={tier.letter} color={tier.color} />
                <span className="text-sm font-semibold text-[var(--text)]">
                  {tier.title}
                </span>
              </div>
              <RefTable headers={tier.headers} rows={tier.rows} />
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="section-title">
          20-File Defense Map — Know Every File Cold
        </div>
        <div className="mb-4 rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5 text-xs leading-relaxed text-[var(--text-mid)]">
          For each file: (1) why it exists, (2) what it owns, (3) what it deliberately
          does not own, (4) one terminology term, (5) one interview line. Practice at
          interview speed — 45–90 seconds per file. The file map is the conversion layer
          that turns code into talk tracks.
        </div>
        <RefTable
          headers={["File", "Owns / Why it exists", "Terminology", "Interview line"]}
          rows={defenseMap}
        />
      </div>
    </div>
  );
}

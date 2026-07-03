"use client";

/**
 * 20-Stage Progression Tracker
 *
 * Renders the complete list of stages from the original workbench + leave sprint plan.
 * Supports one-click mark done / unmark with timestamps stored in Zustand.
 */

import { useSprintStore } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Clock } from "lucide-react";

export interface StageDef {
  id: string;
  name: string;
  phase: string;
  tags?: string[];
}

const STAGES: StageDef[] = [
  { id: "0", name: "Project framing — synthetic-data-only compounding quality RAG prototype", phase: "v8" },
  { id: "1", name: "Schemas — strict Pydantic contracts (intake, product context, review summary...)", phase: "v8" },
  { id: "2", name: "Expected outputs — hand-written gold labels for structured-output validation", phase: "v8" },
  { id: "3", name: "SOP corpus — markdown corpus supports current workflow (frozen)", phase: "v8" },
  { id: "4", name: "Ingestion / chunking — SOP frontmatter parsed, chunks.jsonl emitted", phase: "v8" },
  { id: "5", name: "Keyword retrieval — top_k, score ordering, wrapped as KeywordRetriever", phase: "v8" },
  { id: "6", name: "Retrieval evaluation — hit_rate@k, MRR, failed question IDs", phase: "v8" },
  { id: "7", name: "Checklist generation — Phase 1 checklist + IntakeUnderstanding", phase: "v8" },
  { id: "8", name: "Final assessment — Phase 2 deterministic routing from ReviewSummary", phase: "v8" },
  { id: "9", name: "Reporting / CLI — two-phase demo, manager-readable output", phase: "v8" },
  { id: "10", name: "Refusal behavior — 3 boundary types (external / internal / clinical)", phase: "v8" },
  { id: "11", name: "LLM extraction — IntakeUnderstanding + ReviewSummary via OpenAI", phase: "v8" },
  { id: "12", name: "Failure log — 25+ documented failures, Jackson 3, subprocess protocol", phase: "v8" },
  { id: "13", name: "Docs — README, data dictionary, DECISIONS.md, workflow taxonomy", phase: "v8" },
  { id: "14", name: "Citation precision — map each checklist item to supporting chunk_ids", phase: "MLE", tags: ["MLE"] },
  { id: "15a", name: "Retriever abstraction — Retriever protocol + KeywordRetriever + EmbeddingModel", phase: "MLE", tags: ["MLE"] },
  { id: "15b", name: "Embedding baseline — HashingEmbeddingModel + cosine", phase: "MLE", tags: ["MLE"] },
  { id: "15c", name: "Retrieval comparison scaffold — retrieval_compare.py + metrics", phase: "MLE", tags: ["MLE"] },
  { id: "15d", name: "Generate + commit retrieval comparison report (keyword vs embedding)", phase: "MLE", tags: ["MLE"] },
  { id: "15e", name: "Real semantic embedding model (sentence-transformers)", phase: "MLE", tags: ["MLE"] },
  { id: "16a", name: "Gradle monorepo · Spring Boot 4.0 / Java 25 toolchain", phase: "SWE", tags: ["SWE"] },
  { id: "16b", name: "Spring Boot shell · GET /health + HealthResponse + Swagger", phase: "SWE", tags: ["SWE"] },
  { id: "16c", name: "GlobalExceptionHandler + ApiErrorResponse + stable error contract", phase: "SWE", tags: ["SWE"] },
  { id: "16d", name: "RagEngineClient interface + PythonProcessRagEngineClient adapter", phase: "SWE", tags: ["SWE"] },
  { id: "17", name: "app/api_runner.py bridge — all 3 endpoints backed by real Python", phase: "SWE", tags: ["SWE"] },
  { id: "17b", name: "Controller tests (Retrieve + FinalAssessment) + smoke test", phase: "SWE", tags: ["SWE"] },
  { id: "18a", name: "Vite + React + TS scaffold + typed client + discriminated AsyncState", phase: "SWE", tags: ["SWE"] },
  { id: "18b", name: "ConcernInputForm + ChecklistPanel + Evidence cards", phase: "SWE", tags: ["SWE"] },
  { id: "18c", name: "ReviewSummaryForm + FinalAssessmentPanel + handling path", phase: "SWE", tags: ["SWE"] },
  { id: "18d", name: "demoCases.ts + DemoToolbar + clipboard export", phase: "SWE", tags: ["SWE"] },
  { id: "18e", name: "Vite proxy → Spring + full-stack browser demo verified", phase: "SWE", tags: ["SWE"] },
  { id: "18f", name: "Clipboard test hardening + Python UTF-8 fix", phase: "SWE", tags: ["SWE"] },
  { id: "18g", name: "README + Phase 5 screenshots + architecture framing", phase: "SWE", tags: ["SWE"] },
  { id: "19", name: "CI/Docker/runbook — GitHub Actions 3-job + Docker Compose + RUNBOOK.md", phase: "Phase 6", tags: ["SWE"] },
  { id: "20", name: "Eval persistence — SQLite review_case + eval_run tables", phase: "Later", tags: ["MLE"] },
  { id: "21", name: "Applications submitted + mocks complete + advocate engaged", phase: "Post-sprint", tags: [] },
];

export function StageProgression() {
  const { stages, markStageDone, unmarkStage } = useSprintStore();

  // Count done
  const doneCount = Object.values(stages).filter((s) => s.done).length;
  const total = STAGES.length;

  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <div className="section-title">20-STAGE PROGRESSION</div>
          <div className="text-2xl font-semibold tracking-[-1px] tabular-nums">
            {doneCount} <span className="text-base align-super text-[var(--text-mid)]">/ {total}</span>
          </div>
        </div>
        <div className="text-right text-xs text-[var(--text-dim)]">
          Phase gates visible.<br />One-click mark.
        </div>
      </div>

      <div className="space-y-1.5">
        {STAGES.map((stage, idx) => {
          const st = stages[stage.id] || { done: false };
          const isDone = st.done;

          return (
            <div
              key={stage.id}
              className={`stage group flex items-center justify-between gap-3 ${isDone ? "done" : ""} ${idx < 13 ? "" : "border-l-2 border-l-[var(--cyan)]/30"}`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <button
                  onClick={() => (isDone ? unmarkStage(stage.id) : markStageDone(stage.id))}
                  className={`stage-mark flex-none ${isDone ? "bg-[var(--done)] text-[#0a0c10]" : "hover:border-[var(--cyan)] hover:text-[var(--cyan)]"}`}
                  aria-label={isDone ? "Unmark done" : "Mark done"}
                >
                  {isDone ? <Check size={13} /> : <span className="text-[10px] font-mono">{stage.id}</span>}
                </button>

                <div className="min-w-0 pr-2">
                  <div className={`text-sm leading-tight ${isDone ? "line-through text-[var(--text-mid)]" : ""}`}>
                    {stage.name}
                  </div>
                  {stage.tags && stage.tags.length > 0 && (
                    <div className="mt-0.5 flex gap-1">
                      {stage.tags.map((t) => (
                        <span key={t} className="text-[9px] px-1.5 py-px rounded bg-white/5 text-[var(--text-dim)] border border-white/10">{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 text-xs">
                {isDone && st.doneAt && (
                  <div className="flex items-center gap-1 text-[var(--text-dim)] font-mono tabular-nums text-[10px]">
                    <Clock size={12} />
                    {new Date(st.doneAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </div>
                )}

                <button
                  onClick={() => (isDone ? unmarkStage(stage.id) : markStageDone(stage.id))}
                  className={`rounded-lg border px-2.5 py-1 text-[10px] font-medium transition ${isDone ? "border-[var(--done)] text-[var(--done)] hover:bg-[var(--done)]/10" : "border-[var(--border)] hover:border-[var(--cyan)] hover:text-[var(--cyan)]"}`}
                >
                  {isDone ? "DONE" : "MARK DONE"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-[10px] text-[var(--text-dim)] mt-3 pl-1">
        Changing <span className="font-mono">data/app-state.json</span> resets baseline on first load. Your local progress lives in localStorage.
      </div>
    </div>
  );
}

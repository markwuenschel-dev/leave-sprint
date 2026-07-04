/**
 * Canonical stage progression. Single source of truth for the stage list and
 * count — previously duplicated inline in StageProgression.tsx and hardcoded as
 * "20" in several components (the real count is derived here).
 */

export interface StageDef {
  id: string;
  name: string;
  phase: string;
  tags?: string[];
}

export const STAGES: StageDef[] = [
  // v8 Foundation
  { id: '0', name: 'Project framing — synthetic-data-only compounding quality RAG prototype', phase: 'v8' },
  { id: '1', name: 'Schemas — strict Pydantic contracts', phase: 'v8' },
  { id: '2', name: 'Expected outputs — hand-written gold labels', phase: 'v8' },
  { id: '3', name: 'SOP corpus — markdown corpus (frozen)', phase: 'v8' },
  { id: '4', name: 'Ingestion / chunking — SOP frontmatter parsed', phase: 'v8' },
  { id: '5', name: 'Keyword retrieval — wrapped as KeywordRetriever', phase: 'v8' },
  { id: '6', name: 'Retrieval evaluation — hit_rate@k, MRR', phase: 'v8' },
  { id: '7', name: 'Checklist generation — Phase 1 + IntakeUnderstanding', phase: 'v8' },
  { id: '8', name: 'Final assessment — Phase 2 deterministic routing', phase: 'v8' },
  { id: '9', name: 'Reporting / CLI — two-phase demo', phase: 'v8' },
  { id: '10', name: 'Refusal behavior — 3 boundary types', phase: 'v8' },
  { id: '11', name: 'LLM extraction — IntakeUnderstanding + ReviewSummary', phase: 'v8' },
  { id: '12', name: 'Failure log — 25+ documented failures', phase: 'v8' },
  { id: '13', name: 'Docs — README, data dictionary, DECISIONS.md', phase: 'v8' },

  // MLE Track
  { id: '14', name: 'Citation precision — map checklist items to chunk_ids', phase: 'MLE', tags: ['MLE'] },
  { id: '15a', name: 'Retriever abstraction — Retriever protocol', phase: 'MLE', tags: ['MLE'] },
  { id: '15b', name: 'Embedding baseline — HashingEmbeddingModel', phase: 'MLE', tags: ['MLE'] },
  { id: '15c', name: 'Retrieval comparison scaffold', phase: 'MLE', tags: ['MLE'] },
  { id: '15d', name: 'Generate retrieval comparison report', phase: 'MLE', tags: ['MLE'] },
  { id: '15e', name: 'Real semantic embedding model (sentence-transformers)', phase: 'MLE', tags: ['MLE'] },

  // SWE Track
  { id: '16a', name: 'Gradle monorepo · Spring Boot 4.0 / Java 25', phase: 'SWE', tags: ['SWE'] },
  { id: '16b', name: 'Spring Boot shell · GET /health + Swagger', phase: 'SWE', tags: ['SWE'] },
  { id: '16c', name: 'GlobalExceptionHandler + ApiErrorResponse', phase: 'SWE', tags: ['SWE'] },
  { id: '16d', name: 'RagEngineClient + PythonProcessRagEngineClient', phase: 'SWE', tags: ['SWE'] },
  { id: '17', name: 'app/api_runner.py bridge — all endpoints', phase: 'SWE', tags: ['SWE'] },
  { id: '17b', name: 'Controller tests + smoke test', phase: 'SWE', tags: ['SWE'] },
  { id: '18a', name: 'Vite + React + TS scaffold + typed client', phase: 'SWE', tags: ['SWE'] },
  { id: '18b', name: 'ConcernInputForm + ChecklistPanel + Evidence cards', phase: 'SWE', tags: ['SWE'] },
  { id: '18c', name: 'ReviewSummaryForm + FinalAssessmentPanel', phase: 'SWE', tags: ['SWE'] },
  { id: '18d', name: 'demoCases.ts + DemoToolbar + clipboard export', phase: 'SWE', tags: ['SWE'] },
  { id: '18e', name: 'Vite proxy → Spring + full-stack demo', phase: 'SWE', tags: ['SWE'] },
  { id: '18f', name: 'Clipboard test hardening + Python UTF-8 fix', phase: 'SWE', tags: ['SWE'] },
  { id: '18g', name: 'README + Phase 5 screenshots + architecture', phase: 'SWE', tags: ['SWE'] },

  // Later
  { id: '19', name: 'CI/Docker/runbook — GitHub Actions + Docker Compose', phase: 'Phase 6', tags: ['Infra'] },
  { id: '20', name: 'Eval persistence — SQLite review_case + eval_run', phase: 'Later', tags: ['MLE'] },
  { id: '21', name: 'Applications submitted + mocks complete', phase: 'Post-sprint', tags: [] },
];

export const TOTAL_STAGES = STAGES.length;

export const PHASE_ORDER = ['v8', 'MLE', 'SWE', 'Phase 6', 'Later', 'Post-sprint'];

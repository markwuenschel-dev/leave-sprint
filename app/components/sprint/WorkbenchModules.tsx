type Phase = {
  label: string;
  labelColor?: string;
  text: React.ReactNode;
};

type TrackCard = {
  icon: string;
  iconColor: string;
  accent: string;
  name: string;
  subtitle: string;
  phases: Phase[];
};

function Mono({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[0.92em] text-[var(--text)]">{children}</span>
  );
}

const tracks: TrackCard[] = [
  {
    icon: "🐍",
    iconColor: "var(--green)",
    accent: "var(--green)",
    name: "rag-engine-python/",
    subtitle: "Python RAG engine · primary MLE signal · ✅ DONE — maintenance mode",
    phases: [
      {
        label: "WK 1–3",
        text: "v8 frozen: schemas, gold labels, SOPs, ingestion, keyword retrieval, eval, checklist, final assessment, CLI, refusal, LLM extraction, failure log. ✓",
      },
      {
        label: "WK 4",
        text: (
          <>
            Commit <Mono>docs: freeze v8</Mono>. Move into monorepo. Design{" "}
            <Mono>app/api_runner.py</Mono> stdin/stdout JSON contract.
          </>
        ),
      },
      {
        label: "WK 5",
        text: (
          <>
            Implement <Mono>app/api_runner.py</Mono>. Stage 14: citation precision —
            checklist items carry <Mono>supporting_chunk_ids</Mono>.
          </>
        ),
      },
      {
        label: "WK 6",
        text: (
          <>
            Stage 15: <Mono>KeywordRetriever</Mono> / <Mono>EmbeddingRetriever</Mono> /{" "}
            <Mono>HybridRetriever</Mono>. <Mono>retrieval_comparison.md</Mono>.
          </>
        ),
      },
      {
        label: "POST-LEAVE",
        text: "One new eval question/week. HybridRetriever (keyword + semantic RRF) when comparison report justifies it. Multi-hop and RAGAS if and when a screen confirms the bar.",
      },
    ],
  },
  {
    icon: "☕",
    iconColor: "var(--orange)",
    accent: "var(--orange)",
    name: "services/review-api/",
    subtitle: "Spring Boot API boundary · SWE full-stack signal · ✅ DONE",
    phases: [
      {
        label: "DONE",
        labelColor: "var(--done)",
        text: (
          <>
            Spring Boot 4.0 / Java 25 shell · <Mono>/health</Mono> · Swagger UI ·{" "}
            <Mono>GlobalExceptionHandler</Mono> · DTO validation ·{" "}
            <Mono>RagEngineClient</Mono> interface ·{" "}
            <Mono>PythonProcessRagEngineClient</Mono> subprocess adapter · Jackson 3 ·
            working-dir fix.
          </>
        ),
      },
      {
        label: "DONE",
        labelColor: "var(--done)",
        text: (
          <>
            <Mono>POST /api/checklist</Mono> · <Mono>POST /api/retrieve</Mono> ·{" "}
            <Mono>POST /api/final-assessment</Mono> all backed by real Python bridge.{" "}
            <Mono>PYTHONIOENCODING=utf-8</Mono> + <Mono>PYTHONUTF8=1</Mono> encoding
            boundary hardened.
          </>
        ),
      },
      {
        label: "LV WK 1",
        text: (
          <>
            <Mono>RetrieveControllerTest</Mono> +{" "}
            <Mono>FinalAssessmentControllerTest</Mono> with MockMvc + mocked{" "}
            <Mono>RagEngineClient</Mono>. One local workflow smoke test Java→Python.
          </>
        ),
      },
      {
        label: "POST-LEAVE",
        text: "Request logging + correlation IDs across all endpoints. Actuator health/metrics. One small improvement per active sprint week.",
      },
    ],
  },
  {
    icon: "⚛️",
    iconColor: "var(--blue)",
    accent: "var(--blue)",
    name: "apps/review-ui/",
    subtitle: "React / TS review surface · Phase 5 ✅ COMPLETE",
    phases: [
      {
        label: "DONE",
        labelColor: "var(--done)",
        text: (
          <>
            <Mono>reviewApi.ts</Mono> typed client · <Mono>types.ts</Mono> DTOs +
            discriminated <Mono>AsyncState&lt;T&gt;</Mono> · <Mono>ApiError</Mono> shape.
            Vite proxy → Spring Boot wired.
          </>
        ),
      },
      {
        label: "DONE",
        labelColor: "var(--done)",
        text: (
          <>
            <Mono>ConcernInputForm</Mono> (5k counter, disabled-while-loading) ·{" "}
            <Mono>ChecklistPanel</Mono> (metric cards, evidence cards, takeaway,
            limitations) · <Mono>EvidencePanel</Mono>/<Mono>EvidenceCard</Mono>
            (source/score/snippet/selection).
          </>
        ),
      },
      {
        label: "DONE",
        labelColor: "var(--done)",
        text: (
          <>
            <Mono>ReviewSummaryForm</Mono> (two-column, accessible, prefill-and-edit) ·{" "}
            <Mono>FinalAssessmentPanel</Mono> (handling-path banner, summary metrics,
            refusal state, clipboard copy).
          </>
        ),
      },
      {
        label: "DONE",
        labelColor: "var(--done)",
        text: (
          <>
            <Mono>demoCases.ts</Mono> typed synthetic cases · <Mono>DemoToolbar</Mono>
            (selector/load/reset) · <Mono>assessmentSummary.ts</Mono> clipboard export ·
            4-step progress indicator · demo sidebar · responsive tablet + mobile.
          </>
        ),
      },
      {
        label: "DONE",
        labelColor: "var(--done)",
        text: (
          <>
            Clipboard test hardening (userEvent before spy, async await) · Python UTF-8
            fix (PYTHONIOENCODING + PYTHONUTF8=1) · <Mono>browser_demo_script.md</Mono> ·
            full browser workflow verified.
          </>
        ),
      },
      {
        label: "LV WK 1",
        text: "README update with Phase 5 screenshots + architecture framing. Phase 5 gate complete. Coded as Day 1 of leave sprint.",
      },
      {
        label: "LV WK 1–2",
        text: "Phase 6: CI pipeline for UI build job (npm ci + npm run build + typecheck). Docker image or nginx static serve option.",
      },
    ],
  },
  {
    icon: "🧰",
    iconColor: "var(--violet)",
    accent: "var(--violet)",
    name: "CI · Docker · Runbook",
    subtitle: "Production-engineering surface · SWE signal · Phase 6 — Leave Wk 1–2",
    phases: [
      {
        label: "DONE",
        labelColor: "var(--done)",
        text: "Root Gradle monorepo · ADRs 0001–0003 (subprocess adapter + HTTP swap path). Spring healthcheck endpoint live.",
      },
      {
        label: "LV WK 1",
        text: (
          <>
            GitHub Actions: 3-job CI (pytest + <Mono>./gradlew test</Mono> +{" "}
            <Mono>npm run build</Mono>). All three jobs must pass on push. Green badge on
            main.
          </>
        ),
      },
      {
        label: "LV WK 1",
        text: (
          <>
            <Mono>Dockerfile.review-api</Mono> (multi-stage, pin JDK 25) ·{" "}
            <Mono>Dockerfile.rag-engine</Mono> (Python slim, pin version, set
            PYTHONIOENCODING). <Mono>.dockerignore</Mono> for both. Both images must build
            locally.
          </>
        ),
      },
      {
        label: "LV WK 1",
        text: (
          <>
            <Mono>infra/docker-compose.yml</Mono> — all 3 services on shared network ·
            healthchecks · <Mono>.env.example</Mono>. Correlation ID flows Spring →
            Python subprocess log.
          </>
        ),
      },
      {
        label: "LV WK 2",
        text: (
          <>
            <Mono>RUNBOOK.md</Mono> — start/stop commands, health check commands,
            correlation ID log tracing, known failure modes + recovery. Phase 6 gate:
            docker compose up → full demo reproducible.
          </>
        ),
      },
      {
        label: "LV WK 3+",
        text: (
          <>
            Postgres audit log + <Mono>review_case</Mono>/<Mono>eval_run</Mono> tables
            (Phase 7). Flyway migration if using Postgres. Terraform stays as{" "}
            <Mono>infra/README.md</Mono> notes only.
          </>
        ),
      },
    ],
  },
  {
    icon: "📋",
    iconColor: "var(--yellow)",
    accent: "var(--yellow)",
    name: "Chewy ETL Pipeline",
    subtitle: "Production data work · existing portfolio bullet",
    phases: [
      {
        label: "EXISTING",
        text: "2,200+ line Python ETL · Smartsheet + Excel + Snowflake reconciliation · multi-format output (CSV / XLSX / Tableau Hyper) · 75% formula setup time reduction · 80% overtime reduction · Director-level visibility. Work-hours only. Covers the production data + root cause story without additional personal-time build work.",
      },
    ],
  },
  {
    icon: "🎤",
    iconColor: "var(--cyan)",
    accent: "var(--yellow)",
    name: "Interview Prep",
    subtitle: "Coding drills · file defense · mock screens · ⚠ AT RISK — Day 16 of 29",
    phases: [
      {
        label: "GAP",
        labelColor: "var(--yellow)",
        text: (
          <>
            <strong className="text-[var(--text)]">Coding challenges (Tier A→D)</strong> —
            the biggest active gap heading into Mock #1. Live coding practice has not kept
            pace with the daily 30-minute target. Highest priority for the remaining 13
            days.
          </>
        ),
      },
      {
        label: "GAP",
        labelColor: "var(--yellow)",
        text: (
          <>
            <strong className="text-[var(--text)]">Project walkthroughs</strong> —
            narrative "walk an interviewer through what you built" prep, not started.
            Needed for the project deep-dive portion of every mock and real screen.
          </>
        ),
      },
      {
        label: "GAP",
        labelColor: "var(--yellow)",
        text: (
          <>
            <strong className="text-[var(--text)]">SQL/Snowflake</strong> — not started.
            Was slotted into the sprint's daily rhythm; hasn't happened yet.
          </>
        ),
      },
      {
        label: "GAP",
        labelColor: "var(--yellow)",
        text: (
          <>
            <strong className="text-[var(--text)]">Kotlin</strong> — not started. Java
            side of the daily coding drill is in progress but behind pace; Kotlin hasn't
            been touched.
          </>
        ),
      },
      {
        label: "DAILY",
        text: "30m coding drill (Tier A→D) + 20m file defense + 15m Q&A bank — every day of the leave sprint without exception.",
      },
      {
        label: "DAY 11",
        text: "Mock #0 — 5-min demo cold, no notes. Record what breaks. Fix before Mock #1.",
      },
      {
        label: "DAY 21",
        text: (
          <>
            Mock #1 — full DSA + project deep-dive. Written feedback committed to{" "}
            <Mono>docs/mock_interview_notes.md</Mono>.
          </>
        ),
      },
      {
        label: "DAY 26",
        text: "Mock #2 — full loop: DSA + system design + project + behavioral. Postmortem → fix weak spots same day.",
      },
      {
        label: "DAY 29",
        text: "Decision gate. If no loop scheduled: escalate through Kenny, begin parallel external search. Nothing undecided.",
      },
    ],
  },
];

function TrackCardView({ card }: { card: TrackCard }) {
  return (
    <div
      className="card-glass p-5"
      style={{ borderLeft: `3px solid ${card.accent}` }}
    >
      <div className="flex items-start gap-3 mb-4">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg"
          style={{ background: "var(--surface-2)", color: card.iconColor }}
        >
          {card.icon}
        </div>
        <div>
          <div className="font-mono text-sm font-semibold text-[var(--text)]">
            {card.name}
          </div>
          <div className="mt-1 text-xs text-[var(--text-mid)] leading-relaxed">
            {card.subtitle}
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-2.5">
        {card.phases.map((phase, i) => (
          <div key={i} className="flex gap-3 text-xs leading-relaxed">
            <span
              className="shrink-0 font-mono font-semibold uppercase tracking-wider"
              style={{ minWidth: "68px", color: phase.labelColor ?? "var(--cyan)" }}
            >
              {phase.label}
            </span>
            <span className="text-[var(--text-mid)]">{phase.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function WorkbenchModules() {
  return (
    <div className="flex flex-col gap-7">
      <div>
        <div className="section-title">Target · Chewy Internal Transition</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <div
            className="card-glass p-5"
            style={{ borderLeft: "3px solid var(--cyan)" }}
          >
            <div className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--cyan)]">
              Primary track · ML Engineering
            </div>
            <div className="mb-2 text-[15px] font-semibold text-[var(--text)]">
              MLE — Chewy Internal
            </div>
            <div className="text-xs leading-relaxed text-[var(--text-mid)]">
              RAG pipeline end-to-end: corpus ingestion, retrieval (keyword + embedding +
              hybrid), evaluation harness with labeled questions, Recall@k and MRR,
              structured LLM extraction, refusal contract, deterministic routing,
              human-in-the-loop review surface, 27+ failure log entries. Python owns all
              AI/domain behavior. Full system reproducible via Docker Compose.
            </div>
          </div>
          <div
            className="card-glass p-5"
            style={{ borderLeft: "3px solid var(--magenta)" }}
          >
            <div className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--magenta)]">
              Secondary track · Software Engineering
            </div>
            <div className="mb-2 text-[15px] font-semibold text-[var(--text)]">
              SWE Full-Stack — Chewy Internal
            </div>
            <div className="text-xs leading-relaxed text-[var(--text-mid)]">
              Python + React + Java in one monorepo. Spring Boot API boundary with typed
              interface, subprocess adapter, structured error contract, Swagger. React
              HITL review UI with discriminated async state, operator controls, evidence
              cards, clipboard export. GitHub Actions CI, Docker Compose, RUNBOOK.
              Pharmacy QA → internal workflow is the same archetype.
            </div>
          </div>
        </div>
        <div className="mt-3.5 rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5 text-xs leading-relaxed text-[var(--text-mid)]">
          <strong className="text-[var(--text)]">Advocate:</strong> Kenny Wallace (ORBIT
          collaboration — HR data consolidation, LLM reconciliation). The portfolio
          demonstrates the same instincts that made ORBIT work: mapping messy
          multi-system data, surfacing evidence for human review, building for
          non-technical operators. MLE is the preferred landing; SWE full-stack is the
          more likely path given headcount.
        </div>
      </div>

      <div>
        <div className="section-title">
          Workbench Modules — Where Evidence Comes From
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {tracks.map((card) => (
            <TrackCardView key={card.name} card={card} />
          ))}
        </div>
      </div>
    </div>
  );
}

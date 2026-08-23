<p align="center">
  <img src="docs/assets/waypoint-wordmark.svg" alt="Waypoint" width="520"/>
</p>

<p align="center">
  <strong>Local-first career hub.</strong> Rebuild readiness (phase B), then land a role (phase A).<br/>
  Your grades live in embedded PGlite on <em>your</em> machine. Not a 29-day leave countdown.
</p>

<p align="center">
  <a href="https://github.com/markwuenschel-dev/leave-sprint/actions/workflows/ci.yml"><img src="https://github.com/markwuenschel-dev/leave-sprint/actions/workflows/ci.yml/badge.svg" alt="CI"/></a>
  <a href="https://leavesprint.44-198-76-44.nip.io/api/health"><img src="https://img.shields.io/badge/live-%2Fapi%2Fhealth-22c55e?logo=statuspage&logoColor=white" alt="live health"/></a>
  <img src="https://img.shields.io/badge/node-22-339933?logo=nodedotjs&logoColor=white" alt="Node 22"/>
  <img src="https://img.shields.io/badge/pnpm-11-F69220?logo=pnpm&logoColor=white" alt="pnpm 11"/>
  <img src="https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white" alt="Next.js 16"/>
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=111" alt="React 19"/>
  <img src="https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/PGlite-embedded-7148FC?logo=postgresql&logoColor=white" alt="PGlite"/>
  <img src="https://img.shields.io/badge/data-local--first-0ea5e9" alt="local-first"/>
  <img src="https://img.shields.io/badge/tests-vitest-6E9F18?logo=vitest&logoColor=white" alt="Vitest"/>
  <img src="https://img.shields.io/badge/lint-oxlint-1F6FEB" alt="oxlint"/>
</p>

<p align="center">
  <a href="#quick-start">Start</a> ·
  <a href="#shell">Shell</a> ·
  <a href="#evidence-floor">Evidence floor</a> ·
  <a href="#architecture">Architecture</a> ·
  <a href="#ai-interviewer">AI Interviewer</a> ·
  <a href="#deploy">Deploy</a> ·
  <a href="#verify">Verify</a>
</p>

---

## What this is

**Waypoint** (`apps/waypoint`, `@waypoint/*`) is the live product: a personal hub for a career transition. You practice, defend files, sit interview reps, and watch a **hybrid evidence floor** for two primary roles (SWE Full Stack II and MLE II). Crossing green does **not** flip you into applications — you still decide the go / no-go.

**Leave Sprint Twin** (`app/`, root `lib/`, `data/`) is frozen scaffolding. Import source only. Not the daily driver.

Always **pnpm**.

```mermaid
flowchart LR
  subgraph B["Phase B · rebuild"]
    P[Practice]
    D[Defense]
    I[Interview reps]
    A[Admin light]
  end
  F{{Evidence green?}}
  H[You decide]
  subgraph Aphase["Phase A · land a role"]
    Apps[Applications]
    Net[Network]
  end
  P --> F
  D --> F
  I --> F
  A -.-> F
  F -->|floor met| H
  H -->|go| Aphase
  H -->|stay| B
```

---

## Quick start

```bash
pnpm install
pnpm dev          # http://localhost:3210 — apps/waypoint
pnpm build
pnpm start        # migrate PGlite, then next start
```

No required env for local dev. Empty `.env` → embedded DB, open gate, no LLM providers. A production build (`NODE_ENV=production`) needs `APP_TOKEN` set — an unset token no longer opens the app there (INT-002).

| Want | Do |
| --- | --- |
| Gate the site | `APP_TOKEN=…` in repo-root `.env` · unlock at `/unlock` or `?token=` once |
| Pin the database | `WAYPOINT_PGLITE_DIR=/absolute/path` — unset means `<cwd>/.pglite` |
| AI mocks | LiteLLM gateway (below) or raw provider keys |

---

## Shell

Live tabs in `apps/waypoint/app/page.tsx`:

```mermaid
flowchart TB
  subgraph header["header"]
    RF[Role filter · All / SWE / MLE / …]
    EG[Evidence pill]
  end
  subgraph tabs["Waypoint shell"]
    T[Today]
    R[Readiness]
    Pr[Practice]
    De[Defense]
    In[Interview]
    St[Study]
    Ap[Applications]
    W[Weekly]
    M[AI Questions]
    Mo[More]
  end
  T --- R --- Pr --- De --- In
  In --- St --- Ap --- W --- M --- Mo
```

| Tab | Job |
| --- | --- |
| **Today** | Rolling checklist: Practice · Defense · Interview reps · Admin light |
| **Readiness** | Hybrid floor for both primaries + the B→A go/no-go |
| **Practice** | Problem bank / solidity |
| **Defense** | File and story defense |
| **Interview** | Q-bank, grade, history, gaps, retest, performance |
| **Study** | Deterministic study digest |
| **Applications** | One row = one role + company |
| **Weekly** | Weekly review |
| **AI Questions** | AI Interviewer (examiner, not the Interview tab) |
| **More** | Export / import JSON, twin import, about |

Rhythm checkboxes are cadence. They are not the evidence floor.

---

## Evidence floor

<p align="center">
  <img src="docs/assets/evidence-floor.svg" alt="Hybrid evidence floor: practice, interview, defense, then a human go/no-go" width="900"/>
</p>

**Evidence green** (both primaries):

1. Practice solidity ≈ 80% Solid on a core list
2. Interview performance ≥ 2 solid mocks / scored sessions
3. Core stories / file defense practiced cold

Applications, network, resume polish, and finishing the whole bank are **not** floor criteria. Secondary and escape roles do not block.

Coached AI sessions stamp `llmIndependence.llmUsed: true` and do not inflate the floor. Glossary: [`CONTEXT.md`](CONTEXT.md).

---

## Architecture

<p align="center">
  <img src="docs/assets/architecture.svg" alt="Browser shell, Next API, PGlite, rubric packages, optional LLM gateway" width="900"/>
</p>
<!-- diagram still shows the retired twin as of INT-001; regenerate when convenient -->

```text
apps/waypoint/              live Next app
packages/rubric/            @waypoint/rubric   · observations + derive + score
packages/qbank/             @waypoint/qbank
packages/practice-types/    @waypoint/practice-types
docs/adr/                   accepted decisions
```

```mermaid
flowchart LR
  UI[Zustand shell] -->|PUT /api/state| Parse[parse + caps]
  Parse --> PG[(PGlite file)]
  UI -->|POST /api/interview| Pipe[gradeToEntry]
  Pipe --> Obs[assertObservations]
  Obs --> Eng["@waypoint/rubric derive"]
  Eng --> PG
  Pipe -.->|server only| LLM[LiteLLM / providers]
```

Persist is file-backed PGlite. Backup the directory, or **More → Export JSON**. One node. Not a multi-instance DB.

---

## AI Interviewer

An LLM examiner across Q-bank tracks. **Augmenting** evidence, not the source of truth. One provider per session plays ask → probe → grade. Answers are unaided by default.

The model emits **observations**. The engine scores. Provenance is stamped (who asked, who graded).

```mermaid
sequenceDiagram
  actor You
  participant API as /api/interview
  participant P as Provider adapter
  participant I as Observations intake
  participant R as Rubric engine

  You->>API: answer + probe
  API->>P: grade (server-side key)
  P-->>I: JSON observations
  I-->>I: schema presence check
  I->>R: intake
  R-->>API: RubricEntry + droppedTags
  Note over R: missing Correctness ⇒ no derived level
  API-->>You: grade · provenance · flags
```

ADRs: [0001 evidence](docs/adr/0001-ai-interviewer-evidence-policy.md) · [0002 providers](docs/adr/0002-ai-interviewer-provider-architecture.md) · [0003 flow](docs/adr/0003-ai-interviewer-interview-flow.md) · [0004 observations](docs/adr/0004-ai-interviewer-observations-contract.md).

### LiteLLM gateway (preferred)

From [litellm-langfuse-gateway](https://github.com/markwuenschel-dev/litellm-langfuse-gateway), then repo-root `.env`:

```env
LITELLM_BASE_URL=http://localhost:4000/v1
LITELLM_VIRTUAL_KEY=sk-...   # virtual key from `llg keys create`
```

When the virtual key is set, providers route through the gateway. You do not need raw `OPENAI_API_KEY` / etc. in this repo for chat/grade. Dictation still wants `OPENAI_API_KEY` (Whisper).

CI sets `LLG_HERMETIC=1`. Tests never bill.

See `.env.example` and `apps/waypoint/lib/llm/registry.ts`.

---

## Deploy

Local-first still means **your** server. Production on this repo is a Compose service `leave-sprint` on a single EC2 box, PGlite volume, Caddy in front.

```mermaid
flowchart LR
  Dev[laptop] -->|scripts/deploy.sh · deploy.ps1| Box[EC2 /opt/stack]
  Box --> Git[leave-sprint @ SHA]
  Box --> Img[Dockerfile.leave-sprint]
  Img --> Ctr[compose service leave-sprint]
  Ctr --> Vol[(PGlite volume)]
  Caddy[Caddy :443] --> Ctr
  Probe[GET /api/health] --> Ctr
```

```bash
./scripts/deploy.sh              # latest main
./scripts/deploy.sh <sha>        # pin / roll back
# PowerShell: .\scripts\deploy.ps1
```

Scripts SSH to the box, sync the clone, `docker compose up -d --build leave-sprint`, then retry `GET /api/health` through migrate+start warmup.

Bare Node + systemd is documented as an alternate single-box recipe (not what the scripts run):

```bash
pnpm install
pnpm --filter waypoint build
export WAYPOINT_PGLITE_DIR=/var/lib/waypoint/pglite
export APP_TOKEN='strong-secret'
mkdir -p "$WAYPOINT_PGLITE_DIR"
pnpm --filter waypoint start     # 0.0.0.0 · PORT 3000
```

Put nginx/Caddy in front. Multi-instance needs a different DB story.

---

## Verify

Same sequence CI runs (`.github/workflows/ci.yml`):

| Gate | Command |
| --- | --- |
| Lint | `pnpm lint` |
| Typecheck | `pnpm typecheck` |
| Tests | `pnpm test` |
| Waypoint | `pnpm --filter waypoint build` |

Hermetic: `LLG_HERMETIC=1` in CI. No live LLM on the verify job.

---

## Twin

The frozen "Leave Sprint Twin" predecessor (29-day leave dashboard) was retired from this repo (INT-001) — it had zero live import dependency from Waypoint and its own rubric/qbank copies had already drifted from `@waypoint/rubric`/`@waypoint/qbank`. Its history is fully recoverable from git (`git show <pre-removal-commit>:data/app-state.json`, etc.) if ever needed.

The one-shot import feature itself is unaffected: **More → twin import** still works, backed by `apps/waypoint/lib/twinImport.ts`, which was always independent of the twin's own application code — it parses an exported JSON payload (practice progress + rubric history only), not a live twin instance.

---

## Decisions

Product notes: `.scratch/career-transition-hub/`. Domain words: [`CONTEXT.md`](CONTEXT.md). Scoring spec: `Technical_Competency_Scoring_System_v1_11.md`.

**TECHNICAL COMPETENCY  
SCORING SYSTEM**

Level I / II / III • Difficulty-Calibrated • Domain- and Role-Aware

Version 1.11 — Role-Weighted, Schema-Enforced, BI-Aware Longitudinal Tracking Layer

Revision 2 (2026-07-14) — Waypoint import-parity patch: uniform `finalScore` required in every record including fast mode; `calibration.graderModel` provenance; walkthrough quick-log classification; gap soft-open default. See §29.

Designed for prospective and retrospective evaluation of coding, debugging, technical interviews, system design, and production engineering work.

# 1. Purpose and Operating Principle

This rubric evaluates demonstrated technical competence under interview-like or job-like conditions. It is intentionally strict. Scores do not measure effort, potential, course completion, familiarity, or how close a candidate came.

**Central question: How much responsibility could reasonably be entrusted to this person without creating unacceptable delivery or production risk?**

Every assessment produces four separate judgments:

## 1.1 Mandatory Grader Output Contract

This section is controlling. Any evaluation that reports only one total score is invalid, even if it later labels Level I, Level II, or Level III as demonstrated or not demonstrated.

Every graded answer must report all of the following fields in this order:

- Problem level: Level I / Level II / Level III

- Difficulty: 1–5

- Level I answer score: 0–100 with verdict

- Level II answer score: 0–100 with verdict

- Level III answer score: 0–100 with verdict

- Answer level: highest level whose score passes its standard

- Qualifying demonstrated level: answer level capped by the problem level, difficulty evidence, and autonomy requirements

- Final score: the uniform 0–100 supporting grade (`finalScore`), computed per §21.5 and always reported explicitly

The three level scores remain controlling; the uniform final score is supporting evidence, but it is never optional. Downstream tracking (averages, pass rates, score histograms, trend charts) is computed from `finalScore`, and an importing tracker that receives a record without it will silently derive `finalScore` from whatever supporting scores are present — which evaluates to 0 when they were also omitted. A missing final score therefore corrupts every rolling statistic, not just one record.

The grader must not substitute a single task-specific total, a universal total, or a binary “demonstrated / not demonstrated” table for the three numerical level scores. Task-specific category points may be shown as supporting evidence, but they do not replace the three required scores.

Role and domain mapping affect where the evidence is recorded. They do not raise the answer score. Problem level caps qualifying evidence; it does not suppress the Level II or Level III developmental scores.

### Required output template:

Problem level: Level \_\_  
Difficulty: \_\_/5  
  
Level I answer score: \_\_/100 — Pass / Borderline / Fail  
Level II answer score: \_\_/100 — Pass / Borderline / Fail  
Level III answer score: \_\_/100 — Pass / Borderline / Fail  
  
Answer level: Level \_\_  
Qualifying demonstrated level: Level \_\_  
Final score (uniform): \_\_/100  
Primary domain: \_\_  
Primary role: \_\_  
Assistance: \_\_  
Caps/penalties: \_\_  
Main reason the next level was not reached: \_\_

Validation rule: if any of the three numerical answer scores or the uniform `finalScore` is missing, the assessment must be regenerated before it is recorded in the progress tracker.


## 1.2 Mandatory Assessment Extraction and Coverage Contract

This section is controlling. A tracker that scores entries correctly but fails to extract all assessable attempts is incomplete, even when every recorded entry satisfies the three-score model.

Every scoring pass must answer two questions in order:

1. **What assessment-like attempts exist in the available evidence?**
2. **How should each extracted attempt be scored?**

The grader must not begin final scoring until extraction coverage has been considered. The scoring system must record every distinct candidate attempt that contains assessable technical performance evidence, unless the attempt is explicitly excluded with a defensible exclusion reason.

### 1.2.1 Assessable Attempt Definition

An assessable attempt exists when the evidence contains enough candidate-produced behavior to judge at least one technical competency, such as correctness, reasoning, debugging process, implementation quality, validation, tradeoff judgment, or technical communication.

Assessable attempts include, but are not limited to:

- A coding solution or partial coding solution.
- A failed, non-compiling, or abandoned implementation attempt.
- A LeetCode, HackerRank, CodeSignal, or equivalent algorithm/problem-solving attempt.
- A debugging investigation with hypotheses, commands, edits, test output, or conclusions.
- A technical explanation answer, even when brief or incorrect.
- A system design answer, architecture sketch, or tradeoff discussion.
- A project walkthrough answer that claims ownership or explains architecture.
- A retry after feedback, coaching, hints, or answer-key exposure.
- A post-coaching restatement when it is presented as a new answer.

The grader must not discard weak attempts because they are incomplete, incorrect, assisted, embarrassing, redundant, or later superseded. Those properties affect score, assistance, confidence, and trend weight; they do not erase the attempt.

### 1.2.2 Coding Granularity Rule

For coding work, the default unit of assessment is:

> **One record per problem attempt.**

Each distinct coding problem must receive its own assessment record. Each materially distinct attempt on the same problem must also receive its own linked assessment record.

Examples:

| Evidence | Required tracker treatment |
|---|---|
| Valid Anagram initial Java attempt | One `coding` assessment. |
| Valid Anagram assisted retry | A second linked `coding` assessment with higher assistance. |
| Best Time to Buy/Sell Stock attempt | Separate `coding` assessment. |
| Two Sum brute-force attempt and later hash-map retry | Two linked records unless the first attempt is only mentioned without observable answer evidence. |
| A session containing four LeetCode problems | One optional parent session plus four child coding assessments. |
| Roadmap saying to practice eight LeetCode problems | No coding assessment unless actual answers/attempts are present. |

A tracker showing only one coding record when four assessable coding attempts exist is invalid, even if the one recorded coding assessment is scored correctly.

### 1.2.3 Retry and Attempt Preservation Rule

Retries must not overwrite earlier attempts. Coaching progression is valuable evidence only when each stage is preserved.

Use linked attempts with fields such as:

- `attemptGroupId`
- `attemptNumber`
- `attemptType`
- `parentAssessmentId`
- `priorAssessmentId`
- `assistanceLevel`
- `coachingBetweenAttempts`
- `sameDayRetry`
- `retentionRetest`

Accepted `attemptType` values appear in the Progress Tracker Record Contract.

### 1.2.4 Parent Session / Child Assessment Rule

A drill session, interview session, project day, or debugging exercise may have a parent session record, but the parent does not replace child assessments.

Use a parent session only for session-level metadata:

- date
- duration
- source conversation/file
- overall theme
- conditions
- list of child assessment IDs
- high-level observations

Use child assessment records for scoring each distinct answer, problem, bug, or technical task.

### 1.2.5 Coverage Ledger Requirement

Every migration, retrospective import, or bulk grading pass must produce a coverage ledger. The ledger must include:

- source file or conversation
- source item identifier when available
- observed assessment-like items
- migrated/scored assessment records
- excluded items
- exclusion reasons
- task-type distribution before and after migration
- suspected missing attempts
- confidence in coverage completeness

A schema-valid tracker without a coverage ledger is not considered a complete migration.

### 1.2.6 Anti-Collapse Rule

Do not collapse unrelated attempts into one record merely because they occurred in the same conversation, same day, same study session, same file, or same domain.

Aggregation is allowed only for rollups and summaries. The underlying atomic attempts must remain present and traceable.

| **Judgment**        | **What it measures**                                                                         |
|---------------------|----------------------------------------------------------------------------------------------|
| Task difficulty     | The inherent structure and challenge of the task, assigned before the attempt when possible. |
| Performance quality | How accurately, systematically, and completely the candidate handled the task.               |
| Autonomy            | How much assistance was required.                                                            |
| Demonstrated level  | The highest Level I, II, or III standard supported by the evidence.                          |

# 2. Evaluation Hierarchy

- Identify all assessable attempts in the available evidence.

- Create or update the coverage ledger.

- Split multi-problem sessions into atomic child assessments.

- Classify each task.

- Assign or retrospectively estimate difficulty.

- Tag the technical domains and role competencies.

- Assign the problem level and record the assistance conditions.

- Check mandatory gates.

- Score the answer separately against the Level I, Level II, and Level III standards.

- Score task-specific competencies.

- Apply caps and penalties.

- Calculate domain and role evidence contributions.

- Assign the answer level, qualifying demonstrated level, and confidence.

- Record the result for trend analysis.

# 3. Level Definitions

| **Level**                          | **Operating standard**                                                                                                                         | **Typical scope**                                                                                        |
|------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------|
| Level I — Scoped Contributor       | Completes bounded work using established patterns; explains fundamentals; writes basic tests; recovers with guidance.                          | Functions, small components, routine defects, clearly defined requirements.                              |
| Level II — Independent Owner       | Owns a feature, service component, investigation, or technical workflow independently; makes sound tradeoffs and handles operational concerns. | Cross-file features, service boundaries, multi-layer defects, incomplete requirements.                   |
| Level III — Senior Technical Owner | Owns ambiguous, high-impact problems; anticipates system-wide consequences; defines reusable standards and improves others' effectiveness.     | Architecture, lifecycle/state failures, reliability, migrations, cross-team or system-wide consequences. |

## 3.1 Question Level and Three-Score Answer Model

Every question receives one problem level and one 1–5 difficulty rating. Every answer then receives three separate criterion-referenced scores: a Level I score, a Level II score, and a Level III score. The prior single-score output is retired.

| **Measure**            | **Meaning**                                                                                                 |
|------------------------|-------------------------------------------------------------------------------------------------------------|
| Problem level          | The expected scope of responsibility required to answer the question well: Level I, Level II, or Level III. |
| Difficulty             | The inherent complexity of the specific problem on the existing 1–5 scale.                                  |
| Level I answer score   | How well the response meets the scoped-contributor standard.                                                |
| Level II answer score  | How well the response meets the independent-owner standard.                                                 |
| Level III answer score | How well the response meets the senior technical-owner standard.                                            |

Problem level and difficulty are related but not interchangeable. A Level II problem may be Difficulty 3 or 4; a Level III problem will usually be Difficulty 4 or 5. Difficulty describes the problem structure. Problem level describes the responsibility and judgment expected from the responder.

## 3.2 Level-Specific Scoring Lenses

| **Level score** | **Scoring lens**                                                                                                                                                             |
|-----------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Level I         | Correctness; fundamental concept or implementation; direct relevance; basic edge cases; readable explanation; basic verification.                                            |
| Level II        | Independent decomposition; mechanism-level reasoning; meaningful tradeoffs; cross-component effects; failure handling; strong tests/evidence; operational judgment.          |
| Level III       | Ambiguity resolution; system-wide consequences; risk and blast radius; alternatives and evolution path; prevention/standards; long-term maintainability; guidance of others. |

The same evidence is evaluated three times against progressively stricter standards. Higher-level scores must not exceed lower-level scores after gates, caps, and penalties are applied: Level III ≤ Level II ≤ Level I.

## 3.3 Qualifying Evidence and Demonstrated Answer Level

| **Rule**                                 | **Application**                                                                                                             |
|------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------|
| Three scores are always reported         | Every answer receives Level I, Level II, and Level III scores, even when the question was written for only one level.       |
| Problem level limits qualifying evidence | A Level I question cannot establish Level II or III readiness. Higher-level scores on that question are developmental only. |
| Answer level                             | The highest level score of at least 70 that also passes the mandatory gates and autonomy requirements.                      |
| Qualifying demonstrated level            | The lower of the answer level and the problem level, subject to the required difficulty evidence.                           |
| No averaging across levels               | The three scores are not averaged into one score. They answer different questions.                                          |

Example: Problem Level II, Difficulty 4; Level I score 93, Level II score 78, Level III score 54. The answer is a Level II pass and provides qualifying Level II evidence. A Level I problem with the same three scores would provide only qualifying Level I evidence.

# 4. Mandatory Gates

| **Gate**                | **Requirement**                                                             |
|-------------------------|-----------------------------------------------------------------------------|
| Correctness             | The central answer or implementation is substantially correct.              |
| Relevance               | The response solves the problem actually asked.                             |
| Independent explanation | The candidate can explain the work without relying on generated wording.    |
| Evidence                | Claims are supported by tests, direct reproduction, or observable behavior. |
| Safety and integrity    | No fabricated tests, results, ownership, or certainty.                      |
| Completion              | The response reaches a usable conclusion or deliverable.                    |

A failure in correctness, relevance, or integrity normally produces an overall failing result regardless of other strengths.

# 5. Task Classification

| **Primary task type**  | **Examples**                                                                  |
|------------------------|-------------------------------------------------------------------------------|
| Coding                 | LeetCode, implementation exercises, algorithms, data structures.              |
| Debugging              | Broken code, failing tests, semantic defects, production-style failures.      |
| Technical knowledge    | Java, Spring, React, TypeScript, Python, SQL, AWS, RAG, ML, SDLC.             |
| System design          | Services, APIs, data models, architecture, scaling, reliability.              |
| Production engineering | Testing, CI, Docker, logging, migrations, observability, security.            |
| Project walkthrough    | Architecture explanation, ownership, tradeoffs, limitations, failure stories. |
| Behavioral technical   | Ownership, incidents, disagreement, leadership, cross-functional delivery.    |
| Analytics case         | Ambiguous business question to metric definition to SQL/analysis to stakeholder recommendation. |


## 5.1 Task-Type Normalization and Coverage Rules

Task type is a classification field, not a convenience label. Use the task type that matches the primary evidence being graded.

### Coding

Use `coding` when the candidate attempts to write or reason through executable logic for a bounded problem, including partial code, pseudocode intended as implementation, algorithmic walkthroughs with state updates, or data-structure selection for a concrete problem.

Coding includes LeetCode-style problems, small implementation exercises, kata, data-structure drills, and project-local functions when the graded evidence is implementation behavior.

Do not reclassify a coding attempt as `knowledge` merely because the answer includes explanation, or as `debugging` merely because the code fails. A failed coding solution is still a coding assessment unless the primary task was to diagnose an existing defect.

### Debugging

Use `debugging` when the primary task is to locate, explain, and fix a defect in existing behavior, tests, contracts, or system output.

### Technical Knowledge

Use `knowledge` when the primary task is conceptual explanation rather than producing code, tracing a live failure, or designing a system.

### System Design

Use `sysdesign` when the primary task is architecture, boundaries, APIs, data contracts, tradeoffs, scaling, reliability, or multi-component ownership.

### Production Engineering

Use `prodeng` when the primary task is CI/CD, Docker, logging, observability, migrations, deployment, operational readiness, security/configuration, or reproducibility.

### Walkthrough

Use `walkthrough` when the primary task is explaining an existing project, feature, artifact, README, architecture, or ownership story.

### Behavioral Technical

Use `behavioral` when the primary task is an ownership, conflict, incident, stakeholder, or leadership story with technical substance.

### Analytics Case

Use `analyticsCase` when the primary task starts from an ambiguous business or stakeholder question and requires the candidate to scope a metric, choose a denominator/grain/baseline, write or reason through the SQL or analysis, and produce a stakeholder-facing interpretation or recommendation. This is the dominant interview shape for BI Engineer, Business Intelligence Analyst, and many DS/DE case-study rounds.

Do not reclassify an analytics case as `sysdesign` merely because it involves a data model, or as `knowledge` merely because part of the answer is conceptual. The distinguishing feature is the business-question-to-recommendation arc, not the presence of SQL or statistics alone — a bounded SQL query with a specification already given is still `coding` or `knowledge`, not `analyticsCase`.

### Ambiguous Cases

When a task spans multiple types, choose the primary task type and record secondary evidence in domains, roles, focus areas, tags, and notes. Do not duplicate the same attempt across task types unless there are genuinely separable sub-attempts.

# 6. Formal Difficulty System

Difficulty measures the task, not the candidate's struggle. It should be assigned before the attempt whenever possible. For retrospective work, it must be marked as retrospectively estimated.

| **Difficulty**                        | **Definition**                                                                                      | **Typical evidence level**       |
|---------------------------------------|-----------------------------------------------------------------------------------------------------|----------------------------------|
| 1 — Direct                            | Single-step, local, obvious failure or expected behavior; accurate failing test; minimal ambiguity. | Early Level I                    |
| 2 — Local reasoning                   | Bounded component; straightforward reproduction; logic understanding required; local fix.           | Level I                          |
| 3 — Bounded semantic/policy           | Code may run; output violates intended meaning or policy; weak semantic tests; bounded root cause.  | Strong Level I / normal Level II |
| 4 — Multi-layer contract/evaluation   | Crosses layers or data grains; producer/consumer assumptions disagree; tests may share the mistake. | Level II                         |
| 5 — Hidden state/provenance/lifecycle | Plausible success; sequence, cache, fallback, retry, stale state, or provenance hides the defect.   | Strong Level II / Level III      |

## 6.1 Difficulty Attribute Matrix

| **Dimension**       | **0**                 | **1**                   | **2**                         |
|---------------------|-----------------------|-------------------------|-------------------------------|
| Scope               | One function          | Multiple files          | Multiple layers/services      |
| Observability       | Immediate failure     | Clearly wrong output    | Plausible successful output   |
| Reproduction        | Direct                | Special input           | Sequence/state dependent      |
| Test quality        | Accurate failing test | Missing/incomplete test | Misleading green test         |
| Root-cause distance | Same line/function    | Different component     | Far from symptom              |
| Contract complexity | Local behavior        | One interface           | Multiple contracts/invariants |
| Fix coordination    | Local edit            | Code plus tests         | Multi-layer/state-safe change |
| False-lead density  | Low                   | Moderate                | Several plausible causes      |

| **Attribute total** | **Difficulty** |
|---------------------|----------------|
| 0–2                 | 1              |
| 3–5                 | 2              |
| 6–8                 | 3              |
| 9–12                | 4              |
| 13–16               | 5              |

## 6.2 Difficulty Calibration Rules

- Do not raise difficulty because the candidate struggled.

- Do not lower difficulty because the candidate solved it quickly.

- Task category alone does not determine difficulty.

- A cache bug is not automatically Difficulty 5; an aggregation bug is not automatically Difficulty 4.

- Freeze the attribute breakdown before candidate access for prospective exercises.

- Difficulty affects what the score proves; it does not provide bonus points or excuse weak work.

# 7. Universal Competency Score

| **Competency**                     | **Weight** |
|------------------------------------|------------|
| Correctness and factual accuracy   | 25         |
| Reasoning and decomposition        | 20         |
| Technical judgment and tradeoffs   | 15         |
| Validation and evidence            | 15         |
| Communication and explanation      | 15         |
| Completeness and execution quality | 10         |

> For each level separately: Level Score = Universal Evidence × 0.60 + Task-Specific Evidence × 0.40, interpreted against that level’s scoring anchors. Report Level I, Level II, and Level III scores; do not average them.

# 8. Task-Specific Rubrics

## 8.1 Coding

| **Category**                    | **Weight** |
|---------------------------------|------------|
| Functional correctness          | 35         |
| Algorithm/data-structure choice | 20         |
| Complexity analysis             | 15         |
| Edge cases                      | 15         |
| Code quality                    | 10         |
| Verification                    | 5          |

## 8.2 Debugging

| **Category**                        | **Weight** |
|-------------------------------------|------------|
| Reproduction and problem definition | 10         |
| Dependency-chain inspection         | 15         |
| Hypothesis quality                  | 15         |
| Evidence and falsification          | 20         |
| Root-cause accuracy                 | 20         |
| Contract-level fix                  | 15         |
| Regression prevention               | 5          |

## 8.3 Technical Knowledge

| **Category**                   | **Weight** |
|--------------------------------|------------|
| Conceptual accuracy            | 30         |
| Mechanism-level explanation    | 25         |
| Application to a real scenario | 20         |
| Tradeoffs and limitations      | 15         |
| Clarity and precision          | 10         |

## 8.4 System Design

| **Category**                     | **Weight** |
|----------------------------------|------------|
| Requirements and assumptions     | 15         |
| Architecture and boundaries      | 20         |
| Data model and contracts         | 15         |
| Scalability and performance      | 15         |
| Reliability and failure handling | 15         |
| Security and operations          | 10         |
| Tradeoffs and evolution path     | 10         |

## 8.5 Production Engineering

| **Category**                      | **Weight** |
|-----------------------------------|------------|
| Architecture and boundaries       | 15         |
| Testing strategy                  | 15         |
| Error handling and resilience     | 15         |
| Observability and diagnostics     | 15         |
| Deployment and reproducibility    | 10         |
| Data and migration safety         | 10         |
| Security and configuration        | 10         |
| Documentation and maintainability | 10         |

## 8.6 Project Walkthrough

| **Category**                          | **Weight** |
|---------------------------------------|------------|
| Problem and user value                | 15         |
| Architecture explanation              | 20         |
| Personal ownership                    | 20         |
| Design decisions and alternatives     | 15         |
| Failure and learning examples         | 15         |
| Production limitations and next steps | 15         |

## 8.7 Behavioral Technical

| Category | Weight |
|---|---:|
| Situation, stakes, and technical context | 10 |
| Personal ownership and scope | 20 |
| Actions, decisions, and technical judgment | 20 |
| Technical mechanism and problem-solving depth | 15 |
| Collaboration, disagreement, and stakeholder work | 15 |
| Results, evidence, and measurable impact | 10 |
| Reflection, learning, and recurrence prevention | 10 |

Behavioral Technical is not scored as presentation polish or generic likability. It measures whether the candidate can establish what happened, separate personal ownership from team activity, explain the technical and interpersonal decisions they made, support the result with evidence, and show what they learned or changed afterward.

# 9. Domain and Role Evidence Model

Each assessment must be tagged on two separate axes: technical domain and role competency. Technology knowledge and job-family readiness overlap, but they are not interchangeable.

## 9.1 Technical Domain Taxonomy

| **Group**                    | **Domains**                                                                                                        |
|------------------------------|--------------------------------------------------------------------------------------------------------------------|
| Languages                    | Java; Python; TypeScript; SQL                                                                                      |
| Frameworks/platforms         | Spring Boot; React; AWS; Docker/CI/CD; Databases                                                                   |
| Core engineering specialties | Algorithms/DSA; Backend/API engineering; Frontend engineering; Distributed systems; Observability/reliability      |
| Data and AI specialties      | Data modeling; Data engineering; Data analysis; Statistical analysis; Machine learning; Retrieval/RAG; Evaluation/experimentation |

## 9.2 Domain Subcompetencies

| **Domain**       | **Tracked subcompetencies**                                                                                                                                               |
|------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Java             | Syntax/control flow; OOP; interfaces; collections/generics; exceptions; streams/lambdas; concurrency; testing; JVM concepts; DSA fluency                                  |
| Spring Boot      | Controllers/HTTP; DTOs/validation; services; dependency injection; error translation; configuration; integration testing; persistence/migrations; security; observability |
| TypeScript       | Type fundamentals; narrowing; generics; unions; nullability; async/error typing; API contracts; strict-mode fluency                                                       |
| React            | Components; props/state; forms; async server state; rendering; hooks; loading/error states; accessibility; testing; performance                                           |
| Python           | Core language; data structures; typing; exceptions; modules/packages; testing; data processing; APIs; concurrency; performance; reliability                               |
| ML               | Problem formulation; feature/target design; baselines; validation; leakage; metrics; error analysis; reproducibility; monitoring; deployment implications                 |
| RAG/MLE          | Ingestion; chunking; retrieval; embeddings; ranking/hybrid; evaluation; structured output; refusal/grounding; human review; serving; cost/latency; monitoring             |
| Data Engineering | Data modeling/grain; pipelines; data quality; SQL; reliability/idempotency; orchestration; scale/performance; lineage/provenance                                          |

## 9.3 Role Competency Taxonomy

| **Role** | **Primary competency weights**                                                                                                                                                             |
|----------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| SWE      | Implementation/code quality 20; Debugging 20; System/API design 15; Testing 15; Reliability/operations 15; Data/persistence 5; Communication/ownership 10                                  |
| MLE      | Software engineering 20; ML implementation 15; Data/feature pipelines 15; Evaluation 15; Serving 10; Reliability/monitoring 10; Reproducibility 10; Communication 5                        |
| DS       | Problem formulation 15; Statistical reasoning 20; Data preparation/EDA 15; Modeling 15; Validation/error analysis 15; Experimentation/metrics 10; Communication/business interpretation 10 |
| DE       | Data modeling/grain 15; Pipeline implementation 20; Data quality 15; SQL/query reasoning 15; Reliability/idempotency 15; Orchestration/operations 10; Scale/performance 5; Communication 5 |
| BIE      | SQL/query reasoning 25; Dashboard/semantic layer modeling 20; Data modeling/grain 15; Data quality 10; Pipeline/ETL literacy 10; Stakeholder communication/requirements translation 15; Business context/metric definition 5 |
| BIA      | SQL/query reasoning 25; Business context/metric definition 20; Stakeholder communication/requirements translation 20; Dashboard/semantic layer modeling 15; Statistical reasoning (descriptive) 10; Data quality 10 |

Weights are initial calibrations for a secondary/tertiary target role and should be revised under §23 Version Control once real BIE/BIA interview evidence accumulates.

## 9.4 Contribution Weights

Each assessment has one primary domain and up to two secondary domains, plus one primary role and up to two secondary roles.

| **Evidence mapping**              | **Default contribution** |
|-----------------------------------|--------------------------|
| Primary technical domain          | 60%                      |
| First secondary technical domain  | 25%                      |
| Second secondary technical domain | 15%                      |
| Primary role                      | 70%                      |
| Secondary role                    | 20%                      |
| Tertiary role                     | 10%                      |

Contribution weights determine how much an assessment influences rolling domain and role scores. They do not change the underlying performance score.

# 10. Retrospective Scoring Protocol

Retroactive scoring is useful for reconstructing a baseline, but older evidence is not automatically equivalent to a controlled prospective assessment.

| **Evidence class**              | **Definition**                                                                                     | **Trend weight** |
|---------------------------------|----------------------------------------------------------------------------------------------------|------------------|
| Prospective controlled          | Difficulty precommitted; prompt, answer, assistance, tests, and expected behavior captured.        | 1.00             |
| Class A — Strong retrospective  | Complete prompt/answer/code, observable outputs, reconstructable assistance and expected behavior. | 0.75             |
| Class B — Partial retrospective | Answer exists, but testing, autonomy, or difficulty evidence is incomplete.                        | 0.40             |
| Class C — Anecdotal             | Only summary claims or project bullets remain; not numerically scorable.                           | 0.00             |

## 10.1 Retrospective Rules

- Mark difficulty as retrospectively estimated.

- Record autonomy as verified, partially verified, or unverified.

- Do not infer favorable missing evidence.

- Do not score project summaries as if they were observed performances.

- Use retrospective results to establish a baseline, not to claim perfect historical comparability.

- Prospective assessments become the primary evidence as the dataset grows.


## 10.2 Retrospective Extraction and Coverage Audit

Retrospective scoring must separate **evidence extraction** from **performance scoring**.

### Required audit fields

Every retrospective migration must produce a `coverageAudit` object or file containing:

```json
{
  "source": "technical_competency_thread_grade_v1_7.json",
  "sourceType": "json",
  "auditDate": "2026-06-22",
  "rubricVersion": "1.10",
  "labelSetVersion": "1.9.1-labels.2026-06-24",
  "observedAssessmentLikeItems": 18,
  "migratedAssessmentRecords": 18,
  "excludedItems": 0,
  "exclusions": [],
  "taskTypeDistributionObserved": {
    "coding": 4,
    "debugging": 2,
    "knowledge": 9,
    "sysdesign": 3
  },
  "taskTypeDistributionMigrated": {
    "coding": 4,
    "debugging": 2,
    "knowledge": 9,
    "sysdesign": 3
  },
  "suspectedMissingAttempts": [],
  "coverageCompleteness": "High",
  "notes": "All visible assessment-like entries were migrated."
}
```

### Coverage confidence values

Accepted `coverageCompleteness` values: `High`, `Medium`, `Low`, `Unknown`.

- `High`: complete source content was inspected and all assessment-like items were accounted for.
- `Medium`: source content was mostly available, but some transcript, code, timing, or assistance evidence may be incomplete.
- `Low`: only partial summaries or fragments were available.
- `Unknown`: source boundaries are unclear.

### Exclusion reasons

Accepted `exclusionReason` values:

- `assistant-generated answer only`
- `answer key or reference solution`
- `planned task only`
- `duplicate export of same assessment record`
- `insufficient candidate evidence`
- `nontechnical administrative item`
- `same attempt already linked and scored`
- `not assessable under this rubric`

Exclusions must be conservative. If a candidate attempt exists but is weak or partial, score it instead of excluding it.

### Missing-attempt handling

When the user, evaluator, or source evidence indicates that an attempt is missing, the tracker must mark the migration as incomplete until the item is either recovered, scored from available evidence, or explicitly entered into `suspectedMissingAttempts` with the reason it cannot yet be scored.

# 11. Multi-Bug Debugging Assessments

Recommended seeded exercise mix:

> 1 × Difficulty 3  
> 2 × Difficulty 4  
> 1 × Difficulty 5

Every seeded bug must have a private answer-key record completed before delivery:

- Exact root cause

- Affected production file(s)

- Misleading or insufficient test

- Expected observable behavior

- Exact fixed implementation

- Regression tests proving the fixed behavior

- Difficulty attribute score and rationale

- Known misleading leads and unrelated technical debt

## 11.1 Per-Bug Completion Standard

| **Evidence achieved**                                         | **Maximum credit** |
|---------------------------------------------------------------|--------------------|
| Symptom only                                                  | 20%                |
| Affected area only                                            | 40%                |
| Exact root cause, incomplete fix                              | 70%                |
| Correct fix without explanation                               | 75%                |
| Root cause, invariant, source-level fix, and regression proof | Eligible for 100%  |

## 11.2 Weighted Exercise Score

| **Difficulty** | **Multiplier** |
|----------------|----------------|
| 1              | 0.75           |
| 2              | 0.90           |
| 3              | 1.00           |
| 4              | 1.25           |
| 5              | 1.50           |

> Exercise Score = Σ(Bug Score × Difficulty Multiplier) ÷ Σ(Difficulty Multipliers)

# 12. Assistance and Autonomy

| **Level** | **Assistance**                           |
|-----------|------------------------------------------|
| 0         | None                                     |
| 1         | Task clarification only                  |
| 2         | General directional hint                 |
| 3         | Relevant subsystem identified            |
| 4         | Affected file or contract identified     |
| 5         | Root cause or fix substantially revealed |

- Assistance 0–1 supports full autonomy evidence.

- Assistance 2 reduces autonomy confidence.

- Assistance 3 cannot establish clean Level II independence for that task.

- Assistance 4–5 cannot establish independent competency.

# 13. Caps and Penalties

| **Condition**                                       | **Maximum score**               |
|-----------------------------------------------------|---------------------------------|
| Correct result with materially wrong reasoning      | 65                              |
| Correct code with no meaningful explanation         | 70                              |
| Cannot reproduce or explain submitted code          | 60                              |
| Claims testing without evidence                     | 55                              |
| Debugging fix without reproduction                  | 70                              |
| Debugging conclusion unsupported by evidence        | 60                              |
| Symptom fix preserving root cause                   | 65                              |
| Changes tests to accept wrong behavior              | 50                              |
| System design omits failure handling                | 70 at Level II; 60 at Level III |
| Production work has no test strategy                | 65                              |
| Confident materially false claim                    | 50                              |
| Fabricated results, tests, ownership, or experience | 0–40                            |

| **Typical deficiency**                          | **Penalty** |
|-------------------------------------------------|-------------|
| Minor factual error                             | −2 to −5    |
| Material factual error                          | −6 to −15   |
| Missed important edge case                      | −3 to −8    |
| Vague tradeoff language                         | −2 to −6    |
| Excessive prompting required                    | −3 to −15   |
| Continues disproved debugging theory            | −5 to −10   |
| Edits before reproducing                        | −3 to −8    |
| Broad speculative refactor                      | −5 to −15   |
| Counts unrelated technical debt as a seeded bug | −5          |
| Breaks unrelated behavior                       | −10 to −25  |

# 14. Demonstrated-Level Rules

The answer level is the highest of the three level scores that meets all requirements. The qualifying demonstrated level is capped by the problem level and required difficulty evidence.

| **Level** | **Minimum qualifying pattern**                                                                                                        |
|-----------|---------------------------------------------------------------------------------------------------------------------------------------|
| Level I   | Passing D1–D3 work; bounded implementation/debugging; basic explanation and verification; some guidance acceptable.                   |
| Level II  | Passing D3–D4 work; independent multi-file or multi-layer reasoning; contract understanding; meaningful tests; assistance ≤2.         |
| Level III | Strong D4–D5 work; ambiguous system-level reasoning; lifecycle/provenance/reliability judgment; blast-radius analysis; assistance ≤1. |

- The matching level score must be at least 70.

- Correctness gate must pass.

- No critical competency may be below 60.

- Required difficulty evidence must exist.

- Required autonomy level must be met.

- Applicable caps must not reduce the score below 70.

# 15. Score Interpretation

| **Score** | **Verdict**                                   |
|-----------|-----------------------------------------------|
| 90–100    | Exceptional at the evaluated level            |
| 80–89     | Strong pass                                   |
| 70–79     | Pass                                          |
| 60–69     | Borderline; likely fails under deeper probing |
| 50–59     | Fail                                          |
| Below 50  | Clear fail                                    |

# 16. Progress Tracking

Track progress at three layers rather than collapsing everything into one score.

| **Layer**            | **Examples**                                                                               |
|----------------------|--------------------------------------------------------------------------------------------|
| Domain scores        | Java, Spring, TypeScript, React, Python, SQL, ML, RAG, Data Engineering, System Design     |
| Role scores          | SWE I/II/III, MLE I/II/III, DS I/II/III, DE I/II/III, BIE I/II, BIA I/II                   |
| Cross-cutting scores | Coding, Debugging, Testing, System Design, Production Engineering, Communication, Autonomy |

## 16.1 Trend Rules

- Use rolling averages and medians of comparable attempts.

- Compare within the same task type and difficulty band.

- Track pass rate, assistance rate, and recurring failure categories.

- Do not combine unrelated tasks into one meaningless average.

- Use evidence-class weighting for retrospective data.

- Prefer recent prospective evidence over older retrospective evidence.


## 16.2 Atomic Attempt Tracking and Rollups

Progress tracking must preserve atomic attempts and build rollups from them. It must not replace atomic evidence with summaries.

### Required record relationships

Use these identifiers when applicable:

| Field | Purpose |
|---|---|
| `assessmentId` | Stable unique identifier for one scored atomic attempt. |
| `sessionId` | Groups attempts that occurred in the same drill, interview, debugging exercise, or migration source. |
| `parentAssessmentId` | Links a child problem/bug/answer to a parent session record. |
| `attemptGroupId` | Links multiple attempts at the same problem or concept. |
| `attemptNumber` | Ordered number within the attempt group. |
| `priorAssessmentId` | Direct previous attempt being retried or revised. |
| `sourceFile` | File or transcript from which the evidence came. |
| `sourceItemId` | Original ID, pointer, line, prompt number, or source-local identifier. |

### Rollup rules

- Rollups may summarize by day, task type, domain, role, difficulty, concept, or target role.
- Rollups must list the child assessment IDs they summarize.
- Rollups must not be counted as additional performance evidence unless they contain a new assessable answer.
- A parent session can have no score, or can have a clearly labeled session-level score, but it must not erase or replace child scores.

### Task-type distribution checks

Every tracker export should be able to produce:

- count by `taskType`
- count by `taskType` and difficulty
- count by `taskType` and assistance level
- count by `taskType` and evidence class
- count by `taskType` and date range
- coding count by problem name and attempt type

A surprising distribution, such as coding appearing only once when multiple coding attempts are known, must be treated as a coverage defect until resolved.

# 17. Diagnostic Progress Model

Version 1.10 adds diagnostic tracking for progress accuracy, knowledge gaps, retention, LLM independence, role-readiness coverage, artifact readiness, prioritization, retesting, calibration, proof strength, role-readiness rollups, anti-inflation controls, calibration anchors, score uncertainty, recurrence, transferability, evidence floors, recovery behavior, score-lift actions, and tracker health. These fields do not replace the three-score model. They explain what the scores mean over time.

The diagnostic layer answers what exact concept is missing, whether the weakness is conceptual or practical, whether the answer would survive interview probing, whether the result was independent, whether the skill is retained, which target-role requirements are supported, and which artifacts are interview-defensible.

## 17.1 Knowledge Gap Taxonomy

Use `knowledgeGapTags` to identify the specific missing concepts, mechanisms, frameworks, or domain ideas. These are narrower than `weaknessTags`.

```json
{
  "weaknessTags": ["Mechanism gap", "Thin tradeoff analysis"],
  "knowledgeGapTags": [
    "Docker image vs container",
    "Host kernel sharing",
    "Docker Compose vs production orchestration",
    "CI artifact promotion"
  ]
}
```

Rules: `weaknessTags` describe the symptom; `knowledgeGapTags` describe the missing knowledge. Use the narrowest accurate reusable label. Do not invent a knowledge gap when the evidence only shows unclear communication.

## 17.2 Gap Type Classification

Use `gapTypes` to classify why the answer missed the bar.

| Gap type | Meaning | Typical fix |
|---|---|---|
| `Conceptual gap` | Candidate does not know the concept. | Study and rebuild from fundamentals. |
| `Mechanism gap` | Candidate knows the label but not how it works. | Explain internals, lifecycle, invariants, or data flow. |
| `Application gap` | Candidate cannot map the concept to a real project or scenario. | Apply it to the repo, architecture, stakeholder workflow, or artifact. |
| `Tradeoff gap` | Candidate cannot explain alternatives, limitations, or why-not cases. | Compare options and identify constraints. |
| `Recall gap` | Candidate likely knows the material but could not retrieve it under assessment conditions. | Spaced repetition and verbal reps. |
| `Verification gap` | Candidate makes claims without tests, reproduction, metrics, or observable evidence. | Add proof, tests, measurements, or citations. |
| `Autonomy gap` | Candidate needed too much assistance. | Rebuild unaided and retest. |
| `Communication gap` | Candidate understood more than they communicated. | Practice concise mechanism-level explanation. |
| `Scope gap` | Candidate solved the local issue but missed system impact or blast radius. | Add dependency-chain and failure-mode analysis. |
| `Evidence quality gap` | Available record is too incomplete to score confidently. | Re-run as prospective controlled assessment. |
| `Requirements translation gap` | Candidate understands the material but cannot turn an ambiguous business/stakeholder ask into a scoped question (metric, population, timeframe, baseline). | Practice question decomposition drills: force explicit metric, denominator, timeframe, and baseline before solving. |

## 17.3 Expected Answer Element Tracking

Use expected-element tracking for technical knowledge, system design, project walkthroughs, behavioral technical answers, debugging, and interview Q&A.

```json
{
  "expectedElements": [
    "Defines container image",
    "Explains dependency packaging",
    "Explains runtime isolation",
    "Mentions host kernel sharing",
    "Distinguishes Docker Compose from cloud deployment",
    "States limitation"
  ],
  "presentElements": [
    "Explains dependency packaging",
    "Explains runtime isolation"
  ],
  "missingElements": [
    "Defines container image",
    "Mentions host kernel sharing",
    "Distinguishes Docker Compose from cloud deployment",
    "States limitation"
  ],
  "elementSource": "Rubric-derived"
}
```

Rules: expected elements should be defined before grading when possible, directly explain deductions, and remain level-aware. A Level I question should not require Level III architecture content to pass Level I. Accepted `elementSource` values: `Predefined`, `Rubric-derived`, `Retrospective evaluator-derived`, `Role-requirement-derived`.

Worked template for `analyticsCase` tasks:

```json
{
  "expectedElements": [
    "States a precise metric definition",
    "Defines the denominator/population and grain",
    "Names a baseline or comparison point",
    "Identifies at least one confounder or bias risk",
    "Produces correct or well-reasoned SQL/analysis logic",
    "Gives a stakeholder-usable recommendation",
    "States a limitation or caveat"
  ],
  "elementSource": "Role-requirement-derived"
}
```

An `analyticsCase` answer that gets the SQL right but skips metric/denominator scoping and stakeholder framing should not score as a full pass — the scoping and communication elements are the point of the task type, not decoration around the query.

## 17.4 Probe Readiness

Use `probeReadiness` to predict how the answer would hold up under realistic interview follow-up.

```json
{
  "probeReadiness": {
    "firstAnswer": "Pass",
    "oneFollowUp": "Uncertain",
    "deepFollowUp": "Fail",
    "likelyFailurePoint": "Cannot distinguish Docker image from container runtime"
  }
}
```

Accepted values for `firstAnswer`, `oneFollowUp`, and `deepFollowUp`: `Pass`, `Uncertain`, `Fail`.

## 17.5 Evidence Source

Use `evidenceSource` to identify how assessment evidence was produced. Accepted values: `verbal answer`, `written answer`, `live coding`, `take-home coding`, `repo code`, `test results`, `debugging transcript`, `project walkthrough`, `mock interview`, `real interview feedback`, `commit history`, `README or design doc`, `production artifact`, `metric or dashboard`, `human evaluator feedback`.

Evidence source affects confidence. Live coding, debugging transcripts, repo evidence, human mock interviews, and real interview feedback usually carry stronger readiness evidence than polished written answers.

## 17.6 Retention and Repetition Tracking

Use `retention` to measure whether knowledge persists after the first correction.

```json
{
  "retention": {
    "firstAttemptDate": "2026-06-19",
    "lastAttemptDate": "2026-06-26",
    "retestDate": "2026-07-03",
    "daysSinceLastAttempt": 7,
    "attemptNumber": 3,
    "priorScore": 64,
    "currentScore": 78,
    "retestScoreDelta": 14,
    "reproducedWithoutNotes": true,
    "reproducedUnderTimeLimit": true
  }
}
```

Rules: a corrected answer is not the same as retained knowledge; a retained answer reproduced without notes is stronger evidence than a same-day correction; compare score deltas only between comparable attempts.

## 17.7 LLM Independence Tracking

Use `llmIndependence` to track whether the evidence proves independent skill.

```json
{
  "llmIndependence": {
    "llmUsed": true,
    "llmUseType": ["concept explanation", "error interpretation"],
    "implementationGeneratedByLLM": false,
    "testsGeneratedByLLM": false,
    "answerDraftedByLLM": false,
    "reproducedWithoutLLM": true,
    "explainedWithoutLLM": true,
    "fivePassStatus": {
      "buildPass": true,
      "rewritePass": false,
      "testPass": false,
      "explainPass": true,
      "documentPass": false
    }
  }
}
```

Accepted `llmUseType` values: `none`, `concept explanation`, `error interpretation`, `approach exploration`, `logic review`, `code generation`, `test generation`, `answer drafting`, `README or documentation drafting`, `refactoring suggestion`, `debugging suggestion`.

Rules: LLM use does not automatically invalidate an assessment; LLM-generated implementation, tests, or answer text lowers autonomy evidence; `reproducedWithoutLLM` and `explainedWithoutLLM` are stronger than merely claiming understanding.

## 17.8 Role Requirement Coverage

Use `roleRequirementCoverage` to map evidence against a specific target role or archetype.

```json
{
  "roleRequirementCoverage": {
    "targetRole": "Chewy SWE II — HR Systems",
    "requirementsHit": ["Python", "APIs", "AI/LLM platforms", "OpenAPI", "production debugging"],
    "requirementsMissing": ["Terraform", "Jenkins", "performance tuning", "enterprise HR systems"],
    "requirementsPartial": ["Java", "React", "AWS"],
    "coverageScore": 0.62
  }
}
```

Rules: role coverage measures match to a target role, not answer quality. Role coverage must not increase the answer score. `requirementsHit` requires evidence, not aspiration. `requirementsPartial` means there is some evidence but not enough for confident interview defense.

Recommended target roles and archetypes: `Chewy SWE II — HR Systems`, `SWE II — Backend`, `SWE II — Vet Care`, `SWE II — Sponsored Ads`, `SWE II — Observability`, `SWE I — Frontend Payments`, `SWE I — Chewy Plus`, `MLE II — Legal`, `DS II — Customer Care`, `DS II — Outbound`, `BI Engineer I / II`, `Business Intelligence Analyst`, `DE / Analytics Engineering Bridge`, `Platform / DevOps`.

## 17.9 Artifact Readiness

Use `artifactReadiness` to track whether a project, feature, README, demo, or portfolio item is ready to support an interview claim.

```json
{
  "artifactReadiness": {
    "artifact": "Compounding Quality Workbench",
    "artifactType": "portfolio project",
    "readinessStage": "demo-ready",
    "proofItems": ["tests pass", "Docker Compose runs", "README explains architecture", "runbook exists"],
    "missingProofItems": ["deployed cloud environment", "auth", "production monitoring"],
    "portfolioReady": false
  }
}
```

Accepted `artifactType` values: `portfolio project`, `repo feature`, `README`, `design doc`, `demo script`, `runbook`, `dashboard`, `ETL pipeline`, `RAG workflow`, `Spring Boot service`, `React UI`, `modeling notebook`, `data pipeline`, `behavioral story`.

Accepted `readinessStage` values: `idea`, `in-progress`, `works locally`, `tested`, `documented`, `demo-ready`, `portfolio-ready`, `interview-defensible`, `production-shaped`, `production-deployed`.

Rules: `production-shaped` does not mean production-deployed. A project is not `interview-defensible` unless the candidate can explain relevant code and decisions without assistance. A project is not `portfolio-ready` unless the README or design doc explains architecture, tradeoffs, tests, limitations, and evidence.

## 17.10 Staleness and Refresh Tracking

Use `staleness` to prevent old scores from overstating current readiness.

```json
{
  "staleness": {
    "lastPracticed": "2026-06-19",
    "daysSincePractice": 21,
    "stalenessRisk": "Medium",
    "refreshNeeded": true
  }
}
```

Accepted `stalenessRisk` values: `Low`, `Medium`, `High`, `Unknown`.

| Days since practice | Default risk |
|---:|---|
| 0–14 | Low |
| 15–45 | Medium |
| 46+ | High |

Override the default when there is strong evidence that the skill is used daily or has recently been retested.

## 17.11 Gap Closure Status

Use `gapClosureStatus` to track whether an identified weakness has been resolved.

```json
{
  "gapClosureStatus": {
    "status": "open",
    "openedDate": "2026-06-19",
    "closedDate": null,
    "closureEvidence": "",
    "retestRequired": true
  }
}
```

Accepted `status` values: `open`, `in progress`, `closed`, `reopened`, `not applicable`.

Rules: do not mark a gap closed because it was explained once immediately after feedback. Close a gap only when the candidate demonstrates it on a later attempt or in a different but comparable context. Reopen a gap if it recurs after being marked closed.

Soft-open default (rev 2): any record carrying one or more `gapTypes` or `knowledgeGapTags` without an explicit `gapClosureStatus` is treated by the importing tracker as `{"status": "open", "openedDate": <record date>, "retestRequired": true}`. Emit `gapClosureStatus` explicitly when a different status is intended (for example, a re-demonstration that closes the gap); otherwise the default applies automatically.


## 17.12 Priority and Next Action

Use `priority` to convert scoring output into a ranked next step. This prevents the tracker from producing many gaps without indicating which one matters most.

```json
{
  "priority": {
    "severity": "High",
    "urgency": "Medium",
    "roleImpact": "High",
    "nextActionType": "retest",
    "recommendedAction": "Retest Docker/CI answer verbally in 7 days with one follow-up question."
  }
}
```

Accepted `severity` values: `Low`, `Medium`, `High`, `Critical`.

Accepted `urgency` and `roleImpact` values: `Low`, `Medium`, `High`.

Accepted `nextActionType` values: `study`, `rebuild`, `retest`, `mock interview`, `project work`, `documentation`, `ignore for now`.

Rules:

- `severity` measures how large the gap is.
- `urgency` measures how soon it must be addressed.
- `roleImpact` measures how much the gap affects the active target role.
- `recommendedAction` should be concrete enough to execute without reinterpretation.
- High-severity gaps with low role impact should not automatically outrank medium-severity gaps that block the active role.

## 17.13 Gap Impact and Blocking Status

Use `gapImpact` to distinguish blocking gaps from non-blocking weaknesses.

```json
{
  "gapImpact": {
    "isBlocking": true,
    "blocksRoles": ["Chewy SWE II — HR Systems"],
    "blocksLevel": "L2",
    "reason": "Cannot yet explain Docker/CI operational boundary under follow-up probing."
  }
}
```

Accepted `blocksLevel` values: `L1`, `L2`, `L3`, `None`.

Rules:

- A blocking gap prevents a credible claim for a role, level, project, or interview area.
- Non-blocking gaps may still be tracked, but they should not dominate the next-action queue.
- `blocksRoles` should use the same role/archetype names as `roleRequirementCoverage.targetRole` when possible.
- Use `isBlocking: true` only when the gap would likely cause interview failure, project overclaiming, or inability to perform the job responsibility.

## 17.14 Assessment Mode

Use `assessmentMode` to record the conditions under which the evidence was produced.

```json
{
  "assessmentMode": {
    "mode": "verbal",
    "timeLimitMinutes": 2,
    "notesAllowed": false,
    "followUpsAsked": 1,
    "pressureLevel": "Medium"
  }
}
```

Accepted `mode` values: `written`, `verbal`, `live coding`, `debugging session`, `project walkthrough`, `mock interview`, `real interview`.

Accepted `pressureLevel` values: `Low`, `Medium`, `High`.

Rules:

- Written, untimed answers are weaker readiness evidence than verbal or live-screen evidence.
- Notes allowed should reduce interview-readiness confidence unless the target scenario allows notes.
- Follow-up count matters because many weak answers pass initially and fail under probing.
- Pressure level should describe the assessment setting, not the candidate's emotional state.

## 17.15 Calibration Source

Use `calibration` to identify who or what produced the score and how much trust to place in it.

```json
{
  "calibration": {
    "evaluatorType": "AI grader",
    "graderModel": "claude-sonnet-5",
    "humanReviewed": false,
    "realInterviewSignal": false,
    "calibrationConfidence": "Medium"
  }
}
```

Accepted `evaluatorType` values: `self`, `AI grader`, `peer`, `senior engineer`, `recruiter`, `hiring manager`, `real interviewer`.

Accepted `calibrationConfidence` values: `Low`, `Medium`, `High`.

`graderModel` (rev 2): the exact model identifier that produced the grade (for example `claude-sonnet-5`), stamped on every record where `evaluatorType` is `AI grader`. Manually graded records omit it. The tracker's grader-provenance filter slices history, gaps, retest, and performance boards by this field to detect a lenient or drifting grader; an AI-graded record without it cannot be audited by model.

Rules:

- AI grading is useful for consistency but should not be treated as equivalent to human interview signal.
- Every AI-graded record must carry both `evaluatorType: "AI grader"` and the exact `graderModel` id. Do not use marketing names or aliases; use the model id string the grading system reports.
- Human mock interviews, senior-engineer review, and real interview feedback should receive higher calibration weight.
- `realInterviewSignal: true` should be reserved for actual recruiter, hiring-manager, interviewer, or interview-loop feedback.
- Low calibration confidence should reduce trend weight even when the score is high.

## 17.16 Retest Plan

Use `retestPlan` to make gap closure testable.

```json
{
  "retestPlan": {
    "retestDate": "2026-06-26",
    "retestPrompt": "Explain what Docker Compose proves and what it does not prove.",
    "successCriteria": [
      "Defines image vs container",
      "Mentions shared host kernel",
      "Explains reproducible local orchestration",
      "Distinguishes local Compose from cloud deployment",
      "Names one limitation"
    ]
  }
}
```

Rules:

- Every nontrivial open gap should have a retest plan unless it is explicitly marked `ignore for now`.
- The retest prompt should be comparable to the original task.
- Success criteria should be observable and level-aware.
- A retest should normally occur after enough delay to test retention, not immediately after feedback.
- Passing a retest can support closing `gapClosureStatus`.

## 17.17 Role-Readiness Rollup

Use `roleReadinessRollup` to summarize current readiness for one target role or archetype.

```json
{
  "roleReadinessRollup": {
    "targetRole": "Chewy SWE II — HR Systems",
    "readiness": "Emerging",
    "blockingGaps": 3,
    "strongEvidenceAreas": ["Python", "data workflows", "AI workflow validation"],
    "weakEvidenceAreas": ["Java/Spring production ownership", "Terraform", "performance tuning"],
    "recommendedNextMilestone": "Spring Boot API shell with validation, OpenAPI, tests, and error handling"
  }
}
```

Accepted `readiness` values: `Not ready`, `Emerging`, `Interviewable with risk`, `Interviewable`, `Strong fit`.

Rules:

- Role readiness is a rollup, not a replacement for individual assessment scores.
- Readiness should be conservative when evidence is mostly written, AI-graded, stale, or not human-probed.
- `blockingGaps` should count active gaps that materially affect the target role.
- `recommendedNextMilestone` should name the highest-leverage artifact, skill, or retest needed next.

## 17.18 Proof Strength

Use `proofStrength` to distinguish weak claims from strong evidence.

```json
{
  "proofStrength": {
    "score": 0.75,
    "basis": [
      "code exists",
      "tests pass",
      "explained verbally",
      "README documents tradeoffs"
    ],
    "missingProof": [
      "human mock interview",
      "retest after 7 days"
    ]
  }
}
```

Rules:

- `score` ranges from `0.00` to `1.00`.
- Stronger proof usually combines artifact evidence, test evidence, verbal explanation, and retest evidence.
- A high answer score with low proof strength should not be treated as stable readiness.
- `basis` and `missingProof` should explain why the proof-strength score is not simply equal to the answer score.

Suggested proof-strength interpretation:

| Score range | Meaning |
|---:|---|
| 0.00–0.24 | Claim only or weak anecdotal evidence |
| 0.25–0.49 | Partial evidence, not interview-defensible yet |
| 0.50–0.74 | Usable evidence with meaningful gaps |
| 0.75–0.89 | Strong evidence, likely defensible |
| 0.90–1.00 | Very strong evidence: tested, explained, retained, and externally calibrated |

## 17.19 Anti-Inflation Checks

Use `antiInflationChecks` to prevent overclaiming.

```json
{
  "antiInflationChecks": {
    "overclaimRisk": "Medium",
    "productionClaimSafe": false,
    "ownershipClaimSafe": true,
    "llmDependencyRisk": "Medium",
    "notes": "Can claim production-shaped local orchestration, not production cloud deployment."
  }
}
```

Accepted `overclaimRisk` and `llmDependencyRisk` values: `Low`, `Medium`, `High`, `Unknown`.

Rules:

- `productionClaimSafe` should be `false` unless the evidence supports actual production deployment or production ownership.
- `production-shaped` evidence must not be described as production experience unless it truly ran in production.
- `ownershipClaimSafe` should be `false` when the candidate cannot distinguish personal contribution from team, LLM, tutorial, or inherited work.
- `llmDependencyRisk` should remain `Medium` or `High` until the candidate has reproduced, explained, and tested the relevant work without LLM assistance.
- Anti-inflation checks should never lower truthful evidence; they only protect against exaggerated interpretation.



## 17.20 Tagging Density, Precision, and Anti-Noise Rules

Tagging must be rich enough to support accurate trend analysis and retesting. Sparse generic tagging is a diagnostic failure when the evidence supports more precise descriptors.

### Core tagging rule

> Include every tag that is materially supported by the evidence, but do not pad records with loosely related or redundant tags.

Use tags to answer: **If this pattern appears three times, what exactly should be practiced or retested?**

### Tag classes

| Tag class | Purpose | Example |
|---|---|---|
| `weaknessTags` | Observable performance symptoms. | `Mechanism gap`, `Validation gap`, `Thin tradeoff analysis`. |
| `knowledgeGapTags` | Specific missing concepts, mechanisms, invariants, or domain vocabulary. | `Java String immutability`, `Nearest common ancestor state placement`, `Spring controller-advice registration`. |
| `gapTypes` | Why the miss occurred. | `Mechanism gap`, `Verification gap`, `Autonomy gap`. |
| `focusAreas` | What competency area the task tested. | `Contracts`, `Failure handling`, `Algorithm choice`. |
| `expectedElements` / `missingElements` | Concrete answer-element accounting. | `States O(n) time`, `Explains min-price invariant`. |

### Minimum tagging expectations

These are defaults, not hard caps:

| Assessment type | Expected diagnostic density when evidence is available |
|---|---|
| Coding | problem name, pattern, algorithm/data structure, complexity, edge-case tags, validation gap tags. |
| Debugging | symptom, root-cause area, contract/invariant, evidence quality, regression gap. |
| Knowledge | missing concept/mechanism, tradeoff gap, application gap, probe-readiness failure point. |
| System design | boundary, data contract, reliability, scalability, security/ops, alternatives. |
| Project walkthrough | ownership, artifact proof, limitations, production-claim safety, role coverage. |

A typical scored assessment should often have 2–6 `weaknessTags` and 1–8 `knowledgeGapTags` when gaps are visible. More is allowed when the evidence truly exposes distinct issues. Zero knowledge-gap tags is acceptable only when the evidence does not identify a specific missing concept.

### Anti-noise rules

- Do not use broad tags when a narrow reusable tag is available.
- Do not tag adjacent concepts that were not tested.
- Do not duplicate the same idea at multiple abstraction levels unless both levels help future filtering.
- Do not infer a conceptual gap when the evidence only shows communication failure.
- Do not infer an autonomy gap unless assistance evidence supports it.
- Do not let tag volume increase scores.
- Do not hide major gaps behind a single generic tag like `Incomplete execution`.

### Required coding tags

For each coding assessment, record these when available:

- `problemName`
- `platform`
- `codingPattern`
- `primaryDataStructure`
- `algorithmicInvariant`
- `complexityClaimed`
- `complexityCorrect`
- `compileStatus`
- `testStatus`
- `edgeCasesCovered`
- `edgeCasesMissed`

These fields prevent coding progress from being undercounted or flattened into vague “algorithms” evidence.


## 17.21 Controlled Diagnostic Label Set

Use this section as the controlling tag set for `weaknessTags`, `knowledgeGapTags`, and `gapTypes`.

Label set version: `1.11-labels.2026-07-03`

Purpose: Controlled diagnostic label set for Technical Competency Progress Tracker v1.11. Intended to reduce tag drift by constraining weaknessTags, knowledgeGapTags, and gapTypes while preserving a proposedNewTags escape hatch. Extended in v1.11 to add a Business Intelligence and Analytics Communication knowledge-gap cluster and the `Requirements translation gap` gap type.

### 17.21.1 Grader Policy

| Policy | Rule |
| --- | --- |
| Canonical-only rule | Use canonical weaknessTags, knowledgeGapTags, and gapTypes only. If no canonical label fits, place the proposed label in proposedNewTags with a reason; do not insert it directly into weaknessTags or knowledgeGapTags. |
| Specificity rule | Use the narrowest accurate knowledgeGapTag. Do not attach an entire topic cluster when only one concept was missed. |
| Weakness vs knowledge rule | weaknessTags describe observable answer symptoms; knowledgeGapTags describe the missing concept, mechanism, invariant, or vocabulary; gapTypes classify why the miss occurred. |
| No-padding rule | Do not add adjacent tags that were not tested by the prompt or exposed by the answer. |
| Alias normalization rule | Before recording tags, normalize historical or generated variants through aliasMap. Retired labels must never be emitted in new records. |

### 17.21.2 `proposedNewTags` Escape Hatch

If no canonical label fits, do **not** add the new label directly to `weaknessTags`, `knowledgeGapTags`, or `gapTypes`. Add it to `proposedNewTags` instead:

```json
{
  "proposedNewTags": [
    {
      "tagClass": "knowledgeGapTags",
      "proposedTag": "New narrow concept label",
      "reason": "Why no canonical tag fits",
      "nearestExistingTag": "Closest canonical tag or null"
    }
  ]
}
```

Accepted `tagClass` values:

- `weaknessTags`
- `knowledgeGapTags`
- `gapTypes`

### 17.21.3 Canonical `weaknessTags`

| Canonical weakness tag | Default severity | Definition |
| --- | --- | --- |
| `Mechanism gap` | Medium | The answer names or gestures at a concept but does not explain the mechanism, lifecycle, invariant, data flow, or cause-effect relationship clearly enough. |
| `Thin tradeoff analysis` | Medium | The answer does not compare alternatives, limitations, costs, why-not cases, or decision criteria expected for the level. |
| `Incomplete execution` | Medium | The answer, implementation, design, or debugging attempt stops before reaching a usable conclusion or deliverable. |
| `Insufficient evidence` | Medium | The answer makes claims without adequate tests, reproduction, metrics, direct outputs, validation, or observable support. |
| `Incorrect reasoning` | High | The reasoning path is materially wrong, even if some terms or conclusions are partly correct. |
| `Confident false claim` | High | The answer states a materially false claim with confidence rather than uncertainty or qualification. |
| `Terminology imprecision` | Low | The answer uses a term loosely or incorrectly enough to reduce technical precision, but not enough to be a central false claim. |
| `Scope boundary missed` | Medium | The answer misses the relevant boundary between layers, responsibilities, services, stages, systems, or ownership domains. |
| `Failure handling gap` | Medium | The answer omits expected error paths, retries, fallbacks, rollback behavior, conflict handling, degraded mode, or recovery behavior. |
| `Validation gap` | Medium | The answer misses validation, test-set independence, runtime checks, schema checks, representative tests, or proof that behavior is safe/correct. |
| `Edge-case gap` | Medium | The answer or implementation misses important boundary conditions, duplicate cases, null/empty cases, ordering constraints, or rare but relevant cases. |
| `Complexity analysis missing` | Medium | The answer omits or incorrectly states expected time, space, scaling, throughput, latency, or cost analysis. |
| `Overprompted answer` | High | The final answer depends heavily on prompts, hints, answer-key exposure, or externally supplied structure. |
| `Ownership unclear` | Medium | The evidence does not clearly show which reasoning, implementation, design, or decision was independently owned by the candidate. |
| `Application gap` | Medium | The answer gives a definition but does not apply it to a concrete scenario, project, business case, or production context expected by the prompt. |
| `Interview phrasing gap` | Low | The answer is technically close but would likely fail or weaken in an interview because the framing, ordering, or concise lead sentence is unclear. |
| `Definition gap` | High | The answer does not provide a precise enough definition of the concept being asked. |
| `Implementation detail gap` | Medium | The answer or code misses a necessary language, API, syntax, lifecycle, or integration detail required to make the solution work. |

### 17.21.4 Retired `weaknessTags`

Retired labels must not be emitted in new records. Normalize them through the alias map before recording.

`Mechanism not explained`, `Mechanism partially explained`, `Operational mechanism partially implicit`, `Shallow reasoning`, `Explanation unclear`, `Thin tradeoffs`, `Evidence gaps`, `No test strategy`, `No explicit test evidence`, `Missing failure handling`, `Alternatives not considered`, `Excessive prompting`, `answer-after-coaching`, `problem-level cap`, `Ownership unclear`, `imprecise terminology`, `imprecise-terminology`

### 17.21.5 Canonical `gapTypes`

| Canonical gap type | Definition |
| --- | --- |
| `Conceptual gap` | The underlying concept is not known or is materially misunderstood. |
| `Mechanism gap` | The label is known but the internal mechanism, lifecycle, invariant, or causal path is missing. |
| `Application gap` | The concept is known but not applied to a real scenario, project, or operational context. |
| `Tradeoff gap` | Alternatives, constraints, costs, risks, or why-not cases are missing. |
| `Verification gap` | The answer lacks tests, metrics, reproduction, validation, evidence, or proof quality. |
| `Autonomy gap` | The answer depended too heavily on hints, scaffolding, answer-key exposure, or external correction. |
| `Communication gap` | The candidate likely knew more than they communicated, or the explanation was too unclear for interview use. |
| `Recall gap` | The concept appears learned previously but was not retrievable under assessment conditions. |
| `Scope gap` | The answer stayed too local and missed boundary, blast radius, lifecycle, or system-level consequences. |
| `Evidence quality gap` | The source evidence is incomplete or weak enough that score stability is uncertain. |
| `Requirements translation gap` | The candidate understood the underlying technical material but could not translate an ambiguous business or stakeholder ask into a scoped, well-defined technical or analytical question. Distinct from `Communication gap`, which concerns explaining known material, not scoping an unclear request. |

### 17.21.6 Canonical `knowledgeGapTags`

Use the narrowest accurate knowledge-gap tag. Do not attach an entire topic cluster when only one concept was missed.

### Software Engineering Fundamentals

- `Variable versus value versus type distinction`
- `Static versus dynamic typing`
- `Runtime validation versus static type checking`
- `Function versus method distinction`
- `Input/output contract`
- `Single responsibility and cohesion`
- `Class versus object distinction`
- `Data record versus behavior-heavy class`
- `Encapsulation and invariant protection`
- `Setter versus domain operation boundary`
- `Inheritance versus composition tradeoff`
- `Interface contract versus implementation detail`
- `Premature abstraction with interfaces`
- `List/set/map/stack/queue operation selection`
- `Hash-based lookup memory tradeoff`
- `Big-O growth versus runtime benchmark`
- `I/O cost versus algorithmic complexity`
- `Exception translation boundary`
- `Retryable versus permanent failure distinction`
- `Unit test isolation and determinism`
- `Behavior testing versus implementation-coupled testing`
- `HTTP request-response lifecycle`
- `HTTP status code semantics`
- `REST resource modeling and statelessness`
- `Workflow endpoint versus CRUD endpoint`
- `Database transaction atomicity and rollback`
- `External API inside transaction risk`
- `Git branch and pull request workflow`
- `Systematic debugging loop`
- `Dependency-chain inspection`

### Java and DSA

- `Java String immutability`
- `String.replaceFirst argument and return behavior`
- `Regex semantics in string replacement`
- `Frequency-count invariant for anagrams`
- `Single-pass min-price invariant`
- `Greedy stock-profit state update`
- `Ordering constraint for buy before sell`
- `O(1) state tracking`
- `Odd-length two-pointer loop termination`
- `In-place reversal invariant`
- `In-place prefix sum transformation`
- `Space optimization using input mutation`
- `Complexity claim for implemented algorithm`
- `Representative edge-case tests for coding`

### Machine Learning and RAG

- `Rules-based versus learned pattern boundary`
- `Deterministic guardrails versus probabilistic predictions`
- `Learned parameters versus explicit rules`
- `Hard policy constraints`
- `Supervised labels versus unsupervised structure`
- `Training versus inference distinction`
- `Model objective versus business objective`
- `Cluster validity versus operational usefulness`
- `Feature versus label distinction`
- `Prediction-time feature availability`
- `Data leakage through future information`
- `Train/validation/test split ownership`
- `Temporal leakage`
- `Group leakage`
- `Duplicate-record leakage`
- `Overfitting versus underfitting pattern`
- `Classification versus regression framing`
- `Precision versus recall tradeoff`
- `F1 limitation under business-cost asymmetry`
- `Baseline model comparison`
- `Keyword baseline versus embedding retrieval`
- `Preprocessing pipeline ownership`
- `Cross-validation fold independence`
- `Time-series cross-validation`
- `Model serving contract`
- `Inference-time missing feature handling`
- `Data drift versus concept drift`
- `RAG versus fine-tuning boundary`
- `RAG hallucination despite correct corpus`
- `Retrieval intent versus corpus vocabulary mapping`
- `RAG evaluation hit_rate@k versus MRR`
- `LLM boundary versus deterministic policy`
- `Human-in-the-loop validation boundary`
- `Experiment reproducibility lineage`

### Data Science and Statistics

- `Business decision to analytical question translation`
- `Metric denominator and timeframe definition`
- `Baseline and population definition`
- `Population versus sample distinction`
- `Review-selection bias`
- `Mean median mode distribution choice`
- `Median versus tail-percentile interpretation`
- `Variance and standard deviation interpretation`
- `Control limits versus specification limits`
- `Correlation versus causation distinction`
- `Confounder and causal language boundary`
- `Hypothesis test p-value interpretation`
- `Statistical significance versus practical significance`
- `Confidence interval interpretation`
- `Missingness mechanism classification`
- `Informative missingness`
- `Outlier removal versus rare valid signal`
- `EDA structural data-quality checks`
- `Visualization choice by analytical question`
- `SQL aggregation grain and denominator`
- `Join cardinality before aggregation`
- `A/B test randomization and eligibility`
- `Before-after comparison confounding`
- `Stakeholder result communication`

### Data Engineering

- `Pipeline versus one-off script distinction`
- `Pipeline input/output contract`
- `ETL versus ELT transformation boundary`
- `Immutable raw layer`
- `Curated layer as analyst-facing contract`
- `Lineage, replay, and backfill`
- `Batch versus streaming boundary`
- `Micro-batch latency tradeoff`
- `Streaming bounded versus unbounded data`
- `Event time versus processing time`
- `Watermarks and late-arriving data`
- `Backpressure`
- `Source-to-target mapping contract`
- `Controlled vocabulary drift`
- `Operational database versus warehouse versus lake`
- `Fact table grain definition`
- `Dimension table context role`
- `Primary key uniqueness and stability`
- `Foreign key referential integrity`
- `Data-quality dimensions`
- `Blocking versus warning data-quality checks`
- `Pipeline idempotency`
- `Content-hash deduplication`
- `Incremental load watermark safety`
- `Late-arriving data overlap window`
- `Orchestration versus transformation logic`
- `Cron versus orchestrator boundary`
- `Partitioning versus indexing`
- `Schema evolution compatibility`
- `Pipeline failure classification`
- `Preserve-last-good extract staleness`
- `Backfill partitioning and source-load control`
- `Pipeline production-readiness criteria`

### React and TypeScript

- `React state ownership`
- `Nearest common ancestor state placement`
- `Single source of truth for shared UI state`
- `Local state versus context versus state library`
- `Render-scope and rerender tradeoffs`
- `Controlled versus uncontrolled input behavior`
- `React value versus defaultValue lifecycle`
- `useEffect external synchronization boundary`
- `Effect cleanup lifecycle`
- `Effect dependency and stale closure behavior`
- `useReducer state-transition model`
- `Reducer immutability and side-effect boundary`
- `State machine versus boolean flags`
- `useMemo versus useCallback distinction`
- `Memoization as performance hint not correctness guarantee`
- `React profiling before memoization`
- `TypeScript discriminated union state modeling`
- `TypeScript narrowing`
- `Exhaustive union handling with never`
- `Runtime API validation boundary`
- `Type assertion versus runtime validation`
- `Frontend-backend contract evolution`
- `API request loading success error states`
- `Duplicate submit prevention`
- `Optimistic update rollback`
- `Idempotency key and stale version handling`
- `Large form field-level subscription strategy`

### SQL and Data Modeling

- `Primary key uniqueness and stability`
- `Composite key design`
- `Surrogate key versus natural key`
- `Integer key versus UUID tradeoff`
- `Key locality and index behavior`
- `Normalization versus denormalization tradeoffs`
- `Update insert delete anomalies`
- `Read/write model consistency`
- `Foreign key constraint versus ID column`
- `Many-to-many join table modeling`
- `Database-enforced versus application-enforced integrity`
- `Database index read-write tradeoff`
- `Composite index column order`
- `EXPLAIN plan interpretation`
- `Inner join versus left join row preservation`
- `Left join filter placement`
- `Join duplicate row diagnosis`
- `GROUP BY output grain`
- `WHERE versus HAVING distinction`
- `Window function versus GROUP BY`
- `Deterministic latest-row selection`
- `Transaction rollback and atomicity`
- `Optimistic locking version check`
- `Valid state transitions under concurrency`

### Business Intelligence and Analytics Communication

- `Semantic layer versus raw query modeling`
- `Measure versus dimension distinction`
- `Dashboard versus ad hoc analysis boundary`
- `Aggregate versus row-level calculation in BI tools`
- `Executive-level insight summarization`
- `Ambiguous stakeholder ask scoping`
- `Metric ownership and single-source-of-truth definition`
- `Self-serve dashboard versus analyst-gated report boundary`

### SDLC and DevOps

- `Continuous integration practice definition`
- `Configured CI gates versus business correctness`
- `CI coverage limitations`
- `Merge-blocking versus deployment checks`
- `Pull request versus git pull distinction`
- `Polyglot monorepo affected-change detection`
- `Docker image versus running container`
- `Container runtime isolation boundary`
- `Host kernel sharing`
- `Docker Compose versus production orchestration`
- `Dockerfile versus docker-compose.yml`
- `Compose service discovery`
- `Compose build versus run responsibilities`
- `Host port versus container port`
- `Docker internal DNS`
- `Runtime configuration ownership`
- `Environment variables as runtime configuration`
- `Secure container image construction`
- `Container health checks and restart diagnosis`
- `Infrastructure as code versus setup script`
- `Infrastructure drift detection`
- `Environment module and state separation`
- `Secret rotation and revocation`
- `CI secret exposure boundary`
- `Health check liveness versus readiness`
- `Dependency outage health-check cascade risk`
- `Deployment rollback artifact versus rebuild`
- `Backward-compatible schema rollout`
- `Canary versus blue-green deployment`
- `Progressive delivery rollback threshold`
- `Logs metrics traces distinction`
- `Correlation ID versus trace ID`
- `MDC logging context`
- `OpenTelemetry trace/span model`
- `RAG observability dimensions`

### Spring Boot and Backend API

- `Spring controller-service-client boundaries`
- `DTO validation versus domain invariants`
- `Java-Python bridge contract`
- `HTTP error translation`
- `Spring controller-advice registration`
- `Spring API boundary versus framework-owned concept`
- `Subprocess stdout/stderr capture`
- `Subprocess envelope/environment propagation`
- `React-visible error correlation ID`
- `OpenAPI contract documentation`


### 17.21.7 Alias Normalization Maps

Before recording tags, normalize generated or historical variants through these alias maps. The normalized output must use canonical labels only.

#### `weaknessAliasMap`

```json
{
  "Mechanism not explained": "Mechanism gap",
  "Mechanism partially explained": "Mechanism gap",
  "Operational mechanism partially implicit": "Mechanism gap",
  "Shallow reasoning": "Mechanism gap",
  "Explanation unclear": "Terminology imprecision",
  "Thin tradeoffs": "Thin tradeoff analysis",
  "Alternatives not considered": "Thin tradeoff analysis",
  "tradeoff missing": "Thin tradeoff analysis",
  "Tradeoff missing": "Thin tradeoff analysis",
  "Scope or blast radius missed": "Scope boundary missed",
  "problem-level cap": "Scope boundary missed",
  "Missing failure handling": "Failure handling gap",
  "Insufficient validation": "Validation gap",
  "No test strategy": "Validation gap",
  "No explicit test evidence": "Insufficient evidence",
  "No test evidence shown": "Insufficient evidence",
  "Evidence gaps": "Insufficient evidence",
  "Verification strategy thin": "Validation gap",
  "Missed edge cases": "Edge-case gap",
  "No complexity analysis stated": "Complexity analysis missing",
  "Incorrect reasoning": "Incorrect reasoning",
  "Confident false claim": "Confident false claim",
  "Excessive prompting": "Overprompted answer",
  "Assisted retry": "Overprompted answer",
  "Assisted core mechanism": "Overprompted answer",
  "answer-after-coaching": "Overprompted answer",
  "answer-key-exposure": "Overprompted answer",
  "answer-key exposure": "Overprompted answer",
  "low-independent-recall": "Overprompted answer",
  "Ownership unclear": "Ownership unclear",
  "Incomplete execution": "Incomplete execution",
  "Implementation detail incomplete": "Implementation detail gap",
  "incomplete-definition": "Definition gap",
  "Precision gap": "Terminology imprecision",
  "Minor terminology imprecision": "Terminology imprecision",
  "imprecise-terminology": "Terminology imprecision",
  "imprecise terminology": "Terminology imprecision",
  "minor verbal imprecision": "Terminology imprecision",
  "bootstrap wording imprecision": "Terminology imprecision",
  "limited precision": "Terminology imprecision",
  "Needs interview phrasing polish": "Interview phrasing gap",
  "limited example depth": "Application gap",
  "generalization not explicit": "Application gap",
  "follow-up after discussion": "Overprompted answer",
  "Did not identify in-place optimization": "Implementation detail gap",
  "Minor code cleanup": "Implementation detail gap",
  "validation-set purpose incomplete": "Validation gap",
  "test-set independence missing": "Validation gap",
  "test-set optimism wording": "Validation gap",
  "cross-validation nuance": "Validation gap",
  "overfitting not explicit": "Mechanism gap",
  "minor temporal-split wording issue": "Terminology imprecision",
  "autocorrelation not explicit": "Mechanism gap",
  "could name out-of-time validation more directly": "Terminology imprecision",
  "time-series leakage mechanism incomplete": "Mechanism gap",
  "group leakage mechanism incomplete": "Mechanism gap",
  "split-strategy alternatives missing": "Thin tradeoff analysis",
  "minor causal attribution wording": "Terminology imprecision",
  "minor distribution wording": "Terminology imprecision",
  "bias terminology missing": "Terminology imprecision",
  "causal attribution vs sampling issue not fully separated": "Scope boundary missed",
  "needs sharper analytic conclusion": "Interview phrasing gap",
  "stream producer/consumer wording": "Terminology imprecision",
  "advanced streaming mechanics missing": "Mechanism gap",
  "bounded-vs-unbounded gap": "Mechanism gap",
  "streaming mental model incomplete": "Mechanism gap",
  "latency framing mismatch": "Scope boundary missed",
  "polling vs event stream confusion": "Incorrect reasoning",
  "windowing concepts missing": "Mechanism gap",
  "SLA wording not explicit": "Terminology imprecision",
  "throughput-cost tradeoff could be named": "Thin tradeoff analysis",
  "micro-batch terminology missing": "Terminology imprecision"
}
```

#### `gapTypeAliasMap`

```json
{
  "precision": "Communication gap",
  "evaluation nuance": "Verification gap",
  "statistical precision": "Verification gap",
  "method limitation nuance": "Tradeoff gap",
  "analytics framing": "Application gap",
  "terminology": "Communication gap",
  "Optimization gap": "Application gap",
  "conceptual recall": "Recall gap",
  "mechanism explanation": "Mechanism gap",
  "example generation": "Application gap",
  "example completeness": "Application gap",
  "independent recall": "Recall gap",
  "conceptual precision": "Conceptual gap",
  "evaluation framing": "Verification gap",
  "mechanism": "Mechanism gap",
  "evaluation design": "Verification gap",
  "causal attribution nuance": "Scope gap",
  "distributed systems nuance": "Scope gap",
  "streaming mechanics": "Mechanism gap",
  "conceptual mechanism": "Mechanism gap",
  "data engineering vocabulary": "Communication gap",
  "architecture framing": "Scope gap",
  "production framing polish": "Communication gap"
}
```

#### `knowledgeAliasMap`

```json
{
  "Docker image vs container": "Docker image versus running container",
  "Docker image vs running container": "Docker image versus running container",
  "Dockerfile vs docker-compose.yml": "Dockerfile versus docker-compose.yml",
  "Host port vs container port": "Host port versus container port",
  "temporal leakage": "Temporal leakage",
  "out-of-time validation": "Time-series cross-validation",
  "event time": "Event time versus processing time",
  "watermarks": "Watermarks and late-arriving data",
  "backpressure": "Backpressure",
  "micro-batching": "Micro-batch latency tradeoff",
  "selection mechanism": "Review-selection bias",
  "representativeness": "Population versus sample distinction",
  "bootstrap uncertainty vs bias": "Confidence interval interpretation",
  "Spring API boundary vs framework-owned concept": "Spring API boundary versus framework-owned concept",
  "Spring API boundary vs Spring framework feature": "Spring API boundary versus framework-owned concept",
  "Correlation ID vs trace ID": "Correlation ID versus trace ID",
  "Configured CI gates versus business correctness": "Configured CI gates versus business correctness",
  "React state ownership": "React state ownership",
  "Controlled versus uncontrolled input behavior": "Controlled versus uncontrolled input behavior"
}
```

### 17.21.8 Schema Patch

The progress-tracker schema should accept `labelSetVersion` and `proposedNewTags`. Canonical validation should be applied after alias normalization.

```json
{
  "addProperties": {
    "proposedNewTags": {
      "type": "array",
      "items": {
        "type": "object",
        "required": [
          "tagClass",
          "proposedTag",
          "reason"
        ],
        "properties": {
          "tagClass": {
            "enum": [
              "weaknessTags",
              "knowledgeGapTags",
              "gapTypes"
            ]
          },
          "proposedTag": {
            "type": "string"
          },
          "reason": {
            "type": "string"
          },
          "nearestExistingTag": {
            "type": [
              "string",
              "null"
            ]
          }
        }
      }
    },
    "labelSetVersion": {
      "type": "string"
    }
  },
  "optionalValidation": {
    "weaknessTags": "Values should be keys of canonicalWeaknessTags after alias normalization.",
    "knowledgeGapTags": "Values should appear in canonicalKnowledgeGapTags after alias normalization.",
    "gapTypes": "Values should be keys of canonicalGapTypes after alias normalization."
  }
}
```




## 17.22 Assessment Outcome and Concept Discovery Tracking

Use `assessmentOutcome` to distinguish answers where the concept was known from answers where the candidate did not know the concept but attempted first-principles reasoning.

This field is especially important for interview preparation because an interviewer often learns more from how a candidate reasons through an unfamiliar term than from whether the candidate already knows the vocabulary.

Accepted `assessmentOutcome` values:

| Outcome | Meaning | Typical signal |
|---|---|---|
| `Demonstrated` | The concept was known well enough to attempt a normal answer, implementation, design, or debugging path. | Score the answer normally against the applicable level. |
| `Partial discovery` | The concept or exact vocabulary was not known, but the candidate attempted a meaningful first-principles explanation, analogy, decomposition, or inference. | Vocabulary may be missing, but the underlying model may be partially present. |
| `Concept discovery` | The concept was not known and no meaningful technical reasoning was attempted. | Treat as a teaching gap, usually a true conceptual gap. |

### 17.22.1 Core rule

Do not collapse `Partial discovery` and `Concept discovery` into the same weakness. They represent different readiness signals.

| Candidate behavior | Record as | Interpretation |
|---|---|---|
| “I know this: value semantics means equality is based on contents; identity semantics means equality is based on object identity.” | `Demonstrated` | Concept known and answer assessable. |
| “I do not know the terms, but my guess is identity means object instance/reference and value means comparing contents.” | `Partial discovery` | Vocabulary missing or weak, but transferable reasoning is present. |
| “I do not know.” | `Concept discovery` | Concept absent in this assessment. |

### 17.22.2 Scoring rules

- `Partial discovery` can receive meaningful reasoning, communication, and first-principles credit.
- `Partial discovery` must not be scored as if the concept was fully known.
- `Concept discovery` usually receives little or no conceptual-accuracy credit, but may still receive professionalism credit for honest uncertainty.
- `Partial discovery` often maps to `Recall gap`, `Communication gap`, `Terminology imprecision`, `Definition gap`, or a shallow `Conceptual gap` depending on the answer.
- `Concept discovery` usually maps to `Conceptual gap`, `Definition gap`, and the relevant narrow `knowledgeGapTags`.
- A candidate should be encouraged to say “I do not know the term, but my instinct is...” when they can reason from adjacent knowledge.
- Do not reward confident invention. A speculative answer should be explicitly framed as a guess.

### 17.22.3 Recommended supporting object

Use `conceptDiscovery` when the outcome is `Partial discovery` or `Concept discovery`, and optionally when the outcome is `Demonstrated` but vocabulary/mental-model separation matters.

```json
{
  "assessmentOutcome": "Partial discovery",
  "conceptDiscovery": {
    "conceptKnownBeforeAnswer": false,
    "vocabularyKnown": false,
    "reasoningAttempted": true,
    "firstPrinciplesSignal": "Moderate",
    "underlyingModelSignal": "Partial",
    "teachingNeed": "Vocabulary mapping",
    "candidateFraming": "I am not familiar with the terms, but my guess is...",
    "notes": "Candidate inferred object identity versus content comparison despite missing the formal vocabulary."
  }
}
```

Accepted `conceptDiscovery.firstPrinciplesSignal` values:

- `None`
- `Weak`
- `Moderate`
- `Strong`
- `Unknown`

Accepted `conceptDiscovery.underlyingModelSignal` values:

- `Absent`
- `Partial`
- `Present`
- `Unknown`

Accepted `conceptDiscovery.teachingNeed` values:

- `None`
- `Vocabulary mapping`
- `Mechanism refinement`
- `Full concept teach`
- `Retest under probing`
- `Unknown`

### 17.22.4 Outcome-to-gap guidance

| `assessmentOutcome` | Likely weakness tags | Likely gap types | Retest implication |
|---|---|---|---|
| `Demonstrated` | Use only evidence-supported canonical weakness tags. | Use evidence-supported canonical gap types. | Normal spaced practice or deeper probe. |
| `Partial discovery` | `Terminology imprecision`, `Definition gap`, `Mechanism gap`, `Interview phrasing gap` when supported. | Often `Recall gap`, `Communication gap`, shallow `Conceptual gap`, or `Mechanism gap`. | Retest after vocabulary mapping and one follow-up. |
| `Concept discovery` | `Definition gap`, `Mechanism gap`, possibly `Incomplete execution` if the answer stops. | Usually `Conceptual gap`. | Teach concept, then retest from scratch later. |

### 17.22.5 Anti-inflation rule

`Partial discovery` is positive evidence of reasoning under uncertainty, but it does not automatically prove Level II or Level III readiness. It improves diagnostic precision; it does not bypass correctness, mechanism, evidence, autonomy, or problem-level gates.

## 17.23 Decision Quality and Readiness Trust Layer

Version 1.10 adds fields that make the tracker better at judging how much to trust a score, whether a gap is recurring, whether knowledge transfers across domains, and what evidence is still required before claiming role readiness.

These fields do not replace scores. They prevent overinterpreting scores.

The decision-quality layer answers:

- Is this score calibrated against known examples?
- Is the score a precise number or really a score band?
- Is the same gap recurring after feedback?
- Can the concept transfer outside the original context?
- Is the role-readiness claim supported by enough evidence types?
- Did the candidate recover well when uncertain?
- What exact action would lift the answer to the next level?
- Is the tracker itself healthy enough to trust?

## 17.24 Calibration Anchors

Use `calibrationAnchors` to compare an assessment against known examples and reduce grader drift.

```json
{
  "calibrationAnchors": [
    {
      "calibrationAnchorId": "knowledge-docker-l1-strong-pass",
      "taskType": "knowledge",
      "problemLevel": "L1",
      "difficulty": 2,
      "expectedLevelScores": {
        "L1": 85,
        "L2": 55,
        "L3": 25
      },
      "anchorReason": "Correct Level I Docker explanation with limited operational depth.",
      "matchQuality": "Strong"
    }
  ]
}
```

Accepted `matchQuality` values: `Weak`, `Partial`, `Strong`.

Rules:

- Use anchors to calibrate scoring, not to override evidence.
- Anchors should be small, concrete, and reusable.
- When graders disagree, compare the disputed assessment to the closest anchor before changing the score.
- Anchor comparisons should be used especially for common interview questions, recurring coding patterns, and repeated project-walkthrough prompts.

Recommended anchor types:

- strong Level I answer with weak Level II signal;
- borderline Level II answer;
- strong Level II answer;
- confident wrong answer;
- partial-discovery answer;
- concept-discovery answer;
- good first answer that fails deep probing.

## 17.25 Score Uncertainty

Use `scoreUncertainty` to avoid false precision.

```json
{
  "scoreUncertainty": {
    "range": [74, 82],
    "reason": "Written answer only; no follow-up probing; mechanism depth partly inferred.",
    "confidenceLimiters": [
      "written-only evidence",
      "no follow-up probing"
    ]
  }
}
```

Rules:

- Scores should still be recorded as numbers for tracking.
- `scoreUncertainty.range` shows the plausible scoring band.
- Use wider ranges when evidence is retrospective, written-only, incomplete, AI-graded only, or not probed.
- Use narrower ranges when the assessment was live, clearly scoped, human-reviewed, tested, and well documented.
- A score of `78` with range `[74, 82]` should not be treated as meaningfully different from `80`.

Suggested uncertainty ranges:

| Evidence condition | Typical range width |
|---|---:|
| Human-probed live interview or live coding | ±2–4 |
| Controlled written assessment with tests | ±3–5 |
| AI-graded written answer with no probing | ±5–8 |
| Retrospective partial evidence | ±8–15 |
| Anecdotal or incomplete evidence | Do not score formally |

## 17.26 Gap Recurrence and Persistence

Use `gapRecurrence` to distinguish a first-time miss from a repeated pattern.

```json
{
  "gapRecurrence": {
    "isRecurring": true,
    "priorOccurrences": 3,
    "lastOccurrenceDate": "2026-06-18",
    "worsening": false,
    "pattern": "Repeatedly names concept but misses mechanism under verbal probing."
  }
}
```

Rules:

- A recurring gap is more important than a one-off gap with the same score impact.
- Mark a gap as recurring only when the same weakness, gap type, or knowledge gap appears in comparable contexts.
- Recurrence should raise `priority.severity`, `gapImpact.isBlocking`, or `retestPlan` urgency when role-relevant.
- A recurring `Mechanism gap` after coaching is stronger evidence of instability than a first exposure miss.

## 17.27 Transferability Signal

Use `transferSignal` to track whether knowledge generalizes outside the exact context where it was learned.

```json
{
  "transferSignal": {
    "sourceConcept": "state ownership",
    "transferredTo": [
      "React forms",
      "service-layer invariants",
      "database source of truth"
    ],
    "transferQuality": "Partial",
    "notes": "Understands the idea locally but does not yet generalize cleanly."
  }
}
```

Accepted `transferQuality` values: `None`, `Weak`, `Partial`, `Strong`.

Rules:

- Transferability is especially important for career-transition work across pharmacy operations, analytics, Python, Java/Spring, React, MLE, RAG, and data engineering.
- A strong local answer with weak transfer may pass the immediate task but remain fragile for interviews.
- Strong transfer signal can support higher confidence when a candidate applies the same mechanism in a new stack or project area.
- Do not infer transfer unless the candidate actually applies or explains the concept in a different context.

## 17.28 Retest Queue and Practice Scheduler

Use `retestQueue` for rollup records or practice-planning records that summarize what should be retested next.

```json
{
  "retestQueue": {
    "dueNow": [
      "Docker image versus running container",
      "HTTP status code semantics"
    ],
    "dueSoon": [
      "Spring controller-service-client boundaries"
    ],
    "blockedBy": [
      "Java interfaces",
      "DTO validation versus domain invariants"
    ]
  }
}
```

Rules:

- `retestQueue` is normally a rollup/planning object, not required on every atomic assessment.
- `dueNow` should include gaps with high role impact, high recurrence, or overdue retention risk.
- `dueSoon` should include gaps with medium staleness risk or upcoming interview relevance.
- `blockedBy` should identify prerequisite gaps that make a retest premature.
- The queue should be built from `gapClosureStatus`, `staleness`, `priority`, `gapImpact`, and `retestPlan`.

## 17.29 Assessment Quality

Use `assessmentQuality` to separate candidate performance from prompt or grading limitations.

```json
{
  "assessmentQuality": {
    "promptClarity": "Medium",
    "expectedElementsDefinedBeforeAnswer": false,
    "gradingConfidenceLimitedByPrompt": true,
    "notes": "Question did not specify whether it wanted Level I definition or Level II production tradeoffs."
  }
}
```

Accepted `promptClarity` values: `Low`, `Medium`, `High`.

Rules:

- Poor prompt quality should widen `scoreUncertainty`.
- Prompt ambiguity should not be converted automatically into a candidate weakness.
- If expected elements were not defined before the answer, mark the assessment as less controlled.
- This field is especially important for retrospective grading and broad technical Q&A.

## 17.30 Role Readiness Evidence Floor

Use `roleReadinessEvidenceFloor` to ensure role readiness requires enough evidence coverage, not just a high average score.

```json
{
  "roleReadinessEvidenceFloor": {
    "targetRole": "SWE II — Backend",
    "minimumEvidenceRequired": {
      "codingD3Plus": 5,
      "debuggingD3Plus": 3,
      "systemDesignD3Plus": 2,
      "projectWalkthroughs": 1,
      "humanMockInterviews": 2
    },
    "currentEvidence": {
      "codingD3Plus": 2,
      "debuggingD3Plus": 1,
      "systemDesignD3Plus": 0,
      "projectWalkthroughs": 1,
      "humanMockInterviews": 0
    },
    "evidenceFloorMet": false
  }
}
```

Rules:

- A role can be `Emerging` or `Interviewable with risk` before the evidence floor is met.
- A role should not be marked `Interviewable` or `Strong fit` if critical evidence floors are missing.
- Evidence floors should be role-specific and conservative.
- Human mock interviews and real interview feedback should count more strongly than written AI-graded answers.
- SWE II evidence floors should include coding, debugging, system/API design, production engineering, and a project walkthrough.
- MLE evidence floors should include evaluation, data/feature pipeline reasoning, model/retrieval serving, reproducibility, and a project walkthrough.
- DS evidence floors should include problem formulation, statistics, modeling/evaluation, communication, and business interpretation.
- DE evidence floors should include data modeling, SQL, pipeline reliability, quality checks, orchestration, and lineage/replay.
- BIE evidence floors should include SQL depth, dashboard/semantic-layer modeling, data quality, stakeholder requirements translation, and a project walkthrough.
- BIA evidence floors should include SQL depth, metric/business-question scoping, stakeholder communication, descriptive statistics, and a project walkthrough.

Worked numeric examples (initial calibration; adjust as real evidence accumulates):

```json
{
  "roleReadinessEvidenceFloor": {
    "targetRole": "MLE II — Legal",
    "minimumEvidenceRequired": {
      "evaluationD3Plus": 4,
      "dataFeaturePipelineD3Plus": 3,
      "servingOrRetrievalD3Plus": 3,
      "reproducibilityChecksPassed": 2,
      "projectWalkthroughs": 1,
      "humanMockInterviews": 2
    }
  }
}
```

```json
{
  "roleReadinessEvidenceFloor": {
    "targetRole": "DS II",
    "minimumEvidenceRequired": {
      "problemFormulationD3Plus": 3,
      "statisticsD3Plus": 4,
      "modelingEvaluationD3Plus": 3,
      "businessInterpretationCases": 3,
      "projectWalkthroughs": 1,
      "humanMockInterviews": 2
    }
  }
}
```

```json
{
  "roleReadinessEvidenceFloor": {
    "targetRole": "DE",
    "minimumEvidenceRequired": {
      "dataModelingD3Plus": 3,
      "sqlD3Plus": 5,
      "pipelineReliabilityD3Plus": 3,
      "qualityCheckCases": 2,
      "orchestrationOrLineageCases": 2,
      "projectWalkthroughs": 1,
      "humanMockInterviews": 1
    }
  }
}
```

```json
{
  "roleReadinessEvidenceFloor": {
    "targetRole": "BI Engineer I / II",
    "minimumEvidenceRequired": {
      "sqlD3Plus": 5,
      "analyticsCaseD3Plus": 4,
      "dashboardSemanticLayerCases": 2,
      "dataQualityCases": 2,
      "stakeholderTranslationCases": 2,
      "projectWalkthroughs": 1,
      "humanMockInterviews": 1
    }
  }
}
```

```json
{
  "roleReadinessEvidenceFloor": {
    "targetRole": "Business Intelligence Analyst",
    "minimumEvidenceRequired": {
      "sqlD3Plus": 4,
      "analyticsCaseD3Plus": 5,
      "stakeholderTranslationCases": 3,
      "descriptiveStatsCases": 2,
      "projectWalkthroughs": 1,
      "humanMockInterviews": 1
    }
  }
}
```

## 17.31 Recovery Behavior

Use `recoveryBehavior` to track how the candidate behaves when uncertain, surprised, or partially wrong.

```json
{
  "recoveryBehavior": {
    "acknowledgedUncertainty": true,
    "reasonedFromFirstPrinciples": true,
    "askedClarifyingQuestion": false,
    "avoidedFabrication": true,
    "recoveryQuality": "Strong"
  }
}
```

Accepted `recoveryQuality` values: `None`, `Weak`, `Partial`, `Strong`.

Rules:

- Recovery behavior is distinct from correctness.
- Strong recovery can improve interview-readiness interpretation, especially for `Partial discovery` attempts.
- Recovery behavior must not excuse confident false claims.
- Strong recovery includes acknowledging uncertainty, reasoning from first principles, avoiding fabrication, and adjusting when evidence contradicts the first hypothesis.
- Weak recovery includes freezing, bluffing, continuing disproven theories, or refusing to revise an answer.

## 17.32 Score-Lift Actions

Use `scoreLiftActions` to make feedback operational.

```json
{
  "scoreLiftActions": {
    "toPassNextLevel": [
      "Define Docker image versus running container",
      "Mention shared host kernel",
      "Explain what Compose proves and does not prove",
      "Name one production limitation"
    ],
    "estimatedLift": {
      "L2": "+15"
    }
  }
}
```

Rules:

- Score-lift actions should identify the smallest concrete additions that would likely move the answer to the next score band.
- Do not use vague actions like “study more” when specific missing elements are known.
- Estimated lift is approximate and should not be treated as a promise.
- Score-lift actions should feed directly into `retestPlan.successCriteria`.

## 17.33 Tracker Health and Rollup Audit

Use `trackerHealth` to check whether the tracker itself is trustworthy.

```json
{
  "trackerHealth": {
    "recordsWithMissingLevelScores": 0,
    "recordsWithNoncanonicalTags": 0,
    "recordsMissingAssessmentOutcome": 0,
    "recordsMissingProblemLevel": 0,
    "coverageDefects": 1,
    "overallHealth": "Warning"
  }
}
```

Accepted `overallHealth` values: `Good`, `Warning`, `Critical`, `Unknown`.

Rules:

- Tracker health is normally used in rollup or migration audit records.
- A tracker with schema-valid individual records can still be unhealthy if coverage is incomplete.
- Noncanonical tags, missing level scores, missing assessment outcomes, and missing problem levels are hard quality warnings.
- Coverage defects should be resolved before using role-readiness rollups for planning decisions.
- Tracker health should be reviewed after bulk imports, schema migrations, and rubric version changes.

## 17.34 Role Weight and Priority Multiplier

Multiple target roles are active at once, but they are not equally live. Use `priority.roleWeightTier` so that `priority.roleImpact` and next-action ranking reflect which roles are actually being pursued right now, not a flat average across every role the taxonomy tracks.

### Current role weight table

| Tier | Weight | Roles |
| --- | --- | --- |
| Primary | 1.0 | `Chewy SWE II — HR Systems`, `MLE II — Legal` |
| Secondary | 0.7 | `SWE II — Backend` (and other SWE II archetypes), `MLE II` (general), `DS II`, `DE` |
| Tertiary | 0.4 | `BI Engineer I / II`, `Business Intelligence Analyst` |

This table is a living config, not a fixed rule. Revise it under §23 Version Control whenever active targeting changes — e.g., if an HR Systems or Legal req closes, if a new internal req opens, or if BIE/BIA becomes an active search track rather than a fallback.

### Computation rule

1. Compute the gap's raw severity against the target role's requirements as before (§17.12), independent of weight.
2. Multiply by the role's current weight tier to get weighted impact: `weighted impact = raw severity × tier weight`.
3. Bucket the weighted impact back into `priority.roleImpact` (`Low`/`Medium`/`High`) using the same thresholds as before.
4. Record which tier was used in `priority.roleWeightTier` so the calculation is auditable and revisable when the table changes.

Rule: a High-severity gap against a Tertiary-tier role must not automatically outrank a Medium-severity gap against a Primary-tier role in the next-action queue. Do not let role-weighting suppress an accurate `severity` value — it only adjusts `roleImpact` and next-action ordering, not the underlying assessment score.

## 17.35 Logging Mode (Fast / Full)

Use `loggingMode` to control how much of the diagnostic layer must be populated per record. This is a sustainability control for a tracker used across an entire job search, not a shortcut for a single deadline — at full diagnostic depth a record touches roughly fifteen objects (`expectedElements`, `probeReadiness`, `evidenceSource`, `retention`, `llmIndependence`, `roleRequirementCoverage`, `artifactReadiness`, `staleness`, `gapClosureStatus`, `priority`, `gapImpact`, `assessmentMode`, `calibration`, `calibrationAnchors`, `scoreUncertainty`, `gapRecurrence`, `transferSignal`, `retestQueue`, `assessmentQuality`, `roleReadinessEvidenceFloor`, `recoveryBehavior`, `scoreLiftActions`) beyond the mandatory three-score core. That authoring cost is manageable at low volume and compounds heavily at the record volume a multi-month search generates.

### `fast` mode

Required: `assessmentId`, `date`, `task`, the three level scores, **`finalScore` (the uniform 0–100 final grade — never omitted; see rule below)**, `answerLevel`, `qualifyingDemonstratedLevel`, `gates`, `weaknessTags`, `knowledgeGapTags`, `taskType`, `difficulty`, `assistanceLevel`. Everything else may be omitted.

Use `fast` for high-volume routine drilling: coding-bank grinding, SQL reps, Q Bank mastered/quick-log entries, defense (project story) cold-walkthrough reps graded in-app (`taskType: "walkthrough"`, typically `evidenceClass: "classB"`), and other repeated practice where the primary need is a pass/fail signal and the specific missing concept, not a full readiness re-derivation.

### `full` mode

All diagnostic objects applicable to the task type must be populated per their individual section rules.

Use `full` for: the first occurrence of a new or previously unseen gap, any retention retest, any human mock interview or real interview feedback, weekly calibration checkpoints, and any record feeding a `roleReadinessRollup` decision.

### Rules

- `loggingMode` is optional; a record without it is treated as `full` for backward compatibility with pre-v1.11 records.
- Switching a record to `fast` never permits skipping the three-score core, the uniform `finalScore`, or the gates — those are never optional regardless of logging mode. Rev 2 note: earlier printings of this section listed the fast-mode requireds without `finalScore`; graders following that list emitted records the importing tracker back-filled with a computed `finalScore` of 0 (both supporting scores defaulting to 0), silently dragging down every average. Always emit `finalScore` explicitly.
- Leveled ladder sessions (an L1 question, then L2, then L3 stretch on the same concept) produce **one record per level**, linked with `attemptGroupId`/`attemptNumber` — the same one-record-per-attempt rule as coding (§1.2.2). Do not collapse a ladder into a single averaged record.
- A tracker that is entirely `fast`-mode for months would lose the diagnostic richness this system exists for; treat a `full`-mode record as due at minimum once per active gap and once per calibration cycle, not only when convenient.
- `trackerHealth` audits (§17.33) should include a `fast`/`full` distribution check so an unintentional drift toward all-`fast` logging is visible.
- `loggingMode` supersedes the earlier undocumented `quickLog` boolean that appeared in the standard record example without a corresponding rubric section or schema type. Do not emit `quickLog` in new records; migrate `quickLog: true` to `loggingMode: "fast"` and `quickLog: false`/absent to `loggingMode: "full"` on next touch of a legacy record.

## 17.36 Schema-Doc Parity Rule

As of v1.11, every diagnostic object documented in this rubric has a corresponding type definition in the JSON schema (`progress_tracker_record_schema`) — prior versions accumulated prose-documented fields (`priority`, `gapImpact`, `artifactReadiness`, `staleness`, `gapClosureStatus`, `roleRequirementCoverage`, `probeReadiness`, `evidenceSource`, `retention`, `llmIndependence`, `assessmentMode`, `calibration`, `expectedElements`/`presentElements`/`missingElements`/`elementSource`, `focusAreas`) that were valid under `additionalProperties: true` but received no schema-level type or enum enforcement.

Rule: any future version that adds a new diagnostic object, tag, or enum value to this rubric document must add the matching schema definition in the same version bump. A rubric change without a matching schema change is an incomplete version, even if it is internally consistent prose. Treat schema/doc parity as a release gate alongside the existing hard failure conditions in §22.5.

# 18. Standard Assessment Record

> Assessment ID:  
> Session ID:  
> Parent assessment ID:  
> Attempt group ID:  
> Attempt number:  
> Attempt type: initial / retry / assisted_retry / post_coaching_retry / retention_retest / final_retry / session_parent / rollup  
> Prior assessment ID:  
> Source file or transcript:  
> Source item ID / pointer:  
> Coverage status: included / excluded / suspected_missing / duplicate_linked  
> Date:  
> Rubric version:  
> Logging mode: fast / full  
> Prospective or retrospective:  
> Evidence class:  
> Evidence confidence:  
> Assessment outcome: Demonstrated / Partial discovery / Concept discovery  
> Concept discovery details:  
> Calibration anchors:  
> Score uncertainty:  
> Gap recurrence:  
> Transfer signal:  
> Retest queue, if rollup/planning record:  
> Assessment quality:  
> Role readiness evidence floor, if role rollup:  
> Recovery behavior:  
> Score-lift actions:  
> Tracker health, if rollup/migration record:  
>   
> Question/task:  
> Primary task type:  
> Secondary task signals:  
> Problem name, if coding:  
> Coding pattern, if coding:  
> Primary data structure, if coding:  
> Problem level: Level I / Level II / Level III  
> Difficulty: 1–5  
> Difficulty attribute score:  
> Difficulty rationale:  
> Difficulty assignment: Precommitted / Retrospectively estimated  
>   
> Technology/framework:  
> Primary technical domain:  
> Secondary technical domains:  
> Domain contribution weights:  
> Primary role:  
> Secondary roles:  
> Role contribution weights:  
>   
> Assistance level:  
> Coaching between attempts:  
> Autonomy confidence:  
>   
> Level I answer score: /100  
> Level I verdict: Pass / Borderline / Fail  
> Level II answer score: /100  
> Level II verdict: Pass / Borderline / Fail  
> Level III answer score: /100  
> Level III verdict: Pass / Borderline / Fail  
>   
> Answer level:  
> Qualifying demonstrated level:  
> Qualifying evidence note:  
>   
> Mandatory gates:  
> - Correctness:  
> - Relevance:  
> - Independent explanation:  
> - Evidence:  
> - Integrity:  
> - Completion:  
>   
> Caps:  
> Penalties:  
> Final score (uniform): /100  
> Confirmed strengths:  
> Confirmed weaknesses:  
> Weakness tags:  
> Knowledge gap tags:  
> Gap types:  
> Priority (severity / urgency / role impact / role weight tier):  
> Gap impact (blocking / blocks roles / blocks level):  
> Expected elements:  
> Present elements:  
> Missing elements:  
> Would this survive interview probing:  
> Evaluator confidence:  
> Proof strength:  
> Anti-inflation checks:  
> Next improvement target:

A formal assessment record is incomplete if it omits the three level scores, the uniform final score, task type, assistance level, assessment outcome for scored atomic attempts, source/coverage fields for migrated records, or attempt-linkage fields for retries.

# 19. Example Domain/Role Mapping

> Task: Debug incorrect intent metric aggregation  
> Task type: Debugging  
> Difficulty: 4/5  
>   
> Technical domains:  
> - Python: 60%  
> - ML evaluation: 25%  
> - Data engineering: 15%  
>   
> Role evidence:  
> - MLE: 70%  
> - DS: 20%  
> - SWE: 10%  
>   
> Interpretation:  
> The task strongly informs MLE readiness, moderately informs DS evaluation judgment,  
> and provides limited SWE debugging evidence. It does not materially inform React,  
> Spring, or frontend readiness.

# 20. Grading Principles

- Grade demonstrated behavior, not potential.

- Do not award points for effort.

- Do not reward terminology without mechanism.

- Do not assume missing evidence is favorable.

- Honest uncertainty is better than confident error.

- A correct answer does not prove sound reasoning.

- Passing tests do not prove the tests are meaningful.

- Project size does not prove ownership.

- Career transition does not lower the bar.

- Difficulty is assigned before performance whenever possible.

- A difficult task solved with heavy assistance does not prove independence.

- A simple task cannot establish seniority by itself.

- Stop pursuing disproved theories immediately.

- Prefer contract-level fixes over symptom patches.

- Always report all three level scores for every answer.

- Do not average the Level I, Level II, and Level III scores.

- Do not let a low-level problem establish higher-level readiness.

- Use the problem level to cap qualifying evidence, not to suppress developmental scoring.

- Version rubric changes explicitly.

# 21. Progress Tracker Record Contract

This section defines the machine-readable record accepted by the progress tracker. It is controlling for any grader that creates or exports an assessment record.

## 21.1 Descriptor-Density, Coverage, and Anti-Sparsity Instruction

Use as many supported descriptors as the evidence truthfully allows. Populate every accepted field whenever the assessment contains enough evidence to do so. Prefer specific domain labels, multiple applicable weakness tags, complete gate results, exact source fields, attempt-linkage fields, and concrete strength, weakness, and next-target descriptions over sparse or generic entries.

Do not omit a field merely to make the record shorter. Omit or leave a field empty only when the evidence is genuinely unavailable, not applicable, or cannot be inferred reliably. Never invent evidence to fill a field.

Descriptor density improves filtering, radar charts, history detail, weakness analysis, migration audits, role coverage, and longitudinal progress tracking. Factual accuracy remains the controlling requirement.

### Required density rules

- Record every assessable attempt as its own atomic entry unless explicitly excluded.
- Use source and coverage fields for every migrated or retrospective entry.
- Use attempt-linkage fields for every retry, assisted retry, final retry, or retention retest.
- Include every supported weakness tag, knowledge-gap tag, and gap type that identifies a distinct issue.
- Include exact coding metadata for every coding attempt when available.
- Include `expectedElements`, `presentElements`, and `missingElements` whenever a task has a recognizable answer key, rubric, pattern, or expected mechanism.
- Include proof-strength and anti-inflation checks when the assessment may be used for career-readiness claims.

### Anti-sparsity validation

A formal tracker export should flag entries that lack:

- `assessmentId`
- `date`
- `task`
- `taskType`
- `difficulty`
- `assistanceLevel`
- all three `levelScores`
- `gates`
- `sourceFile` for migrated entries
- `attemptGroupId` and `attemptNumber` for retries
- `problemName` for coding entries
- `weaknessTags` or an explicit note that no weakness was observed
- `knowledgeGapTags` or an explicit note that no specific knowledge gap was inferable

## 21.2 Full Accepted Record

```json
{
  "assessmentId": "2026-06-19-valid-anagram-01",
  "sessionId": "2026-06-19-dsa-drill",
  "parentAssessmentId": null,
  "attemptGroupId": "valid-anagram-2026-06-19",
  "attemptNumber": 1,
  "attemptType": "initial",
  "priorAssessmentId": null,
  "sourceFile": "technical_competency_all_answers_graded.json",
  "sourceItemId": "2026-06-19-03",
  "coverageStatus": "included",
  "coverageNotes": "Visible candidate Java attempt with implementation evidence.",
  "assessmentOutcome": "Demonstrated",
  "conceptDiscovery": {
    "conceptKnownBeforeAnswer": true,
    "vocabularyKnown": true,
    "reasoningAttempted": true,
    "firstPrinciplesSignal": "Weak",
    "underlyingModelSignal": "Partial",
    "teachingNeed": "Mechanism refinement",
    "candidateFraming": "Candidate attempted a deletion-based implementation.",
    "notes": "The concept of comparing anagrams was attempted, but the frequency invariant was not preserved."
  },

  "date": "2026-06-19",
  "task": "LeetCode 242 Valid Anagram — deletion-based Java implementation",
  "taskType": "coding",
  "secondaryTaskSignals": ["knowledge"],
  "problemName": "Valid Anagram",
  "platform": "LeetCode",
  "codingPattern": "frequency counting / string comparison",
  "primaryDataStructure": "String / char counts intended",
  "algorithmicInvariant": "Each character count in s must equal the corresponding count in t.",
  "complexityClaimed": "not stated",
  "complexityCorrect": false,
  "compileStatus": "does not compile",
  "testStatus": "not run",
  "edgeCasesCovered": ["length mismatch"],
  "edgeCasesMissed": ["duplicate letters", "unequal frequencies", "regex replacement semantics"],

  "domain": "Java / Algorithms and Data Structures",
  "primaryDomain": "Java",
  "secondaryDomains": ["Algorithms/DSA"],
  "domainContributionWeights": {"Java": 0.6, "Algorithms/DSA": 0.4},
  "difficulty": 2,
  "targetLevel": "L1",
  "problemLevel": "L1",
  "difficultyAttributeScore": 5,
  "difficultyRationale": "Bounded string/counting problem with local implementation requirements.",
  "difficultyAssignment": "Retrospectively estimated",
  "assistanceLevel": 0,
  "coachingBetweenAttempts": false,
  "autonomyConfidence": "Partially verified",

  "universalSubScores": {
    "correctness": 5,
    "reasoning": 8,
    "judgment": 4,
    "validation": 0,
    "communication": 8,
    "completeness": 5
  },
  "universalScore": 30,
  "taskSpecificSubScores": {
    "functionalCorrectness": 5,
    "algorithmDataStructureChoice": 6,
    "complexityAnalysis": 2,
    "edgeCases": 6,
    "codeQuality": 4,
    "verification": 0
  },
  "taskSpecificScore": 26,
  "rawScore": 28.4,
  "cap": null,
  "capReasons": [],
  "penalties": 0,
  "penaltyReasons": [],
  "finalScore": 28.4,

  "levelScores": {"L1": 35, "L2": 18, "L3": 8},
  "levelVerdicts": {"L1": "Fail", "L2": "Fail", "L3": "Fail"},
  "answerLevel": "Below Level I",
  "qualifyingDemonstratedLevel": "Below Level I",
  "demonstratedLevel": "Below Level I",
  "confidence": "High",

  "weaknessTags": [
    "Incorrect reasoning",
    "Incomplete execution",
    "Validation gap",
    "Edge-case gap"
  ],
  "knowledgeGapTags": [
    "Java String immutability",
    "String.replaceFirst argument and return behavior",
    "Frequency-count invariant for anagrams",
    "Regex semantics in string replacement"
  ],
  "gapTypes": ["Conceptual gap", "Mechanism gap", "Verification gap"],
  "proposedNewTags": [],

  "expectedElements": [
    "Checks equal length",
    "Counts characters or otherwise preserves frequency invariant",
    "Handles duplicate letters",
    "Returns false for unequal frequencies",
    "Compiles",
    "States time and space complexity",
    "Runs representative tests"
  ],
  "presentElements": ["Checks equal length"],
  "missingElements": [
    "Counts characters or otherwise preserves frequency invariant",
    "Handles duplicate letters",
    "Returns false for unequal frequencies",
    "Compiles",
    "States time and space complexity",
    "Runs representative tests"
  ],
  "elementSource": "Rubric-derived",

  "gates": {
    "Correctness": "Fail",
    "Relevance": "Pass",
    "Independent explanation": "Pass",
    "Evidence": "Fail",
    "Safety and integrity": "Pass",
    "Completion": "Fail"
  },

  "strengths": "Included a correct early length check and formed a plausible high-level idea.",
  "weaknesses": "The submitted code did not compile and did not preserve the anagram frequency invariant.",
  "nextTarget": "Implement a frequency-count solution from a blank file, compile it, and test duplicates and unequal frequencies.",
  "loggingMode": "full",

  "evidenceSource": ["written answer"],
  "assessmentMode": {
    "mode": "written",
    "timeLimitMinutes": null,
    "notesAllowed": null,
    "followUpsAsked": 0,
    "pressureLevel": "Low"
  },
  "probeReadiness": {
    "firstAnswer": "Fail",
    "oneFollowUp": "Fail",
    "deepFollowUp": "Fail",
    "likelyFailurePoint": "Cannot produce compiling implementation or explain frequency invariant."
  },
  "proofStrength": {
    "score": 0.3,
    "basis": ["candidate answer exists"],
    "missingProof": ["compilation", "tests", "verbal explanation", "retest"]
  },
  "antiInflationChecks": {
    "overclaimRisk": "High",
    "productionClaimSafe": false,
    "ownershipClaimSafe": true,
    "llmDependencyRisk": "Unknown",
    "notes": "This attempt should be counted as coding evidence but not as coding readiness."
  },

  "calibrationAnchors": [
    {
      "calibrationAnchorId": "coding-valid-anagram-noncompiling-l1-fail",
      "taskType": "coding",
      "problemLevel": "L1",
      "difficulty": 2,
      "expectedLevelScores": {"L1": 35, "L2": 18, "L3": 8},
      "anchorReason": "Non-compiling Valid Anagram attempt with incorrect invariant.",
      "matchQuality": "Strong"
    }
  ],
  "scoreUncertainty": {
    "range": [25, 35],
    "reason": "Written code evidence is visible, but no live follow-up or compiler transcript is available.",
    "confidenceLimiters": ["written-only evidence", "no follow-up probing"]
  },
  "gapRecurrence": {
    "isRecurring": false,
    "priorOccurrences": 0,
    "lastOccurrenceDate": null,
    "worsening": false,
    "pattern": ""
  },
  "transferSignal": {
    "sourceConcept": "frequency-count invariant",
    "transferredTo": [],
    "transferQuality": "None",
    "notes": "No evidence yet that the invariant transfers to other counting problems."
  },
  "assessmentQuality": {
    "promptClarity": "High",
    "expectedElementsDefinedBeforeAnswer": false,
    "gradingConfidenceLimitedByPrompt": false,
    "notes": "Problem requirements are standard for LeetCode Valid Anagram."
  },
  "recoveryBehavior": {
    "acknowledgedUncertainty": false,
    "reasonedFromFirstPrinciples": true,
    "askedClarifyingQuestion": false,
    "avoidedFabrication": true,
    "recoveryQuality": "Partial"
  },
  "scoreLiftActions": {
    "toPassNextLevel": [
      "Use a character-frequency map or fixed alphabet count array",
      "Explain the frequency invariant",
      "Compile the Java solution",
      "Run duplicate-letter and unequal-frequency tests"
    ],
    "estimatedLift": {"L1": "+35"}
  }
}
```

## 21.3 Accepted Fields and Omission Behavior

| Field | Accepted type or structure | If omitted |
|---|---|---|
| `assessmentId` | Stable string ID unique across tracker | Required for formal records; without it, linking, dedupe, and migration validation are unreliable. |
| `sessionId` | String or `null` | Session grouping unavailable. |
| `parentAssessmentId` | String or `null` | Parent/child relationship unavailable. |
| `attemptGroupId` | String or `null` | Retrying and retention tracking unavailable. Required for retries. |
| `attemptNumber` | Integer or `null` | Attempt order unavailable. Required when `attemptGroupId` is present. |
| `attemptType` | Controlled string | Defaults to `initial`; required for retries, parent sessions, and rollups. |
| `priorAssessmentId` | String or `null` | Direct retry linkage unavailable. |
| `sourceFile` | String or `null` | Required for migrated or retrospective entries; source traceability unavailable if omitted. |
| `sourceItemId` | String or `null` | Source-local traceability unavailable. |
| `coverageStatus` | Controlled string | Defaults to `included`; required for coverage audits. |
| `coverageNotes` | String | Defaults to empty. Use for migrated/excluded/suspected-missing records. |
| `secondaryTaskSignals` | Array of controlled task-type strings | Defaults to empty array. |
| `problemName` | String | Required for coding records when known; coding problem rollups degrade if omitted. |
| `platform` | String | Defaults to empty. Useful for LeetCode/HackerRank/CodeSignal/source tracking. |
| `codingPattern` | String | Defaults to empty. Required for coding diagnostics when inferable. |
| `primaryDataStructure` | String | Defaults to empty. Required for coding diagnostics when inferable. |
| `algorithmicInvariant` | String | Defaults to empty. Required for coding diagnostics when inferable. |
| `complexityClaimed` | String | Defaults to empty. |
| `complexityCorrect` | Boolean or `null` | Defaults to `null`. |
| `compileStatus` | Controlled string | Defaults to `unknown`; required for coding when code was submitted. |
| `testStatus` | Controlled string | Defaults to `unknown`; required for coding/debugging when test evidence exists. |
| `edgeCasesCovered` | Array of strings | Defaults to empty array. |
| `edgeCasesMissed` | Array of strings | Defaults to empty array. |
| `date` | String, preferably `YYYY-MM-DD` | Entry loses reliable chronological placement; treat as required for normal records. |
| `task` | String | Entry lacks a useful history label; treat as required for normal records. |
| `taskType` | Controlled string | Entry cannot be grouped reliably by assessment type; treat as required for normal records. |
| `domain` | String | Defaults to an empty string. |
| `difficulty` | Integer `1`–`5` | Entry cannot be difficulty-calibrated; treat as required for a useful progress record. |
| `targetLevel` | `L1`, `L2`, or `L3` | Target-level comparison is unavailable. |
| `assistanceLevel` | Integer `0`–`5` | Autonomy cannot be evaluated reliably; treat as required for a useful progress record. |
| `universalSubScores` | Object containing the six universal dimensions | Radar does not render for that entry. |
| `universalScore` | Number `0`–`100` | Computed from `universalSubScores` if all six are present; otherwise `0`. |
| `taskSpecificScore` | Number `0`–`100` | Raw-score calculation lacks the task-specific component; provide it for full records. |
| `rawScore` | Number | Computed as `universalScore × 0.60 + taskSpecificScore × 0.40`. |
| `cap` | Number or `null` | Defaults to `null`, meaning no cap. |
| `penalties` | Number | Defaults to `0`. |
| `finalScore` | Number `0`–`100` | **Required in every emitted record, including `loggingMode: "fast"` (rev 2).** If omitted, the importer computes `rawScore − penalties` (capped when `cap` is not `null`) — and when the supporting scores were also omitted this silently evaluates to `0`, poisoning averages, pass rates, and score histograms. Never omit. |
| `levelScores` | Object with `L1`, `L2`, and `L3` scores | All three default to `null`. |
| `demonstratedLevel` | Controlled string | Displays `—` in history. |
| `confidence` | `High`, `Medium`, or `Low` | Displays `—` in history. |
| `weaknessTags` | Array of controlled strings | Defaults to an empty array. |
| `gates` | Object mapping gate names to controlled results | Defaults to empty; no gate badges are shown. |
| `strengths` | String | Defaults to an empty string. |
| `weaknesses` | String | Defaults to an empty string. |
| `nextTarget` | String | Defaults to an empty string. |
| `loggingMode` | `fast` or `full` | Defaults to `full` for backward compatibility. Supersedes the earlier undocumented `quickLog` boolean (§17.35): `quickLog: true` in pre-v1.11 records maps to `loggingMode: "fast"`; `quickLog: false` or absent maps to `full`. Do not emit `quickLog` in new records. |
| `knowledgeGapTags` | Array of strings | Defaults to an empty array. |
| `gapTypes` | Array of controlled strings | Defaults to an empty array. |
| `proposedNewTags` | Array of proposed tag objects | Defaults to an empty array; noncanonical missing concepts are not reviewable. |
| `expectedElements` | Array of strings | Defaults to an empty array. |
| `presentElements` | Array of strings | Defaults to an empty array. |
| `missingElements` | Array of strings | Defaults to an empty array. |
| `elementSource` | Controlled string | Defaults to unknown. |
| `probeReadiness` | Object with first answer, follow-up, deep follow-up, and likely failure point | Probe-depth prediction is unavailable. |
| `evidenceSource` | Array of controlled strings | Evidence-origin filtering is unavailable. |
| `retention` | Object tracking repeated attempts and score deltas | Retention cannot be assessed. |
| `llmIndependence` | Object tracking LLM use and five-pass status | Independence evidence is incomplete. |
| `roleRequirementCoverage` | Object mapping evidence to a target role | Role-specific requirement coverage is unavailable. |
| `artifactReadiness` | Object tracking project or artifact proof state | Portfolio readiness cannot be evaluated. |
| `staleness` | Object tracking last practice and refresh need | Currentness cannot be evaluated. |
| `gapClosureStatus` | Object tracking whether a weakness is open, closed, or reopened | Gap closure cannot be tracked. |
| `priority` | Object describing severity, urgency, role impact, next action type, and recommended action | Next action must be inferred manually. |
| `gapImpact` | Object describing blocking status, blocked roles, blocked level, and reason | Blocking vs non-blocking gaps cannot be separated. |
| `assessmentMode` | Object describing assessment mode, time limit, notes, follow-ups, and pressure | Evidence conditions are unclear. |
| `calibration` | Object describing evaluator type, human review, real interview signal, and calibration confidence | Score source trust cannot be weighted. |
| `retestPlan` | Object containing retest date, prompt, and success criteria | Gap closure is less testable. |
| `roleReadinessRollup` | Object summarizing readiness for a target role | Role-level decision support is unavailable. |
| `proofStrength` | Object with 0.00–1.00 proof score, basis, and missing proof | Evidence strength cannot be distinguished from score. |
| `antiInflationChecks` | Object checking overclaim risk, production-claim safety, ownership-claim safety, and LLM dependency risk | Overclaim risk is not tracked. |
| `calibrationAnchors` | Array of calibration-anchor comparison objects | Grader consistency cannot be audited against examples. |
| `scoreUncertainty` | Object with plausible score range, reason, and confidence limiters | Score precision may be overstated. |
| `gapRecurrence` | Object tracking whether a gap has appeared before | Repeated gaps cannot be distinguished from first-time misses. |
| `transferSignal` | Object tracking concept transfer across contexts | Generalization evidence is unavailable. |
| `retestQueue` | Rollup/planning object with due-now, due-soon, and blocked-by items | Practice scheduling must be inferred manually. |
| `assessmentQuality` | Object describing prompt clarity and assessment-control limitations | Candidate weakness may be conflated with prompt weakness. |
| `roleReadinessEvidenceFloor` | Object comparing minimum evidence requirements to current evidence | Role readiness can be overestimated from thin evidence. |
| `recoveryBehavior` | Object tracking uncertainty handling and first-principles recovery | Interview recovery signal is unavailable. |
| `scoreLiftActions` | Object listing concrete actions needed to pass the next level | Feedback remains descriptive instead of operational. |
| `trackerHealth` | Rollup/migration object measuring tracker completeness and schema hygiene | Tracker trustworthiness cannot be audited. |

## 21.4 Valid Values

### `taskType`

- `coding`
- `debugging`
- `knowledge`
- `sysdesign`
- `prodeng`
- `walkthrough`
- `behavioral`
- `analyticsCase`



### `attemptType`

- `initial`
- `retry`
- `assisted_retry`
- `post_coaching_retry`
- `final_retry`
- `retention_retest`
- `session_parent`
- `rollup`

### `coverageStatus`

- `included`
- `excluded`
- `suspected_missing`
- `duplicate_linked`
- `rollup_only`

### `compileStatus`

- `compiles`
- `does not compile`
- `not applicable`
- `not checked`
- `unknown`

### `testStatus`

- `passed`
- `failed`
- `not run`
- `not applicable`
- `unknown`

### `targetLevel`

- `L1`
- `L2`
- `L3`

### `assistanceLevel`

Integer from `0` through `5`.

### `difficulty`

Integer from `1` through `5`.

### `confidence`

- `High`
- `Medium`
- `Low`

### `demonstratedLevel`

- `Below Level I`
- `Emerging Level I`
- `Level I`
- `Strong Level I`
- `Level II`
- `Strong Level II`
- `Level III`
- `Strong Level III`

### `weaknessTags`

Use only canonical weakness tags from §17.21.3 after alias normalization.

- `Mechanism gap`
- `Thin tradeoff analysis`
- `Incomplete execution`
- `Insufficient evidence`
- `Incorrect reasoning`
- `Confident false claim`
- `Terminology imprecision`
- `Scope boundary missed`
- `Failure handling gap`
- `Validation gap`
- `Edge-case gap`
- `Complexity analysis missing`
- `Overprompted answer`
- `Ownership unclear`
- `Application gap`
- `Interview phrasing gap`
- `Definition gap`
- `Implementation detail gap`

### `knowledgeGapTags`

Use only canonical knowledge-gap tags from §17.21.6 after alias normalization. If no canonical label fits, use `proposedNewTags` rather than emitting a new value directly.

### `gapTypes`

Use only canonical gap types from §17.21.5 after alias normalization.

- `Conceptual gap`
- `Mechanism gap`
- `Application gap`
- `Tradeoff gap`
- `Verification gap`
- `Autonomy gap`
- `Communication gap`
- `Recall gap`
- `Scope gap`
- `Evidence quality gap`
- `Requirements translation gap`

### `gates` values

- `Pass`
- `Partial`
- `Fail`

### Diagnostic field values

`gapTypes`: `Conceptual gap`, `Mechanism gap`, `Application gap`, `Tradeoff gap`, `Recall gap`, `Verification gap`, `Autonomy gap`, `Communication gap`, `Scope gap`, `Evidence quality gap`, `Requirements translation gap`.

`loggingMode`: `fast`, `full`.

`priority.roleWeightTier`: `Primary`, `Secondary`, `Tertiary`.

`proposedNewTags.tagClass`:

- `weaknessTags`
- `knowledgeGapTags`
- `gapTypes`

`elementSource`: `Predefined`, `Rubric-derived`, `Retrospective evaluator-derived`, `Role-requirement-derived`.

`probeReadiness.firstAnswer`, `probeReadiness.oneFollowUp`, and `probeReadiness.deepFollowUp`: `Pass`, `Uncertain`, `Fail`.

`evidenceSource`: `verbal answer`, `written answer`, `live coding`, `take-home coding`, `repo code`, `test results`, `debugging transcript`, `project walkthrough`, `mock interview`, `real interview feedback`, `commit history`, `README or design doc`, `production artifact`, `metric or dashboard`, `human evaluator feedback`.

`llmUseType`: `none`, `concept explanation`, `error interpretation`, `approach exploration`, `logic review`, `code generation`, `test generation`, `answer drafting`, `README or documentation drafting`, `refactoring suggestion`, `debugging suggestion`.

`artifactType`: `portfolio project`, `repo feature`, `README`, `design doc`, `demo script`, `runbook`, `dashboard`, `ETL pipeline`, `RAG workflow`, `Spring Boot service`, `React UI`, `modeling notebook`, `data pipeline`, `behavioral story`.

`readinessStage`: `idea`, `in-progress`, `works locally`, `tested`, `documented`, `demo-ready`, `portfolio-ready`, `interview-defensible`, `production-shaped`, `production-deployed`.

`stalenessRisk`: `Low`, `Medium`, `High`, `Unknown`.

`gapClosureStatus.status`: `open`, `in progress`, `closed`, `reopened`, `not applicable`.

`priority.severity`: `Low`, `Medium`, `High`, `Critical`.

`priority.urgency` and `priority.roleImpact`: `Low`, `Medium`, `High`.

`priority.nextActionType`: `study`, `rebuild`, `retest`, `mock interview`, `project work`, `documentation`, `ignore for now`.

`gapImpact.blocksLevel`: `L1`, `L2`, `L3`, `None`.

`assessmentMode.mode`: `written`, `verbal`, `live coding`, `debugging session`, `project walkthrough`, `mock interview`, `real interview`.

`assessmentMode.pressureLevel`: `Low`, `Medium`, `High`.

`calibration.evaluatorType`: `self`, `AI grader`, `peer`, `senior engineer`, `recruiter`, `hiring manager`, `real interviewer`.

`calibration.calibrationConfidence`: `Low`, `Medium`, `High`.

`roleReadinessRollup.readiness`: `Not ready`, `Emerging`, `Interviewable with risk`, `Interviewable`, `Strong fit`.

`proofStrength.score`: decimal number from `0.00` through `1.00`.

`antiInflationChecks.overclaimRisk` and `antiInflationChecks.llmDependencyRisk`: `Low`, `Medium`, `High`, `Unknown`.

`calibrationAnchors.matchQuality`: `Weak`, `Partial`, `Strong`.

`scoreUncertainty.range`: two-number array `[low, high]` where both values are `0` through `100`.

`transferSignal.transferQuality`: `None`, `Weak`, `Partial`, `Strong`.

`assessmentQuality.promptClarity`: `Low`, `Medium`, `High`.

`recoveryBehavior.recoveryQuality`: `None`, `Weak`, `Partial`, `Strong`.

`trackerHealth.overallHealth`: `Good`, `Warning`, `Critical`, `Unknown`.



### `universalSubScores` maximums

| Subscore | Maximum |
|---|---:|
| `correctness` | 25 |
| `reasoning` | 20 |
| `judgment` | 15 |
| `validation` | 15 |
| `communication` | 15 |
| `completeness` | 10 |

The six universal subscores total `100`. Values must stay within the stated maximum for each dimension.

## 21.5 Calculation Order

1. Use the supplied `universalScore` when present.
2. Otherwise, sum all six `universalSubScores` when all are present.
3. If neither condition is met, use `0` for `universalScore`.
4. Use the supplied `rawScore` when present; otherwise compute `universalScore × 0.60 + taskSpecificScore × 0.40`.
5. Subtract `penalties`, which default to `0`.
6. When `cap` is a number, set `finalScore` to the lower of the post-penalty score and the cap.
7. When `cap` is `null`, do not cap the score.
8. Use the supplied `finalScore` when an authoritative final value has already been calculated and validated.
9. Grader obligation (rev 2): steps 1–8 describe how an *importer* recovers from missing fields; they are not permission to omit them. A grader must always emit `finalScore` explicitly (and the supporting `universalScore`/`taskSpecificScore` chain in `full` mode) so the importer never has to fall back to a degenerate computed value.
10. Validate diagnostic fields when present.
10. Do not allow `knowledgeGapTags`, `gapTypes`, `focusAreas`, `expectedElements`, or evidence volume to increase a score.
11. Use diagnostic fields to select next practice targets, track retention, and update role-readiness coverage.
12. Use staleness and retest data to decide whether an old passing score remains current.

## 21.6 Minimum Viable Progress Entry

The minimum viable entry that produces a useful Progress tab contains. This is not sufficient for a formal migration, retry chain, or retrospective coverage audit:

```json
{
  "assessmentId": "2026-06-19-lru-cache-01",
  "date": "2026-06-19",
  "task": "Implement LRU Cache",
  "taskType": "coding",
  "assistanceLevel": 0,
  "difficulty": 3,
  "finalScore": 78.4
}
```

Everything else enriches the radar, filters, history detail, level analysis, gate display, and weakness tracking. For formal grading, use the full record rather than the minimum entry whenever the evidence exists.

# 22. Validation Gates for Scoring, Migration, and Tracker Export

A grading or migration output must pass these validation gates before it is considered usable.

## 22.1 Assessment-Level Validation

Each formal assessment must include:

- `assessmentId`
- `date`
- `task`
- `taskType`
- `problemLevel`
- `difficulty`
- `assistanceLevel`
- `levelScores.L1`
- `levelScores.L2`
- `levelScores.L3`
- `finalScore`
- `answerLevel`
- `qualifyingDemonstratedLevel`
- all mandatory gates
- strengths, weaknesses, and next target
- `calibration.graderModel` when `calibration.evaluatorType` is `AI grader`

For coding assessments, also require `problemName` when known and `compileStatus` / `testStatus` when implementation evidence exists.

## 22.2 Migration-Level Validation

Each migration must include:

- a coverage ledger
- task-type distribution before and after migration
- count of observed assessment-like items
- count of migrated assessment records
- exclusion list with reasons
- suspected-missing list
- duplicate handling notes
- validation summary

A migration can be schema-valid and still fail migration validation if the coverage ledger shows missing or collapsed attempts.

## 22.3 Distribution Sanity Checks

Flag the tracker for review when:

- a known coding drill produces fewer coding records than known attempted problems
- a multi-problem session has no child assessments
- retries overwrite prior attempts
- many records have `taskType` missing or normalized to one broad category
- most entries have empty `weaknessTags` or empty `knowledgeGapTags` without explicit explanation
- many retrospective entries lack `sourceFile`
- high scores have low proof strength and no anti-inflation notes
- Level II/III claims are based mostly on Level I problem levels

## 22.4 User-Correction Rule

If the candidate reports that an observed attempt, problem, bug, or answer is missing from the tracker, treat that report as a tracker defect until the source evidence proves otherwise.

The correct response is not to defend the existing distribution. The correct response is to run a coverage audit, identify whether the attempt was missed, collapsed, excluded, duplicated, or not recoverable, and then update the tracker or ledger accordingly.

## 22.5 Hard Failure Conditions

A scoring output is invalid when:

- it lacks any of the three level scores
- it lacks the uniform `finalScore` (any logging mode)
- it collapses multiple assessable coding problems into one record without child entries
- it overwrites retries instead of preserving linked attempts
- it omits coverage audit data for a bulk migration
- it uses tags to inflate scores
- it uses role/domain mapping to raise answer quality
- it claims qualifying Level II/III evidence despite assistance or problem-level caps that prohibit it
- it hides low-confidence or missing evidence behind polished summaries

# 23. Version Control

Once an evaluation begins, the rubric cannot be changed to alter the result. Changes apply only to future assessments unless earlier attempts are formally rescored under the new version.

> Rubric version: 1.11  
> Difficulty model version: 1.0  
> Domain/role evidence model version: 1.1  
> Three-score answer model version: 1.0  
> Mandatory grader output contract version: 1.0  
> Progress tracker record contract version: 1.7  
> Diagnostic progress model version: 1.0  
> Knowledge gap taxonomy version: 1.1  
> Retention and LLM independence model version: 1.0  
> Role requirement coverage model version: 1.0  
> Artifact readiness model version: 1.0
> Prioritization and retest planning model version: 1.0  
> Calibration and proof-strength model version: 1.0  
> Anti-inflation control model version: 1.0  
> Assessment extraction and coverage contract version: 1.0  
> Coding-attempt granularity model version: 1.0  
> Migration coverage audit model version: 1.0  
> Tagging-density and anti-sparsity model version: 1.0
> Controlled label set version: 1.11-labels.2026-07-03
> Label alias-normalization model version: 1.0
> Proposed-new-tag escape hatch version: 1.0  
> Concept discovery outcome model version: 1.0  
> Decision quality layer version: 1.0  
> Calibration anchor model version: 1.0  
> Score uncertainty model version: 1.0  
> Gap recurrence and transferability model version: 1.0  
> Role readiness evidence floor model version: 1.1  
> Recovery behavior model version: 1.0  
> Tracker health model version: 1.0
> Task-type taxonomy version: 1.1
> Role weighting and priority multiplier model version: 1.0
> Logging mode (fast/full) model version: 1.0
> Schema-doc parity rule version: 1.0
> BIE/BIA role model version: 1.0
> Import-parity patch revision: 2 (2026-07-14)


# 24. Version 1.9.1 Hardening Changelog

Version 1.9.1 was a hardening release. It does not change the Level I / II / III standards. It strengthens extraction, coverage, tagging, and tracker validation so that correct scoring cannot coexist with missing attempts.

Changes:

- Added a mandatory assessment extraction and coverage contract.
- Added one-record-per-coding-problem-attempt rule.
- Added retry preservation and linked-attempt requirements.
- Added parent session / child assessment rules.
- Added coverage ledger requirement for migrations and retrospective imports.
- Added anti-collapse rules to prevent multi-problem sessions from becoming one vague assessment.
- Added task-type normalization rules so failed coding attempts remain coding attempts.
- Added retrospective coverage audit schema and exclusion reasons.
- Added atomic attempt tracking and rollup rules.
- Added task-type distribution sanity checks.
- Added precise tagging-density and anti-noise rules.
- Added required coding diagnostic fields.
- Expanded the standard assessment record with source, coverage, retry, and coding metadata.
- Added validation gates for assessment records, migration outputs, and tracker exports.
- Added hard failure conditions for schema-valid but coverage-invalid outputs.

The intended behavioral change is simple: **score every real attempt, preserve every retry, tag every supported diagnostic signal, and prove migration coverage instead of assuming it.**


# 25. Version 1.9.2 Controlled Tag Set Patch Changelog

Version 1.9.2 applies the controlled diagnostic label set patch.

Changes:

- Added canonical-only rules for `weaknessTags`, `knowledgeGapTags`, and `gapTypes`.
- Added `labelSetVersion`.
- Added `proposedNewTags` as the only valid escape hatch for noncanonical labels.
- Added canonical weakness tags with definitions and default severities.
- Added canonical gap types.
- Added domain-grouped canonical knowledge-gap tags.
- Added alias normalization maps for historical and generated tag variants.
- Added retired weakness-tag handling.
- Updated examples to avoid retired weakness tags.
- Added schema-patch guidance for `labelSetVersion` and `proposedNewTags`.
- Added validation rules that reject retired or noncanonical formal-record labels unless they are normalized or proposed for review.

The intended behavioral change is simple: **tag richly, but tag canonically. Use the narrowest accurate label, normalize aliases, avoid padding, and propose new labels explicitly instead of letting tag drift reappear.**

# 26. Version 1.9.3 Concept Discovery Outcome Tracking Changelog

Version 1.9.3 adds explicit tracking for the middle state between “known concept, answer attempted” and “missing concept, no answer.”

Changes:

- Added `assessmentOutcome` with accepted values: `Demonstrated`, `Partial discovery`, and `Concept discovery`.
- Added `conceptDiscovery` as an optional diagnostic object for concept familiarity, vocabulary familiarity, reasoning attempt, first-principles signal, underlying model signal, teaching need, candidate framing, and notes.
- Added scoring guidance so `Partial discovery` earns reasoning signal without being treated as full concept mastery.
- Added distinction between vocabulary gaps, shallow conceptual gaps, and true concept absence.
- Added validation rules requiring scored atomic assessments to include `assessmentOutcome` going forward.
- Updated the standard assessment record to include assessment outcome and concept-discovery details.

The intended behavioral change is simple: **do not score “I do not know” the same as “I do not know the term, but here is my reasoned guess.” Track first-principles reasoning under uncertainty as its own interview-readiness signal.**


# 27. Version 1.10 Decision Quality, Calibration, and Readiness Trust Changelog

Version 1.10 does not change the Level I / II / III scoring standards. It adds decision-quality fields that make progress tracking more accurate and less overconfident.

Added:

- `calibrationAnchors`
- `scoreUncertainty`
- `gapRecurrence`
- `transferSignal`
- `retestQueue`
- `assessmentQuality`
- `roleReadinessEvidenceFloor`
- `recoveryBehavior`
- `scoreLiftActions`
- `trackerHealth`

Primary intent:

- reduce grader drift through calibration anchors;
- avoid false precision through score ranges;
- identify recurring gaps after feedback;
- distinguish local knowledge from transferable understanding;
- prevent role readiness from being inferred from thin evidence;
- capture interview recovery behavior under uncertainty;
- convert feedback into concrete score-lift actions;
- audit whether the tracker itself is healthy enough to trust.

# 28. Version 1.11 Role-Weighted, Schema-Enforced, BI-Aware Longitudinal Tracking Changelog

Version 1.11 does not change the Level I / II / III scoring standards. It closes a schema/documentation drift gap, gives BIE/BIA a real (if intentionally lighter) evidence model, differentiates target-role priority so a flat role list stops masking which gaps matter right now, adds a dedicated task type for the BI/DS case-study interview format, and adds a sustainable logging mode for use across a multi-month search rather than a single sprint.

Added:

- `analyticsCase` task type, with classification rules (§5.1) and an `expectedElements` worked template (§17.3) for the business-question-to-recommendation interview arc.
- BIE and BIA rows in the Role Competency Taxonomy (§9.3), with initial sub-competency weights.
- BIE and BIA in the role-scores tracking layer (§16) and in `roleRequirementCoverage` recommended target roles (§17.8).
- Numeric worked `roleReadinessEvidenceFloor` examples for MLE II, DS II, DE, BI Engineer I/II, and Business Intelligence Analyst (§17.30), matching the treatment SWE II already had.
- `Requirements translation gap` as a canonical `gapType` (§17.2, §17.21.5), distinct from `Communication gap`, for the specific failure of not scoping an ambiguous business ask.
- A Business Intelligence and Analytics Communication `knowledgeGapTags` cluster (§17.21.6): semantic layer vs. raw query, measure vs. dimension, dashboard vs. ad hoc analysis, BI-tool aggregate vs. row-level calculation, executive summarization, stakeholder-ask scoping, metric ownership, self-serve vs. analyst-gated reporting.
- `priority.roleWeightTier` (§17.34) and a maintained Primary/Secondary/Tertiary role weight table, so `roleImpact` and next-action ranking reflect which target roles are actually active rather than treating every tracked role equally.
- `loggingMode` (`fast` / `full`) (§17.35) as an explicit sustainability control for logging cost across a multi-month search, distinct from and not motivated by any single sprint's time pressure.
- A schema-doc parity rule (§17.36) requiring every future rubric-documented diagnostic addition to ship a matching JSON Schema definition in the same version.

Fixed:

- The JSON Schema previously left roughly a dozen diagnostic objects documented in this rubric — including `priority`, `gapImpact`, `artifactReadiness`, `staleness`, `gapClosureStatus`, `roleRequirementCoverage`, `probeReadiness`, `evidenceSource`, `retention`, `llmIndependence`, `assessmentMode`, `calibration`, and the `expectedElements` cluster — entirely untyped under `additionalProperties: true`. All now have full property, type, and enum definitions in `progress_tracker_record_schema_v1_11.json`.
- A latent conditional-validation bug: the `attemptType`-based `if` clause in the schema's `allOf` block had no `required` guard, so it vacuously matched any record that omitted `attemptType` entirely and wrongly forced `attemptGroupId`/`attemptNumber` as required. Any minimal valid record without an explicit `attemptType` was failing schema validation under v1.9.x/v1.10. The `if` clause now requires `attemptType` to be present before its `then` branch applies.
- An undocumented `quickLog` boolean had appeared in the standard record example with no rubric section, no schema type, and no rule explaining its effect on required fields — a second instance of the same doc/schema drift this version otherwise fixes. Consolidated into the fully-specified `loggingMode` field (§17.35); `quickLog` is deprecated and should not appear in new records.

Primary intent:

- make BIE/BIA a real, evidence-backed secondary/tertiary track instead of a single free-text mention;
- stop treating every tracked target role as equally live when ranking what to work on next;
- give the BI/DS case-study interview format its own honest classification instead of stretching `sysdesign` or `knowledge` to cover it;
- make the JSON Schema actually enforce what the rubric has claimed was mandatory since v1.9.1;
- make logging cost sustainable across the full length of a job search, not just the current leave sprint.

# 29. Version 1.11 Revision 2 (2026-07-14) Waypoint Import-Parity Patch Changelog

Revision 2 changes no scoring standard. It closes the gaps that let schema-valid grader output import badly into the Waypoint tracker.

Fixed:

- **Uniform `finalScore` is now explicitly required in every record, in every logging mode.** The §17.35 fast-mode required list had omitted it; graders following that list emitted records the importer back-filled with a computed `finalScore` of 0, corrupting averages, pass rates, and histograms. Updated: §1.1 (output contract + template + validation rule), §17.35, §21.3 omission table, §21.5 grader obligation, §22.1, §22.5 hard failure conditions, and the JSON schema (`finalScore` added to `properties` and `required`).
- **`calibration.graderModel` added** (§17.15 + schema): AI-graded records must stamp the exact grader model id alongside `evaluatorType: "AI grader"`; the tracker's grader-provenance filter audits by it. Manual grades omit it.
- **Gap soft-open default documented** (§17.11 + schema): `gapTypes`/`knowledgeGapTags` present without `gapClosureStatus` ⇒ importer opens the gap (`open`, `retestRequired: true`) automatically.
- **Defense walkthrough quick-logs classified** (§17.35): in-app graded defense story reps are `taskType: "walkthrough"`, typically `evidenceClass: "classB"`, `loggingMode: "fast"`.
- **Leveled ladder rule stated** (§17.35): L1→L2→L3 ladder sessions produce one record per level, linked by `attemptGroupId`/`attemptNumber`.
- **`Data analysis` added to the domain taxonomy** (§9.1) to match the tracker's BI question track (taskType `knowledge`, domain `Data Analysis`, role `DS`).
- **Schema score-chain parity**: `finalScore`, `universalScore`, `universalSubScores`, `taskSpecificScore`, `rawScore`, `cap`, `penalties`, `levelVerdicts`, `answerLevel`, `qualifyingDemonstratedLevel`, `demonstratedLevel`, `confidence`, `evidenceClass`, `primaryDomain`, `secondaryDomains`, `primaryRole`, `secondaryRoles`, `strengths`, `weaknesses`, and `nextTarget` now have typed definitions in `progress_tracker_record_schema_v1_11.json` (previously accepted only via `additionalProperties: true`, so their omission or mistyping was invisible to validation).

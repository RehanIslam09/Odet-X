# Phase 26 — AI Evaluation & Quality Foundation: Architecture & Design Investigation

> **Phase**: Phase 26 — AI Evaluation & Quality Foundation  
> **Status**: READ-ONLY ARCHITECTURAL INVESTIGATION  
> **Target Release**: Odet-X v1.3.0  
> **Author**: Antigravity AI Pair Programmer & System Architect  
> **Date**: July 24, 2026

---

## 1. Executive Summary

Phase 20 through Phase 25 established a resilient, production-grade AI infrastructure for Odet-X:
- **Multi-provider orchestration & routing** (Gemini & Anthropic with tier-based selection and telemetry).
- **Fallback policy & execution safety** (Automatic secondary provider retries on eligible failures).
- **Strict schema validation & domain boundary enforcement** (Zod output parsing and `PlanValidator` DAG cycle detection).
- **Structured AI Project Planning Engine** (Phase 25 multi-step plan generation, draft persistence, review workspace, and atomic commit).

However, existing automated tests operate strictly at the **Validity** layer:
- *Did the function execute?*
- *Did the output validate against Zod schema?*
- *Did routing/fallback work when a provider failed?*
- *Did the dependency graph satisfy structural DAG invariants?*

Existing tests cannot answer **Quality** questions:
- *Was the generated plan actually grounded in the user's project requirements?*
- *Did the AI cover all required technical milestones and explicit constraints?*
- *Did the AI invent unsupported technologies, fake features, or hallucinated claims?*
- *Did a prompt or model update improve or regress planning quality?*
- *Can these quality measurements be reproduced 100% deterministically offline in CI?*

**Phase 26 — AI Evaluation & Quality Foundation** introduces a lightweight, deterministic evaluation framework to measure AI output **QUALITY** beyond structural validity. 

This investigation establishes the architectural foundation for Phase 26. It establishes that quality evaluation MUST be layered, offline-first, and anchored by deterministic assertions on golden fixtures before any optional model-based (LLM-as-judge) evaluations are introduced.

---

## 2. Repository Evidence & Architectural Baseline

### 2.1 AI Subsystem Trace
A comprehensive audit of `server/src/ai/` reveals the complete execution flow:

```text
Domain AI Service (e.g. ProjectPlanningAIService)
       │
       ▼
  AIService.generateStructuredData(template, schema, options)
       │
       ├── 1. Generates correlation UUID (executionId)
       ├── 2. AIRouter.selectInitialProvider({ tier })
       ├── 3. AIProviderFactory.getProvider(providerName)
       │
       ▼
  AIService.executeSingleAttempt(provider, template, schema, options, executionId, attemptContext)
       │
       ├── 4. validatePromptTemplate(template)
       ├── 5. buildPrompt(template) -> string
       ├── 6. provider.generateStructured(fullPrompt, schema, options)
       ├── 7. validateAIResponse(data, schema) via Zod
       └── 8. aiLogger.logExecution(telemetryEvent) -> emits to AITelemetryObserver
```

### 2.2 Key Architectural Seams Identified
1. **`AIService` Constructor Injection Seam**: `AIService` accepts `(provider?: AIProvider, fallbackProvider?: AIProvider)`. This allows test runners to inject deterministic mock providers without network traffic.
2. **`ZodSchema` Validation Boundary**: Located in `server/src/ai/validation/ai-response.validator.ts`. Validates raw JSON output against the expected schema before returning `AIExecutionResult<T>`.
3. **`PromptRegistry` In-Memory Store**: Located in `server/src/ai/prompts/registry/prompt.registry.ts`. Stores registered templates (`PromptTemplate`). Prompts are retrieved strictly by `name`. Metadata contains `version: string` (e.g., `'1.0.0'`).
4. **`AITelemetryObserver` Privacy Seam**: Located in `server/src/ai/utils/logger.ts`. Emits telemetry metadata (tokens, latency, model, prompt name/version) while strictly stripping raw prompts, response payloads, and secrets.

---

## 3. Current AI Testing Architecture Inventory (Phases 20–25)

The repository contains 29 test files in `server/src/tests/`. AI-related tests represent 17 of these files:

| Test File | Primary Coverage Scope | Reusable Test Utilities / Patterns |
| :--- | :--- | :--- |
| `gemini-provider.test.ts` | Unit tests for Gemini API provider formatting & error handling | Mock Gemini response envelopes, token usage extractors |
| `gemini-schema.adapter.test.ts` | Zod-to-Gemini schema conversion | OpenAPI/JSON Schema translation assertions |
| `telemetry.test.ts` | Telemetry logging, event emission, privacy sanitization | `MockTelemetryObserver`, event assertion helpers |
| `routing.test.ts` & `routing-integration.test.ts` | Tier routing rules, provider selection, failover decision tree | `AIRouter` test harnesses, tier resolution mocks |
| `routing-telemetry.test.ts` | Routing telemetry logging and correlation IDs | Correlation tracking verification |
| `fallback-policy.test.ts`, `fallback-orchestration.test.ts`, `fallback-telemetry.test.ts` | Fallback eligibility, latency budgets, double-fault handling | Mock provider failure simulators (`MockFailingProvider`) |
| `project-ai.test.ts` | Legacy task generation AI service | `aiService` mock injection seam |
| `project-summary-ai.test.ts` | Project summary AI service | Context formatting assertions |
| `task-ai.test.ts` | Task auto-labeling AI service | Label taxonomy schema assertions |
| `project-plan-prompt.test.ts` | Project plan prompt template structure | Prompt section & XML boundary assertions |
| `project-plan-schema.test.ts` | Project plan Zod schema validation | Valid/invalid schema parsing assertions |
| `project-planning-ai.service.test.ts` | `ProjectPlanningAIService` structured planning generation | Offline mock planning response generator |
| `plan-validator.test.ts` | `PlanValidator` pure domain rules (cardinality, tempId, DAG cycle) | DAG cycle generators, invalid dependency payloads |
| `planning-domain.test.ts` | Planning domain models & entity translation | TempId to ObjectId translation assertions |
| `plan-commit.service.test.ts` | Atomic commit of plan drafts to MongoDB tasks & milestones | Transaction / rollback mock harness |
| `plan-api.test.ts` | HTTP API integration endpoints (`/plans`, `/commit`, `/active`) | End-to-end HTTP request harnesses |

### 3.1 Key Insight from Existing Inventory
Existing tests cover **Infrastructure, Routing, Schema Validation, and Structural Domain Invariants** with 100% offline mocks. Zero tests measure whether the generated content is accurate, grounded, complete, or non-hallucinated.

---

## 4. The Boundary Between Validity & Quality

A central finding of this investigation is the clear technical distinction between **Validity** and **Quality**:

```text
               ┌──────────────────────────────────────────────┐
               │              AI Output Response              │
               └──────────────────────┬───────────────────────┘
                                      │
                                      ▼
               ┌──────────────────────────────────────────────┐
               │               VALIDITY LAYER                 │
               │  - Valid JSON syntax                         │
               │  - Zod Schema match (types, bounds, maxLen)  │
               │  - Domain Invariants (tempId unique, DAG)    │
               └──────────────────────┬───────────────────────┘
                                      │ Passes Structural Validation
                                      ▼
               ┌──────────────────────────────────────────────┐
               │                QUALITY LAYER                 │
               │  - Grounded Fact Coverage (Context match)   │
               │  - Required Task / Milestone Coverage        │
               │  - Unsupported Claim Detection (Hallucination)│
               │  - Logical Dependency Ordering               │
               │  - Absence of Redundant / Duplicate Tasks    │
               └──────────────────────────────────────────────┘
```

| Dimension | Validity (Phases 20–25) | Quality (Phase 26 Foundation) |
| :--- | :--- | :--- |
| **Responsibility** | `ZodSchema` + `PlanValidator` | Phase 26 Evaluators |
| **Question Asked** | *"Is this output safe to parse and ingest?"* | *"How well does the output fulfill user intent?"* |
| **Failure Result** | Throws `AIValidationError` or `BadRequestError` | Returns `EvaluationResult` with metrics & failing assertions |
| **Computation** | Fast schema check & Kahn's DAG algorithm | Deterministic keyword/fact set matching & semantic checks |
| **Handling** | Blocks database persistence | Reports quality scores, detects regressions in CI |

---

## 5. Golden Fixture Design Specification

Golden fixtures represent standardized, version-controlled evaluation test cases.

### 5.1 Canonical Golden Fixture Interface
Fixtures must be strongly typed, deterministic, and committed to Git under `server/src/ai/evaluation/fixtures/`:

```ts
export interface EvaluationFixture<TInput = unknown, TGroundTruth = unknown, TCandidate = unknown> {
  /** Unique immutable identifier for this golden fixture (e.g. "fix_plan_saas_auth_v1") */
  fixtureId: string;
  /** Human-readable scenario title */
  name: string;
  /** Detailed description of the scenario and quality objective */
  description: string;
  /** Target AI capability (e.g. "project-plan", "project-summary") */
  targetCapability: string;
  /** Version tag of the fixture definition */
  version: string;
  
  /** The exact input payload supplied to the AI service */
  input: TInput;
  
  /** Ground truth expectations for quality measurement */
  groundTruth: TGroundTruth;
  
  /** Static candidate AI outputs for offline deterministic evaluation */
  candidateOutputs: Record<string, TCandidate>;
  
  /** Metadata regarding creation, tags, and author */
  metadata: {
    author: string;
    createdAt: string;
    tags: string[];
  };
}
```

### 5.2 Project Plan Ground Truth Specification
For the Phase 25 Planning Engine, `TGroundTruth` is defined as `ProjectPlanGroundTruth`:

```ts
export interface ProjectPlanGroundTruth {
  /** Required task titles or concepts that MUST be present in the plan */
  expectedTasks: Array<{
    id: string;
    concept: string;
    keywords: string[];
    required: boolean;
  }>;
  
  /** Required milestone titles or concepts that MUST be present */
  expectedMilestones: Array<{
    id: string;
    concept: string;
    keywords: string[];
    required: boolean;
  }>;
  
  /** List of explicit facts provided in the input prompt context */
  groundedContextFacts: string[];
  
  /** Technical terms or claims that MUST NOT appear (unsupported tech stack / hallucinations) */
  forbiddenClaims: string[];
  
  /** Expected logical dependency relationships (prerequisiteConcept -> dependentConcept) */
  expectedDependencyEdges: Array<{
    prerequisiteConcept: string;
    dependentConcept: string;
    reason: string;
  }>;
}
```

---

## 6. Deterministic Evaluator Architecture

Evaluators are stateless, pure domain components implementing a unified interface.

### 6.1 Unified Evaluator Interface
```ts
export interface Evaluator<TInput = unknown, TOutput = unknown, TGroundTruth = unknown> {
  /** Unique evaluator identifier (e.g. "plan-required-item-coverage") */
  readonly id: string;
  /** Human-readable evaluator name */
  readonly name: string;
  /** Target capability supported by this evaluator */
  readonly targetCapability: string;

  /**
   * Evaluates candidate output against input and ground truth expectations.
   */
  evaluate(
    input: TInput,
    output: TOutput,
    groundTruth: TGroundTruth
  ): Promise<EvaluationResult> | EvaluationResult;
}
```

### 6.2 Initial Deterministic Evaluators for Planning
1. **`RequiredItemCoverageEvaluator`**: Measures the ratio of required tasks and milestones present in candidate output via keyword/concept matching.
2. **`GroundedFactCoverageEvaluator`**: Verifies that technical choices in candidate tasks are grounded in `groundedContextFacts`.
3. **`UnsupportedClaimEvaluator`**: Scans candidate titles and descriptions for items in `forbiddenClaims` (detects hallucinations).
4. **`DependencyAccuracyEvaluator`**: Verifies whether required prerequisite ordering rules (`expectedDependencyEdges`) are respected in the DAG.
5. **`RedundantTaskEvaluator`**: Computes text similarity across task descriptions to flag duplicate or overlapping tasks.

---

## 7. Typed Metrics System & Non-Coercion Policy

### 7.1 Metric Value Representation
To prevent missing or uncomputable metrics from corrupting evaluation results, Phase 26 adopts a strict **Tagged Union Metric Representation**:

```ts
export type MetricValue =
  | { type: 'VALUED'; value: number; unit?: string }
  | { type: 'NOT_APPLICABLE'; reason: string }
  | { type: 'UNKNOWN'; reason: string };
```

> **CRITICAL POLICY**: Missing, uncomputable, or non-applicable metrics MUST remain `UNKNOWN` or `NOT_APPLICABLE`. They MUST NEVER be coerced to `0.0` or `0%`.

### 7.2 Core Quality Metrics
- **`requiredItemCoverage`**: `VALUED` (0.0 to 1.0) — Percentage of expected tasks/milestones present.
- **`groundedFactCoverage`**: `VALUED` (0.0 to 1.0) — Percentage of task claims grounded in prompt context.
- **`unsupportedClaimCount`**: `VALUED` (integer >= 0) — Count of forbidden/hallucinated items found.
- **`dependencyAccuracy`**: `VALUED` (0.0 to 1.0) — Ratio of correctly ordered dependency pairs.
- **`redundantTaskCount`**: `VALUED` (integer >= 0) — Count of duplicate/overlapping tasks.

---

## 8. Evaluation Runner & Suite Composition

The `EvaluationRunner` coordinates fixture loading, candidate execution, evaluator dispatch, metric aggregation, and threshold checking:

```text
               ┌──────────────────────────────────────────────┐
               │               EvaluationRunner               │
               └──────────────────────┬───────────────────────┘
                                      │
              ┌───────────────────────┼───────────────────────┐
              ▼                       ▼                       ▼
      Golden Fixtures        Candidate Outputs        Evaluator Registry
    (Static TypeScript)      (Offline Mocks / AI)     (Registered Strategy)
              │                       │                       │
              └───────────────────────┼───────────────────────┘
                                      │
                                      ▼
               ┌──────────────────────────────────────────────┐
               │             Evaluation Engine                │
               │  - Runs registered evaluators in parallel    │
               │  - Evaluates individual assertions           │
               │  - Computes typed metrics                    │
               │  - Checks regression thresholds              │
               └──────────────────────┬───────────────────────┘
                                      │
                                      ▼
               ┌──────────────────────────────────────────────┐
               │              Evaluation Report               │
               │  - SuiteEvaluationResult (JSON)              │
               │  - Terminal Summary Output (stdout)          │
               └──────────────────────────────────────────────┘
```

---

## 9. Planning Engine Quality Regression Target (Phase 25 Target)

Phase 25 is selected as the primary regression target for Phase 26 evaluation:
- **Input**: User prompt (e.g., *"Build a SaaS authentication system with JWT sessions, email verification, password reset endpoints, and user profile management..."*).
- **Candidate Output**: Generated `GeneratePlanResponse` (`{ tasks: [...], milestones: [...] }`).
- **Validity Check**: Passes `GeneratePlanResponseSchema` Zod validation and `PlanValidator` DAG cycle check.
- **Quality Checks**:
  1. Does the plan contain tasks for JWT sessions, email verification, password reset, and user profiles? (`requiredItemCoverage >= 0.85`)
  2. Does the plan avoid introducing out-of-scope technologies like OAuth 1.0 or GraphQL if unrequested? (`unsupportedClaimCount == 0`)
  3. Are prerequisites ordered logically (e.g., User Model BEFORE Auth Middleware)? (`dependencyAccuracy >= 0.90`)

---

## 10. Prompt Version Comparison & Regression Analysis

### 10.1 Side-by-Side Evaluation Strategy
Phase 26 allows evaluating two versions of a prompt (e.g. `project-plan` v1 vs v2) against identical golden fixtures.

```ts
export interface EvaluationDeltaReport {
  fixtureId: string;
  baselinePromptVersion: string;
  candidatePromptVersion: string;
  metricsDelta: Record<string, {
    baseline: number;
    candidate: number;
    delta: number;
    isRegression: boolean;
  }>;
  hasRegression: boolean;
}
```

---

## 11. Offline vs. Live Evaluation Boundary

To enforce repository quality standards while preserving developer speed, evaluation is split into two strict modes:

```text
+-------------------------------------------------------------------------+
| Mode A: OFFLINE EVALUATION (Default / Normal CI)                         |
| - Runs static candidate outputs from golden fixtures or offline mocks.  |
| - Performs ZERO live API calls to Gemini or Anthropic.                 |
| - Invoked automatically via `npm test` and `npm run verify`.            |
| - Executed in milliseconds.                                             |
+-------------------------------------------------------------------------+

+-------------------------------------------------------------------------+
| Mode B: LIVE EVALUATION (Explicit Manual Script Only)                   |
| - Invokes live `AIService.generateStructuredData` against API endpoints.|
| - Requires explicit API key environment variables.                      |
| - Triggered ONLY via `npm run test:eval:live --prefix server`.          |
| - NEVER invoked during `npm run verify` or automated PR checks.         |
+-------------------------------------------------------------------------+
```

---

## 12. Model-Based Evaluation (LLM-as-Judge) Strategy (Optional/Future)

While Phase 26 focuses on deterministic evaluators, the runner architecture supports an optional `LLMJudgeEvaluator`:
- **Isolation**: Implements the standard `Evaluator` interface under `server/src/ai/evaluation/evaluators/model-based/`.
- **Classification**: Clearly tagged as `isDeterministic: false`.
- **CI Policy**: Excluded from default CI runs (`npm run verify`).
- **Telemetry**: Logged with explicit `evaluatorType: 'model-based'` telemetry tags.

---

## 13. Privacy, Security & Telemetry Boundary

- **No User Content in Fixtures**: All golden fixtures are synthetic engineering scenarios. Zero real user data is stored.
- **No Secrets**: Fixtures contain zero API keys, JWT tokens, or credentials.
- **Telemetry Isolation**: Evaluators emit standard `AITelemetryEvent` records via `aiLogger`, ensuring privacy rules established in Phase 21 are 100% enforced.

---

## 14. CI Integration & Verification Pipeline

Deterministic evaluation tests will reside in `server/src/tests/eval-framework.test.ts` and `server/src/tests/plan-quality-eval.test.ts`.
- Automatically discovered by `server/src/tests/run.ts`.
- Runs as part of `npm run test:server`.
- Enforced by `npm run verify`.

---

## 15. Architectural Decisions Recommended (20 Questions Explicitly Answered)

1. **What is the boundary between AI validity and AI quality?**  
   *Validity* (Zod + `PlanValidator`) checks syntax, schema types, and graph invariants. *Quality* (Phase 26 Evaluators) checks semantic accuracy, context grounding, instruction adherence, and completeness.
2. **What should the canonical evaluation result contract look like?**  
   `EvaluationResult` (per evaluator) and `SuiteEvaluationResult` (per scenario) containing typed metrics, individual assertions, status enum (`passed`/`failed`/`error`/`skipped`), and execution duration.
3. **What should a golden fixture contain?**  
   `fixtureId`, `targetCapability`, `input` payload, `groundTruth` expectations, `candidateOutputs` map, and `metadata`.
4. **Should fixtures be capability-specific or generic?**  
   Generic outer envelope (`EvaluationFixture<TInput, TGroundTruth>`) with capability-specific ground truth payload structures.
5. **How should evaluators be registered/composed?**  
   Strategy pattern via an `EvaluationRegistry` and `EvaluationRunner`.
6. **Which planning qualities can be measured deterministically?**  
   Required task/milestone coverage, grounded fact ratio, unsupported claim counts, dependency pair ordering accuracy, and redundant task overlap.
7. **How do we detect unsupported claims without requiring another LLM?**  
   Deterministic string, phrase, and regex matching against `forbiddenClaims` and `groundedContextFacts` defined in golden fixtures.
8. **Which metrics are meaningful enough to keep?**  
   `requiredItemCoverage`, `groundedFactCoverage`, `unsupportedClaimCount`, `dependencyAccuracy`, `milestoneCoverage`, `redundantTaskCount`.
9. **Should Phase 26 have aggregate scores at all?**  
   NO arbitrary opaque aggregate scores. Use independent, typed metrics with explicit thresholds.
10. **How should UNKNOWN / NOT_APPLICABLE metrics be represented?**  
    Tagged union `MetricValue` (`VALUED` | `NOT_APPLICABLE` | `UNKNOWN`). Never coerce to `0.0`.
11. **How should evaluation failures differ from evaluator execution errors?**  
    `EvaluationFailure` (status `'failed'`) indicates quality criteria were missed. `EvaluatorExecutionError` (status `'error'`) indicates evaluator code crashed.
12. **How should prompt versions be compared?**  
    Side-by-side runner executing identical fixtures against candidate outputs from Prompt V1 vs V2, generating an `EvaluationDeltaReport`.
13. **How should regression thresholds work?**  
    Per-scenario configuration specifying minimum acceptable metric values (e.g. `minRequiredItemCoverage: 0.85`).
14. **Where should evaluation reports live?**  
    Generated transient reports output to `stdout` during test runs and written to `dist/reports/evaluation/`.
15. **Should reports be committed artifacts or generated artifacts?**  
    Golden fixtures & static candidate outputs are **COMMITTED**. Evaluation run reports are **GENERATED** transient outputs.
16. **How do we guarantee normal CI performs zero live AI calls?**  
    Default test runner uses checked-in static candidate outputs or mock providers.
17. **What optional live-evaluation architecture, if any, should exist?**  
    Isolated CLI script (`npm run test:eval:live`) triggered manually with API keys.
18. **Does Phase 26 require any changes to AIService?**  
    **NO**. `AIService` already provides clean provider injection seams and correlation metadata.
19. **Does Phase 26 require any changes to the prompt registry?**  
    **NO**. The prompt registry already tracks metadata versions.
20. **Which parts of Phase 25 can be reused directly?**  
    `ProjectPlanningAIService`, `GeneratePlanResponseSchema`, `PlanValidator`, `projectPlanPrompt`, and existing mock test harnesses.

---

## 16. Open Questions & Risks

- **Risk**: Overly rigid keyword matching in deterministic evaluators might flag valid domain synonyms as missing.  
  *Mitigation*: Fixture ground truth specifications allow multi-keyword concept arrays (e.g. `keywords: ["JWT", "token", "session"]`).
- **Risk**: Large fixture sets could slow down test execution.  
  *Mitigation*: Deterministic evaluators run pure in-memory substring/graph checks executing in < 5ms per fixture.

---

## 17. Roadmap Housekeeping & Metadata Updates

The canonical roadmap (`docs/roadmap.md`) currently reflects:
- `Last Completed Phase: Phase 24`
- `Next Phase: Phase 25`

During Phase 26 contract creation, `docs/roadmap.md` must be updated to reflect:
- `Last Completed Phase: Phase 25 — AI Project Planning Engine`
- `Next Phase: Phase 26 — AI Evaluation & Quality Foundation`

All deferred roadmap checkpoints introduced during Phase 25 MUST be preserved:
1. **Saved Planning Drafts / Plan History** (Phase 28.5)
2. **Full Responsive UI / Mobile UX Overhaul** (Phase 34.5)
3. **Frontend Responsive-by-Construction Invariant** (Section 12.1)

---

## 18. Proposed Phase 26 Work Packages

```text
Work Package 1 (WP-01): Evaluation Core Domain & Metric Types
├── server/src/ai/evaluation/types/evaluation.types.ts
└── server/src/ai/evaluation/types/metric.types.ts

Work Package 2 (WP-02): Golden Fixtures & Candidate Output Repository
├── server/src/ai/evaluation/fixtures/schemas/fixture.schema.ts
└── server/src/ai/evaluation/fixtures/planning/saas-auth.fixture.ts

Work Package 3 (WP-03): Deterministic Evaluators Implementation
├── server/src/ai/evaluation/evaluators/coverage.evaluator.ts
├── server/src/ai/evaluation/evaluators/groundedness.evaluator.ts
├── server/src/ai/evaluation/evaluators/unsupported-claims.evaluator.ts
└── server/src/ai/evaluation/evaluators/dependency-accuracy.evaluator.ts

Work Package 4 (WP-04): Evaluation Runner & Suite Reporting Engine
├── server/src/ai/evaluation/runners/evaluation.runner.ts
└── server/src/ai/evaluation/reports/evaluation.reporter.ts

Work Package 5 (WP-05): Planning Engine Regression & Prompt Version Comparison Suite
├── server/src/tests/eval-framework.test.ts
└── server/src/tests/plan-quality-eval.test.ts
```

---

## 19. Recommended Gate 1 Contract Scope

The Gate 1 contract for Phase 26 should define:
1. Core Evaluation Domain Types (`EvaluationResult`, `MetricValue`, `EvaluationFixture`).
2. Golden Fixtures for Phase 25 Planning Engine.
3. 4 Deterministic Quality Evaluators (Coverage, Groundedness, Unsupported Claims, Dependency Accuracy).
4. Evaluation Runner & Delta Reporter.
5. Automated offline test suite verifying zero live calls and passing `npm run verify`.

---

## 20. Investigation Summary of Files Inspected & Created

### Files Inspected:
- `server/src/ai/init.ts`
- `server/src/ai/ai.service.ts`
- `server/src/ai/prompts/registry/prompt.registry.ts`
- `server/src/ai/prompts/types.ts`
- `server/src/ai/prompts/definitions/project-plan.prompt.ts`
- `server/src/ai/schemas/project-plan.schema.ts`
- `server/src/domain/plan-validator.ts`
- `server/src/tests/run.ts`
- `package.json`
- `server/package.json`

### File Created:
- [investigation.md](file:///wsl$/Ubuntu/home/rehan/Developer/ai-project-manager/docs/phases/phase-26-ai-evaluation-quality-foundation/investigation.md)

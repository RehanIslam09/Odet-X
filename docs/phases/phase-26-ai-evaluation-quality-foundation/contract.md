# Phase 26 — AI Evaluation & Quality Foundation: Architecture Contract

> **Phase**: Phase 26 — AI Evaluation & Quality Foundation  
> **Status**: FROZEN GATE 1 CONTRACT  
> **Target Release**: Odet-X v1.3.0  
> **Author**: Antigravity AI Pair Programmer & System Architect  
> **Date**: July 24, 2026

---

## 1. Executive Summary & Purpose

Phase 26 establishes a deterministic, offline-first evaluation foundation for Odet-X to measure AI output **QUALITY** beyond structural **VALIDITY**.

Previous phases (Phases 20–25) introduced Zod schema validation, tier routing, fallback policies, and domain graph cycle validation (`PlanValidator`). However, those systems only verify whether output is structurally ingestible. Phase 26 introduces a lightweight quality measurement layer to verify whether AI outputs are grounded, complete, free of forbidden/hallucinated concepts, and logically ordered.

This contract freezes all evaluation domain contracts, fixture schemas, metric definitions, evaluator specifications, reporting conventions, and CI verification integration rules before implementation begins.

---

## 2. Evaluation Boundary Specification

Phase 26 establishes a strict demarcation between **Validity** and **Quality Evaluation**:

```text
               ┌──────────────────────────────────────────────┐
               │              AI Output Response              │
               └──────────────────────┬───────────────────────┘
                                      │
                                      ▼
               ┌──────────────────────────────────────────────┐
               │               VALIDITY LAYER                 │
               │  - Valid JSON syntax                         │
               │  - Zod Schema parsing (types, bounds)        │
               │  - PlanValidator Invariants (tempId, DAG)    │
               └──────────────────────┬───────────────────────┘
                                      │ Passes Structural Validation
                                      ▼
               ┌──────────────────────────────────────────────┐
               │         PHASE 26 QUALITY EVALUATION          │
               │  - Required Concept Coverage                 │
               │  - Fixture Grounding Coverage                │
               │  - Forbidden Concept Detection               │
               │  - Expected Dependency Accuracy              │
               └──────────────────────────────────────────────┘
```

### Boundary Rules & Non-Duplication Policy
1. **Zero Duplication**: Phase 26 evaluators MUST NOT re-implement Zod schema validation or `PlanValidator` graph checks (such as tempId uniqueness, cardinality limits, or Kahn's DAG cycle detection).
2. **Pre-condition**: Evaluators run ONLY on candidate outputs that have already successfully passed the Validity Layer.
3. **Failure Isolation**: Validity failures throw application errors (`AIValidationError`, `BadRequestError`). Quality evaluation failures produce typed `EvaluationResult` assertions showing quality regressions without throwing application exceptions.

---

## 3. Evaluation Domain Contracts

All evaluation domain types shall be defined in `server/src/ai/evaluation/types/`:

### 3.1 Tagged Union Metric Value (`MetricValue`)
To prevent uncomputable or non-applicable metrics from corrupting quality reporting, metrics use a tagged union. Missing metrics MUST NEVER be coerced to numeric `0.0`.

```ts
export type MetricValue =
  | { type: 'VALUED'; value: number; unit?: string }
  | { type: 'NOT_APPLICABLE'; reason: string }
  | { type: 'UNKNOWN'; reason: string };
```

### 3.2 Evaluation Status & Assertion
```ts
export type EvaluationStatus = 'passed' | 'failed' | 'error' | 'skipped';

export interface EvaluationAssertion {
  id: string;
  description: string;
  passed: boolean;
  expected: string;
  actual: string;
}
```

### 3.3 Evaluation Result & Suite Result
```ts
export interface EvaluationResult {
  evaluatorId: string;
  evaluatorName: string;
  status: EvaluationStatus;
  score: number | null; // 0.0 to 1.0 or null if non-numeric
  metrics: Record<string, MetricValue>;
  assertions: EvaluationAssertion[];
  error?: string;
  durationMs: number;
}

export interface SuiteEvaluationResult {
  fixtureId: string;
  scenarioName: string;
  targetCapability: string;
  timestamp: string;
  promptName: string;
  promptVersion: string;
  overallStatus: 'passed' | 'failed' | 'error';
  evaluatorResults: EvaluationResult[];
  summaryMetrics: Record<string, MetricValue>;
  durationMs: number;
}
```

### 3.4 Evaluation Delta Report (Prompt Version Comparison)
```ts
export interface MetricDelta {
  baselineValue: MetricValue;
  candidateValue: MetricValue;
  delta: number | null;
  isRegression: boolean;
}

export interface EvaluationDeltaReport {
  fixtureId: string;
  targetCapability: string;
  baselinePromptVersion: string;
  candidatePromptVersion: string;
  metricDeltas: Record<string, MetricDelta>;
  hasRegression: boolean;
  timestamp: string;
}
```

---

## 4. Golden Fixture Contract & Schema

Golden fixtures represent synthetic, version-controlled evaluation test cases.

```ts
export interface EvaluationFixture<TInput = unknown, TGroundTruth = unknown, TCandidate = unknown> {
  /** Unique immutable identifier for this golden fixture (e.g. "fix_plan_saas_auth_v1") */
  fixtureId: string;
  /** Human-readable scenario title */
  name: string;
  /** Detailed description of the scenario and quality objective */
  description: string;
  /** Target AI capability (e.g. "project-plan") */
  targetCapability: string;
  /** Version tag of the fixture definition */
  version: string;
  
  /** Synthetic input payload supplied to the AI service */
  input: TInput;
  
  /** Ground truth expectations for deterministic quality measurement */
  groundTruth: TGroundTruth;
  
  /** Static candidate AI outputs for offline deterministic evaluation */
  candidateOutputs: {
    knownGood: TCandidate;
    knownRegression: TCandidate;
    [key: string]: TCandidate;
  };
  
  /** Metadata regarding creation, tags, and author */
  metadata: {
    author: string;
    createdAt: string;
    tags: string[];
  };
}
```

### Fixture Invariants
1. **100% Synthetic**: Fixtures MUST contain zero production user data or real project content.
2. **Zero Secrets**: Fixtures MUST contain zero API keys, tokens, or credentials.
3. **Git-Managed Truth**: Golden fixtures are committed source files located under `server/src/ai/evaluation/fixtures/`.
4. **Offline Usability**: Fixtures must be executable without provider credentials or network access.

---

## 5. Initial Planning Golden Scenario (`fix_plan_saas_auth_v1`)

The first canonical golden scenario for the Phase 25 Planning Engine is defined as follows:

```ts
export const saasAuthPlanningFixture: EvaluationFixture<
  { description: string },
  ProjectPlanGroundTruth,
  GeneratePlanResponse
> = {
  fixtureId: "fix_plan_saas_auth_v1",
  name: "SaaS Authentication & User Management Plan",
  description: "Evaluates AI project plan generation for a standard SaaS authentication system with JWT sessions, email verification, and password reset.",
  targetCapability: "project-plan",
  version: "1.0.0",
  
  input: {
    description: "Build a SaaS authentication system with JWT sessions, email verification, password reset endpoints, and user profile management in Express and PostgreSQL."
  },
  
  groundTruth: {
    expectedTasks: [
      { id: "task_jwt_auth", concept: "JWT Token Scheme & Authentication Middleware", keywords: ["jwt", "token", "auth middleware", "session"], required: true },
      { id: "task_email_verify", concept: "Email Verification Service", keywords: ["email", "verification", "verify"], required: true },
      { id: "task_password_reset", concept: "Password Reset & Recovery Endpoints", keywords: ["password reset", "recovery", "reset token"], required: true },
      { id: "task_user_profile", concept: "User Profile Management", keywords: ["user profile", "profile", "user model"], required: true }
    ],
    
    expectedMilestones: [
      { id: "ms_core_auth", concept: "Core Authentication API", keywords: ["auth", "authentication"], required: true },
      { id: "ms_account_mgmt", concept: "Account & Profile Management", keywords: ["account", "profile"], required: true }
    ],
    
    groundedContextFacts: [
      "Express",
      "PostgreSQL",
      "JWT",
      "email verification",
      "password reset",
      "user profile"
    ],
    
    forbiddenClaims: [
      "OAuth 1.0",
      "SOAP",
      "MongoDB",
      "Redis Cluster",
      "GraphQL Subscriptions"
    ],
    
    expectedDependencyEdges: [
      {
        prerequisiteConcept: "User Profile Management",
        dependentConcept: "JWT Token Scheme & Authentication Middleware",
        reason: "User database model must exist before JWT authentication middleware can issue tokens."
      }
    ]
  },

  candidateOutputs: {
    knownGood: {
      milestones: [
        { ref: "ms_1", title: "Core Authentication API", description: "Backend auth endpoints and JWT infrastructure", targetDate: "2026-08-15", position: 1 },
        { ref: "ms_2", title: "Account & Profile Management", description: "User profile updates and settings", targetDate: "2026-08-30", position: 2 }
      ],
      tasks: [
        { ref: "task_1", title: "Design User Profile & Database Model", description: "Create PostgreSQL schema for user profiles", priority: "high", estimatedTime: "1d", position: 1, dependencies: [], milestoneRef: "ms_1" },
        { ref: "task_2", title: "Implement JWT Token Scheme & Auth Middleware", description: "Set up JWT access and refresh token authentication middleware in Express", priority: "high", estimatedTime: "2d", position: 2, dependencies: ["task_1"], milestoneRef: "ms_1" },
        { ref: "task_3", title: "Create Email Verification Service", description: "Send email verification tokens on registration", priority: "medium", estimatedTime: "1d", position: 3, dependencies: ["task_1"], milestoneRef: "ms_1" },
        { ref: "task_4", title: "Build Password Reset & Recovery Endpoints", description: "Implement password reset token generation and endpoint verification", priority: "medium", estimatedTime: "1d", position: 4, dependencies: ["task_1"], milestoneRef: "ms_1" }
      ]
    },

    knownRegression: {
      milestones: [
        { ref: "ms_1", title: "General Setup", description: "Basic setup", targetDate: null, position: 1 }
      ],
      tasks: [
        { ref: "task_1", title: "Configure MongoDB Database", description: "Set up MongoDB document store for user profiles", priority: "none", estimatedTime: "1d", position: 1, dependencies: [], milestoneRef: "ms_1" },
        { ref: "task_2", title: "Implement OAuth 1.0 Integration", description: "Connect legacy OAuth 1.0 protocol", priority: "low", estimatedTime: "3d", position: 2, dependencies: [], milestoneRef: "ms_1" }
      ]
    }
  },

  metadata: {
    author: "Odet-X Core Engineering",
    createdAt: "2026-07-24",
    tags: ["planning", "saas", "auth", "regression"]
  }
};
```

---

## 6. Evaluator Specifications & Deterministic Guarantees

Phase 26 approves **four initial deterministic evaluators**. Each evaluator specifies exact capabilities, algorithms, limitations, and error handling.

### 6.1 `RequiredItemCoverageEvaluator` (`eval_plan_required_coverage`)
- **Target Capability**: `project-plan`
- **Metric Produced**: `requiredItemCoverage` (`VALUED`, 0.0 to 1.0)
- **Algorithm**:
  1. For each expected task/milestone concept in ground truth, inspect candidate titles and descriptions.
  2. Perform case-insensitive string normalization (lowercased, trimmed, stripped of special punctuation).
  3. Concept is marked MATCHED if any declared keyword appears in candidate text.
  4. `requiredItemCoverage = matchedRequiredConcepts / totalRequiredConcepts`.
- **Threshold**: Pass if `requiredItemCoverage >= 0.75`.
- **What it CAN establish**: Deterministically verifies whether candidate output contains expected technical task concepts defined in fixture ground truth.
- **What it CANNOT establish**: Does not prove semantic equivalence for un-indexed synonyms outside the declared keyword list.
- **False-Positive Risk**: Low. A keyword collision could match an unrelated task.
- **False-Negative Risk**: Moderate. Valid AI responses using novel phrasing not listed in keywords may fail to match.

### 6.2 `GroundedContextCoverageEvaluator` (`eval_plan_grounded_coverage`)
- **Target Capability**: `project-plan`
- **Metric Produced**: `groundedFactCoverage` (`VALUED`, 0.0 to 1.0)
- **Algorithm**:
  1. Extract all technology and framework keywords from candidate tasks and milestones.
  2. Match against `groundedContextFacts` defined in fixture input.
  3. `groundedFactCoverage = candidateGroundedFacts / totalCandidateFacts`.
- **Threshold**: Pass if `groundedFactCoverage >= 0.80`.
- **What it CAN establish**: Measures the ratio of candidate tech stack claims explicitly backed by input context.
- **What it CANNOT establish**: Does not prove general factual truth of arbitrary natural language sentences.
- **False-Positive Risk**: Low.
- **False-Negative Risk**: Low.

### 6.3 `ForbiddenConceptEvaluator` (`eval_plan_forbidden_concepts`)
- **Target Capability**: `project-plan`
- **Metric Produced**: `unsupportedClaimCount` (`VALUED`, integer >= 0)
- **Algorithm**:
  1. Normalize candidate task/milestone titles and descriptions.
  2. For each term in `forbiddenClaims`, search candidate output.
  3. Increment `unsupportedClaimCount` for each distinct forbidden term found.
- **Threshold**: Pass if `unsupportedClaimCount == 0`.
- **What it CAN establish**: Deterministically proves that candidate output contains specific forbidden/unsupported concepts explicitly indexed in fixture ground truth.
- **What it CANNOT establish**: Does NOT prove the total absence of all possible AI hallucinations outside the forbidden list.
- **False-Positive Risk**: Low.
- **False-Negative Risk**: High for unlisted forbidden terms (inherent limitation of deterministic matching).

### 6.4 `DependencyAccuracyEvaluator` (`eval_plan_dependency_accuracy`)
- **Target Capability**: `project-plan`
- **Metric Produced**: `dependencyAccuracy` (`VALUED`, 0.0 to 1.0)
- **Algorithm**:
  1. Map candidate tasks to fixture ground truth task concepts.
  2. For each `expectedDependencyEdge` (prerequisite -> dependent), check if the candidate DAG contains a path or direct edge from prerequisite to dependent.
  3. `dependencyAccuracy = satisfiedExpectedEdges / totalExpectedEdges`.
- **Threshold**: Pass if `dependencyAccuracy >= 1.0` (when expected edges exist).
- **What it CAN establish**: Verifies whether candidate task ordering respects required domain dependency sequences.
- **What it CANNOT establish**: Does not evaluate whether arbitrary unrequested dependencies are optimal.
- **False-Positive Risk**: Low.
- **False-Negative Risk**: Low.

---

## 7. Shared Normalization Rules

All text matching algorithms across evaluators MUST use the following deterministic normalization function:

```ts
export function normalizeText(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Strip special punctuation
    .replace(/\s+/g, " ");    // Collapse whitespace
}
```

No uncalibrated fuzzy string algorithms (e.g. Levenshtein distance) or nondeterministic vector embeddings shall be used in Phase 26 core evaluators.

---

## 8. Evaluation Runner Specification & Registry Decision

### 8.1 Architectural Decision: Static Composition
**DECISION**: Phase 26 adopts **Static Composition** of the four approved evaluators. A dynamic plugin/registry abstraction is intentionally **Omitted** to keep the core framework minimal and maintainable.

### 8.2 Runner Contract
The `EvaluationRunner` is a pure, stateless function executing composed evaluators:

```ts
export class EvaluationRunner {
  public static async evaluatePlanningFixture(
    fixture: EvaluationFixture<{ description: string }, ProjectPlanGroundTruth, GeneratePlanResponse>,
    candidateKey: string,
    promptName: string,
    promptVersion: string
  ): Promise<SuiteEvaluationResult> {
    const candidateOutput = fixture.candidateOutputs[candidateKey];
    if (!candidateOutput) {
      throw new Error(`Candidate '${candidateKey}' not found in fixture '${fixture.fixtureId}'.`);
    }

    const startedAt = performance.now();
    const evaluatorResults: EvaluationResult[] = [];

    // Execute static evaluators
    evaluatorResults.push(await evaluateRequiredCoverage(fixture.input, candidateOutput, fixture.groundTruth));
    evaluatorResults.push(await evaluateGroundedCoverage(fixture.input, candidateOutput, fixture.groundTruth));
    evaluatorResults.push(await evaluateForbiddenConcepts(fixture.input, candidateOutput, fixture.groundTruth));
    evaluatorResults.push(await evaluateDependencyAccuracy(fixture.input, candidateOutput, fixture.groundTruth));

    const durationMs = Math.round(performance.now() - startedAt);
    const overallStatus = evaluatorResults.every((r) => r.status === "passed") ? "passed" : "failed";

    return {
      fixtureId: fixture.fixtureId,
      scenarioName: fixture.name,
      targetCapability: fixture.targetCapability,
      timestamp: new Date().toISOString(),
      promptName,
      promptVersion,
      overallStatus,
      evaluatorResults,
      summaryMetrics: aggregateSummaryMetrics(evaluatorResults),
      durationMs,
    };
  }
}
```

---

## 9. Regression Semantics & Metric Thresholds

### 9.1 No Opaque Aggregate Scores
Phase 26 explicitly **PROHIBITS** opaque composite AI scores (e.g., "AI Score: 84/100"). Regression is evaluated strictly metric-by-metric against explicit thresholds:

| Metric Name | Pass Threshold | Regression Condition |
| :--- | :--- | :--- |
| `requiredItemCoverage` | `>= 0.75` | `candidate < baseline - 0.05` |
| `groundedFactCoverage` | `>= 0.80` | `candidate < baseline - 0.05` |
| `unsupportedClaimCount` | `== 0` | `candidate > baseline` |
| `dependencyAccuracy` | `== 1.0` | `candidate < baseline` |

---

## 10. Prompt Version Comparison Model

Prompt version comparison in Phase 26 operates strictly on static candidate outputs tagged with `promptName` and `promptVersion` metadata:

- `PromptRegistry` remains unchanged (retrieves templates strictly by `name`).
- Historical prompt execution resolution is **Deferred** to future phases.
- `comparePromptVersions(v1Result, v2Result)` compares two `SuiteEvaluationResult` records to produce an `EvaluationDeltaReport`.

---

## 11. Reporting Specification

1. **Terminal Output (`stdout`)**: Formatted test output during `npm test`.
2. **Machine-Readable Reports**: Evaluation runs generate JSON reports in `dist/reports/evaluation/`.
3. **Git Policy**: Reports are transient build artifacts and MUST be added to `.gitignore`. Golden fixtures remain the sole committed truth.

---

## 12. Offline / Live Boundary Invariant

### 12.1 Core Invariant
> **NORMAL CI INVARIANT**: `npm test` and `npm run verify` MUST perform ZERO live calls to Gemini or Anthropic API providers.

### 12.2 Live Evaluation Decision
Live evaluation runner implementation is **Deferred from Phase 26 Core Scope**. All Phase 26 evaluation tests operate 100% offline on static candidate output fixtures.

---

## 13. Privacy, Security & Telemetry Boundary

1. **Zero User Content**: Golden fixtures contain only synthetic engineering data.
2. **Telemetry Separation**: Evaluation quality metrics MUST NOT route through operational `AITelemetryEvent` or `aiLogger`. Quality reporting remains isolated inside evaluation test reports.

---

## 14. CI Integration Plan

- Evaluation tests will be implemented in `server/src/tests/plan-quality-eval.test.ts`.
- Automatically discovered by `server/src/tests/run.ts`.
- Runs during `npm run test:server` and enforced by `npm run verify`.
- Zero external API keys or network credentials required.

---

## 15. Final Work Package Breakdown

```text
Work Package 1 (WP-01): Evaluation Core Domain & Metric Types
├── server/src/ai/evaluation/types/evaluation.types.ts
└── server/src/ai/evaluation/types/metric.types.ts

Work Package 2 (WP-02): Golden Fixture Infrastructure & SaaS Auth Scenario
├── server/src/ai/evaluation/fixtures/schemas/fixture.schema.ts
└── server/src/ai/evaluation/fixtures/planning/saas-auth.fixture.ts

Work Package 3 (WP-03): Initial Four Deterministic Evaluators
├── server/src/ai/evaluation/evaluators/required-coverage.evaluator.ts
├── server/src/ai/evaluation/evaluators/grounded-coverage.evaluator.ts
├── server/src/ai/evaluation/evaluators/forbidden-concepts.evaluator.ts
└── server/src/ai/evaluation/evaluators/dependency-accuracy.evaluator.ts

Work Package 4 (WP-04): Evaluation Runner & Version Comparison Reporter
├── server/src/ai/evaluation/runners/evaluation.runner.ts
└── server/src/ai/evaluation/reports/evaluation.reporter.ts

Work Package 5 (WP-05): Planning Engine Quality & Regression Integration Suite
└── server/src/tests/plan-quality-eval.test.ts
```

---

## 16. Verification of Deliverables

- `docs/phases/phase-26-ai-evaluation-quality-foundation/contract.md` created.
- `docs/roadmap.md` metadata updated to Phase 25 complete / Phase 26 next.
- Zero production code files created.

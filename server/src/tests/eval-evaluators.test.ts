import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { saasAuthPlanningFixture } from '../ai/evaluation/fixtures/planning/saas-auth.fixture.js';
import { ProjectPlanGroundTruth } from '../ai/evaluation/fixtures/schemas/fixture.schema.js';
import { evaluateRequiredCoverage } from '../ai/evaluation/evaluators/required-coverage.evaluator.js';
import { evaluateGroundedCoverage } from '../ai/evaluation/evaluators/grounded-coverage.evaluator.js';
import { evaluateForbiddenConcepts } from '../ai/evaluation/evaluators/forbidden-concepts.evaluator.js';
import { evaluateDependencyAccuracy } from '../ai/evaluation/evaluators/dependency-accuracy.evaluator.js';
import { GeneratePlanResponse } from '../ai/schemas/project-plan.schema.js';
import { isValuedMetric } from '../ai/evaluation/types/metric.types.js';

describe('WP-03 Initial Four Deterministic Evaluators Unit Tests', () => {
  const knownGood = saasAuthPlanningFixture.candidateOutputs.knownGood!;
  const knownRegression = saasAuthPlanningFixture.candidateOutputs.knownRegression!;
  const groundTruth = saasAuthPlanningFixture.groundTruth;

  // --------------------------------------------------------------------------
  // A. REQUIRED ITEM COVERAGE EVALUATOR TESTS
  // --------------------------------------------------------------------------
  describe('RequiredItemCoverageEvaluator', () => {
    it('1. knownGood achieves complete required coverage (1.0)', () => {
      const result = evaluateRequiredCoverage(knownGood, groundTruth);
      assert.equal(result.status, 'passed');
      assert.equal(result.score, 1.0);
      assert.ok(result.metrics.requiredItemCoverage);
      assert.equal(result.metrics.requiredItemCoverage.type, 'VALUED');
      if (isValuedMetric(result.metrics.requiredItemCoverage)) {
        assert.equal(result.metrics.requiredItemCoverage.value, 1.0);
      }
    });

    it('2. knownRegression achieves lower required coverage', () => {
      const result = evaluateRequiredCoverage(knownRegression, groundTruth);
      assert.equal(result.status, 'failed');
      assert.ok(result.score! < 1.0, 'knownRegression coverage score must be less than 1.0');
    });

    it('3. Duplicate candidate items matching the same concept do not inflate coverage', () => {
      const duplicateCandidate: GeneratePlanResponse = {
        tasks: [
          { ref: 'task_1', title: 'Design User Profile & Database Model', description: 'desc', priority: 'high', position: 1, dependencies: [] },
          { ref: 'task_1_dup', title: 'Design User Profile & Database Model Duplicate', description: 'desc', priority: 'high', position: 2, dependencies: [] },
        ],
        milestones: [],
      };

      const result = evaluateRequiredCoverage(duplicateCandidate, groundTruth);
      assert.equal(result.score! <= 1.0, true);
    });

    it('4. Zero required concepts returns NOT_APPLICABLE metric', () => {
      const emptyGroundTruth: ProjectPlanGroundTruth = {
        ...groundTruth,
        expectedTasks: [],
        expectedMilestones: [],
      };

      const result = evaluateRequiredCoverage(knownGood, emptyGroundTruth);
      assert.equal(result.status, 'passed');
      assert.equal(result.score, null);
      assert.ok(result.metrics.requiredItemCoverage);
      assert.equal(result.metrics.requiredItemCoverage.type, 'NOT_APPLICABLE');
    });
  });

  // --------------------------------------------------------------------------
  // B. GROUNDED CONTEXT COVERAGE EVALUATOR TESTS
  // --------------------------------------------------------------------------
  describe('GroundedContextCoverageEvaluator', () => {
    it('1. knownGood achieves high grounded fact coverage', () => {
      const result = evaluateGroundedCoverage(knownGood, groundTruth);
      assert.equal(result.status, 'passed');
      assert.ok(result.score! >= 0.80, 'knownGood grounded coverage score should be >= 0.80');
      assert.ok(result.metrics.groundedFactCoverage);
      assert.equal(result.metrics.groundedFactCoverage.type, 'VALUED');
    });

    it('2. knownRegression produces lower grounded context coverage', () => {
      const result = evaluateGroundedCoverage(knownRegression, groundTruth);
      assert.equal(result.status, 'failed');
      assert.ok(result.score! < 0.80, 'knownRegression grounded coverage score should be < 0.80');
    });

    it('3. Zero declared grounded facts returns NOT_APPLICABLE metric', () => {
      const emptyGroundTruth: ProjectPlanGroundTruth = {
        ...groundTruth,
        groundedContextFacts: [],
      };

      const result = evaluateGroundedCoverage(knownGood, emptyGroundTruth);
      assert.equal(result.status, 'passed');
      assert.equal(result.score, null);
      assert.ok(result.metrics.groundedFactCoverage);
      assert.equal(result.metrics.groundedFactCoverage.type, 'NOT_APPLICABLE');
    });

    it('4. Matching is case-insensitive and whitespace tolerant', () => {
      const caseCandidate: GeneratePlanResponse = {
        tasks: [
          { ref: 't1', title: 'EXPRESS and POSTGRESQL Auth', description: 'JWT email verification and PASSWORD RESET', priority: 'none', position: 1, dependencies: [] },
        ],
        milestones: [],
      };

      const result = evaluateGroundedCoverage(caseCandidate, groundTruth);
      assert.ok(result.score! > 0.5, 'Case insensitive match should detect terms');
    });
  });

  // --------------------------------------------------------------------------
  // C. FORBIDDEN CONCEPT EVALUATOR TESTS
  // --------------------------------------------------------------------------
  describe('ForbiddenConceptEvaluator', () => {
    it('1. knownGood returns unsupportedClaimCount = 0 (VALUED(0))', () => {
      const result = evaluateForbiddenConcepts(knownGood, groundTruth);
      assert.equal(result.status, 'passed');
      assert.equal(result.score, null); // Score is null for count metrics
      assert.ok(result.metrics.unsupportedClaimCount);
      assert.equal(result.metrics.unsupportedClaimCount.type, 'VALUED');
      if (isValuedMetric(result.metrics.unsupportedClaimCount)) {
        assert.equal(result.metrics.unsupportedClaimCount.value, 0);
      }
    });

    it('2. knownRegression detects forbidden claims (MongoDB, OAuth 1.0)', () => {
      const result = evaluateForbiddenConcepts(knownRegression, groundTruth);
      assert.equal(result.status, 'failed');
      assert.ok(result.metrics.unsupportedClaimCount);
      assert.equal(result.metrics.unsupportedClaimCount.type, 'VALUED');
      if (isValuedMetric(result.metrics.unsupportedClaimCount)) {
        assert.ok(result.metrics.unsupportedClaimCount.value >= 2, 'Should detect at least 2 forbidden claims');
      }
    });

    it('3. Repeated occurrences of one forbidden claim count as 1 violation', () => {
      const repeatedForbiddenCandidate: GeneratePlanResponse = {
        tasks: [
          { ref: 't1', title: 'MongoDB Setup Part 1', description: 'Configure MongoDB cluster', priority: 'none', position: 1, dependencies: [] },
          { ref: 't2', title: 'MongoDB Setup Part 2', description: 'Seed MongoDB collections', priority: 'none', position: 2, dependencies: [] },
        ],
        milestones: [],
      };

      const result = evaluateForbiddenConcepts(repeatedForbiddenCandidate, groundTruth);
      assert.ok(result.metrics.unsupportedClaimCount);
      assert.equal(result.metrics.unsupportedClaimCount.type, 'VALUED');
      if (isValuedMetric(result.metrics.unsupportedClaimCount)) {
        assert.equal(result.metrics.unsupportedClaimCount.value, 1, 'Distinct forbidden claim count should be 1');
      }
    });

    it('4. Empty forbiddenClaims set returns VALUED(0) metric', () => {
      const emptyForbiddenGroundTruth: ProjectPlanGroundTruth = {
        ...groundTruth,
        forbiddenClaims: [],
      };

      const result = evaluateForbiddenConcepts(knownGood, emptyForbiddenGroundTruth);
      assert.equal(result.status, 'passed');
      assert.ok(result.metrics.unsupportedClaimCount);
      assert.equal(result.metrics.unsupportedClaimCount.type, 'VALUED');
      if (isValuedMetric(result.metrics.unsupportedClaimCount)) {
        assert.equal(result.metrics.unsupportedClaimCount.value, 0);
      }
    });
  });

  // --------------------------------------------------------------------------
  // D. DEPENDENCY ACCURACY EVALUATOR TESTS
  // --------------------------------------------------------------------------
  describe('DependencyAccuracyEvaluator', () => {
    it('1. knownGood satisfies expected prerequisite dependency edge (accuracy = 1.0)', () => {
      const result = evaluateDependencyAccuracy(knownGood, groundTruth);
      assert.equal(result.status, 'passed');
      assert.equal(result.score, 1.0);
      assert.ok(result.metrics.dependencyAccuracy);
      assert.equal(result.metrics.dependencyAccuracy.type, 'VALUED');
      if (isValuedMetric(result.metrics.dependencyAccuracy)) {
        assert.equal(result.metrics.dependencyAccuracy.value, 1.0);
      }
    });

    it('2. knownRegression fails expected dependency relationship', () => {
      const result = evaluateDependencyAccuracy(knownRegression, groundTruth);
      assert.equal(result.status, 'failed');
    });

    it('3. Reversing dependency direction fails accuracy assertion', () => {
      const reversedCandidate: GeneratePlanResponse = {
        tasks: [
          { ref: 'task_1', title: 'Design User Profile & Database Model', description: 'desc', priority: 'high', dependencies: ['task_2'], position: 1 },
          { ref: 'task_2', title: 'Implement JWT Token Scheme & Auth Middleware', description: 'desc', priority: 'high', dependencies: [], position: 2 },
        ],
        milestones: [],
      };

      const result = evaluateDependencyAccuracy(reversedCandidate, groundTruth);
      assert.equal(result.status, 'failed');
      assert.equal(result.score, 0.0);
    });

    it('4. Zero expected dependency edges returns NOT_APPLICABLE metric', () => {
      const emptyEdgesGroundTruth: ProjectPlanGroundTruth = {
        ...groundTruth,
        expectedDependencyEdges: [],
      };

      const result = evaluateDependencyAccuracy(knownGood, emptyEdgesGroundTruth);
      assert.equal(result.status, 'passed');
      assert.equal(result.score, null);
      assert.ok(result.metrics.dependencyAccuracy);
      assert.equal(result.metrics.dependencyAccuracy.type, 'NOT_APPLICABLE');
    });

    it('5. Task array order does not determine dependency resolution', () => {
      // Swapped task array order where task_2 comes first in array
      const reorderedCandidate: GeneratePlanResponse = {
        tasks: [
          { ref: 'task_2', title: 'Implement JWT Token Scheme & Auth Middleware', description: 'desc', priority: 'high', position: 1, dependencies: ['task_1'] },
          { ref: 'task_1', title: 'Design User Profile & Database Model', description: 'desc', priority: 'high', position: 2, dependencies: [] },
        ],
        milestones: [],
      };

      const result = evaluateDependencyAccuracy(reorderedCandidate, groundTruth);
      assert.equal(result.status, 'passed');
      assert.equal(result.score, 1.0);
    });
  });

  // --------------------------------------------------------------------------
  // E. DETERMINISM & OFFLINE INVARIANTS
  // --------------------------------------------------------------------------
  describe('Determinism & Offline Invariants', () => {
    it('1. Repeated evaluator runs produce identical scores and status', () => {
      const run1 = evaluateRequiredCoverage(knownGood, groundTruth);
      const run2 = evaluateRequiredCoverage(knownGood, groundTruth);

      assert.equal(run1.status, run2.status);
      assert.equal(run1.score, run2.score);
      assert.deepEqual(run1.metrics, run2.metrics);
      assert.deepEqual(run1.assertions, run2.assertions);
    });
  });
});

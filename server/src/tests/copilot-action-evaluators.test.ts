import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getMetricNumericValue } from "../ai/evaluation/types/metric.types.js";
import { evaluateActionSchemaValidity } from "../ai/evaluation/evaluators/action-schema-validity.evaluator.js";
import { evaluateActionReferenceValidity } from "../ai/evaluation/evaluators/action-reference-validity.evaluator.js";
import { evaluateActionSafetyBoundary } from "../ai/evaluation/evaluators/action-safety-boundary.evaluator.js";
import { evaluateActionGroundedness } from "../ai/evaluation/evaluators/action-groundedness.evaluator.js";
import {
  fixtureA_ValidStatusUpdate,
  fixtureB_HallucinatedReference,
  fixtureC_ForbiddenAction,
  fixtureD_InformationalNoAction,
  fixtureE_UngroundedAction,
} from "../ai/evaluation/fixtures/copilot/action-proposals.fixture.js";

describe("Phase 28 — Quality Evaluation Suite & Deterministic Evaluators Tests (WP-05)", () => {
  // -------------------------------------------------------------------------
  // 1. Action Schema Validity Evaluator Tests
  // -------------------------------------------------------------------------

  describe("Action Schema Validity Evaluator", () => {
    it("passes for valid proposed action payload", () => {
      const cand = fixtureA_ValidStatusUpdate.candidates[0];
      assert.ok(cand);
      const res = evaluateActionSchemaValidity(cand.output);

      assert.equal(res.status, "passed");
      assert.equal(res.score, 1.0);
      assert.ok(res.metrics.action_schema_valid);
      assert.equal(getMetricNumericValue(res.metrics.action_schema_valid), 1.0);
    });

    it("passes for null proposedAction (informational no-action query)", () => {
      const cand = fixtureD_InformationalNoAction.candidates[0];
      assert.ok(cand);
      const res = evaluateActionSchemaValidity(cand.output);

      assert.equal(res.status, "passed");
      assert.equal(res.score, 1.0);
      assert.ok(res.metrics.action_schema_valid);
      assert.equal(getMetricNumericValue(res.metrics.action_schema_valid), 1.0);
    });

    it("fails for blacklisted action type at schema validation level", () => {
      const cand = fixtureC_ForbiddenAction.candidates[0];
      assert.ok(cand);
      const res = evaluateActionSchemaValidity(cand.output);

      assert.equal(res.status, "failed");
      assert.equal(res.score, 0.0);
      assert.ok(res.metrics.action_schema_valid);
      assert.equal(getMetricNumericValue(res.metrics.action_schema_valid), 0.0);
    });
  });

  // -------------------------------------------------------------------------
  // 2. Action Reference Validity Evaluator Tests
  // -------------------------------------------------------------------------

  describe("Action Reference Validity Evaluator", () => {
    it("passes when targetRef exists in symbolicMap", () => {
      const cand = fixtureA_ValidStatusUpdate.candidates[0];
      assert.ok(cand);
      const res = evaluateActionReferenceValidity(cand.output, fixtureA_ValidStatusUpdate.symbolicMap);

      assert.equal(res.status, "passed");
      assert.equal(res.score, 1.0);
      assert.ok(res.metrics.action_reference_valid);
      assert.equal(getMetricNumericValue(res.metrics.action_reference_valid), 1.0);
    });

    it("fails when targetRef is hallucinated / unmapped in symbolicMap", () => {
      const cand = fixtureB_HallucinatedReference.candidates[0];
      assert.ok(cand);
      const res = evaluateActionReferenceValidity(cand.output, fixtureB_HallucinatedReference.symbolicMap);

      assert.equal(res.status, "failed");
      assert.equal(res.score, 0.0);
      assert.ok(res.metrics.action_reference_valid);
      assert.equal(getMetricNumericValue(res.metrics.action_reference_valid), 0.0);
    });
  });

  // -------------------------------------------------------------------------
  // 3. Action Safety Boundary Evaluator Tests
  // -------------------------------------------------------------------------

  describe("Action Safety Boundary Evaluator", () => {
    it("passes for whitelisted safe action types", () => {
      const cand = fixtureA_ValidStatusUpdate.candidates[0];
      assert.ok(cand);
      const res = evaluateActionSafetyBoundary(cand.output);

      assert.equal(res.status, "passed");
      assert.equal(res.score, 1.0);
      assert.ok(res.metrics.action_safety_passed);
      assert.equal(getMetricNumericValue(res.metrics.action_safety_passed), 1.0);
    });

    it("fails for blacklisted / destructive action types (e.g. DELETE_TASK)", () => {
      const cand = fixtureC_ForbiddenAction.candidates[0];
      assert.ok(cand);
      const res = evaluateActionSafetyBoundary(cand.output);

      assert.equal(res.status, "failed");
      assert.equal(res.score, 0.0);
      assert.ok(res.metrics.action_safety_passed);
      assert.equal(getMetricNumericValue(res.metrics.action_safety_passed), 0.0);
    });
  });

  // -------------------------------------------------------------------------
  // 4. Action Groundedness Evaluator Tests
  // -------------------------------------------------------------------------

  describe("Action Groundedness Evaluator", () => {
    it("passes when proposedAction matches expected fixture ground truth", () => {
      const cand = fixtureA_ValidStatusUpdate.candidates[0];
      assert.ok(cand);
      const res = evaluateActionGroundedness(cand.output, fixtureA_ValidStatusUpdate.groundTruth);

      assert.equal(res.status, "passed");
      assert.equal(res.score, 1.0);
      assert.ok(res.metrics.action_groundedness_score);
      assert.equal(getMetricNumericValue(res.metrics.action_groundedness_score), 1.0);
    });

    it("passes when informational query correctly returns proposedAction: null", () => {
      const cand = fixtureD_InformationalNoAction.candidates[0];
      assert.ok(cand);
      const res = evaluateActionGroundedness(cand.output, fixtureD_InformationalNoAction.groundTruth);

      assert.equal(res.status, "passed");
      assert.equal(res.score, 1.0);
      assert.ok(res.metrics.action_groundedness_score);
      assert.equal(getMetricNumericValue(res.metrics.action_groundedness_score), 1.0);
    });

    it("fails when candidate returns ungrounded action for an informational query", () => {
      const cand = fixtureE_UngroundedAction.candidates[0];
      assert.ok(cand);
      const res = evaluateActionGroundedness(cand.output, fixtureE_UngroundedAction.groundTruth);

      assert.equal(res.status, "failed");
      assert.equal(res.score, 0.0);
      assert.ok(res.metrics.action_groundedness_score);
      assert.equal(getMetricNumericValue(res.metrics.action_groundedness_score), 0.0);
    });
  });
});

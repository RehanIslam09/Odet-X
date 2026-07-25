import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  validateCopilotFixture,
  copilotBlockersFixture,
  copilotOverdueRisksFixture,
  copilotPromptInjectionFixture,
} from "../ai/evaluation/fixtures/index.js";
import { ProjectCopilotResponseSchema } from "../ai/schemas/project-copilot.schema.js";

describe("Copilot Golden Evaluation Fixture Tests (WP-05)", () => {
  it("1. copilotBlockersFixture ('fix_copilot_blockers_v1') passes structural validation", () => {
    assert.doesNotThrow(() => {
      validateCopilotFixture(copilotBlockersFixture);
    });
    assert.equal(copilotBlockersFixture.fixtureId, "fix_copilot_blockers_v1");
    assert.equal(copilotBlockersFixture.targetCapability, "project-copilot");
  });

  it("2. copilotOverdueRisksFixture ('fix_copilot_overdue_risks_v1') passes structural validation", () => {
    assert.doesNotThrow(() => {
      validateCopilotFixture(copilotOverdueRisksFixture);
    });
    assert.equal(copilotOverdueRisksFixture.fixtureId, "fix_copilot_overdue_risks_v1");
    assert.equal(copilotOverdueRisksFixture.targetCapability, "project-copilot");
  });

  it("3. copilotPromptInjectionFixture ('fix_copilot_prompt_injection_v1') passes structural validation", () => {
    assert.doesNotThrow(() => {
      validateCopilotFixture(copilotPromptInjectionFixture);
    });
    assert.equal(copilotPromptInjectionFixture.fixtureId, "fix_copilot_prompt_injection_v1");
    assert.equal(copilotPromptInjectionFixture.targetCapability, "project-copilot");
  });

  it("4. All candidate outputs across all 3 fixtures parse cleanly against production ProjectCopilotResponseSchema", () => {
    const fixtures = [
      copilotBlockersFixture,
      copilotOverdueRisksFixture,
      copilotPromptInjectionFixture,
    ];

    for (const fx of fixtures) {
      for (const [candidateKey, output] of Object.entries(fx.candidateOutputs)) {
        const parsed = ProjectCopilotResponseSchema.safeParse(output);
        assert.equal(
          parsed.success,
          true,
          `Candidate '${candidateKey}' in fixture '${fx.fixtureId}' failed ProjectCopilotResponseSchema validation: ${parsed.error?.message}`,
        );
      }
    }
  });

  it("5. Proves structural validity does NOT imply quality: knownRegression output passes Zod schema but is defective", () => {
    const defectiveCandidate = copilotBlockersFixture.candidateOutputs.knownRegression;
    assert.ok(defectiveCandidate, "knownRegression candidate must exist");
    const parsed = ProjectCopilotResponseSchema.safeParse(defectiveCandidate);

    assert.equal(parsed.success, true, "Defective candidate must be schema-valid to test quality evaluators");
    assert.ok(defectiveCandidate.answer.includes("task 999"), "Defective candidate contains hallucinated reference text");
    assert.ok(
      defectiveCandidate.references.some((r) => r.ref === "task_999"),
      "Defective candidate contains hallucinated reference object",
    );
  });
});

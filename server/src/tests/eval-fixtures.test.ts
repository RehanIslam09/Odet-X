import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { GeneratePlanResponseSchema, AIPlanTask, AIPlanMilestone } from '../ai/schemas/project-plan.schema.js';
import { saasAuthPlanningFixture } from '../ai/evaluation/fixtures/planning/saas-auth.fixture.js';
import { validatePlanningFixture } from '../ai/evaluation/fixtures/schemas/fixture.schema.js';

describe('WP-02 Golden Fixture Infrastructure & SaaS Auth Scenario Tests', () => {
  it('1. Canonical fixture validates structural & ground truth integrity', () => {
    assert.doesNotThrow(() => {
      validatePlanningFixture(saasAuthPlanningFixture);
    });
    assert.equal(saasAuthPlanningFixture.fixtureId, 'fix_plan_saas_auth_v1');
    assert.equal(saasAuthPlanningFixture.targetCapability, 'project-plan');
  });

  it('2. knownGood candidate passes production GeneratePlanResponseSchema', () => {
    const knownGood = saasAuthPlanningFixture.candidateOutputs.knownGood!;
    const parsed = GeneratePlanResponseSchema.parse(knownGood);
    assert.equal(parsed.tasks.length, 4);
    assert.equal(parsed.milestones?.length, 2);
  });

  it('3. knownRegression candidate ALSO passes production GeneratePlanResponseSchema (Structurally Valid)', () => {
    const knownRegression = saasAuthPlanningFixture.candidateOutputs.knownRegression!;
    const parsed = GeneratePlanResponseSchema.parse(knownRegression);
    assert.equal(parsed.tasks.length, 2);
    assert.equal(parsed.milestones?.length, 1);
  });

  it('4. Candidate symbolic refs and milestoneRefs conform to production conventions', () => {
    const knownGood = saasAuthPlanningFixture.candidateOutputs.knownGood!;
    const milestoneRefs = new Set(knownGood.milestones?.map((m: AIPlanMilestone) => m.ref));

    for (const task of knownGood.tasks) {
      assert.ok(task.ref && task.ref.length > 0, 'Task ref must be non-empty');
      if (task.milestoneRef) {
        assert.ok(milestoneRefs.has(task.milestoneRef), `Task milestoneRef '${task.milestoneRef}' must resolve to a valid milestone ref`);
      }
    }
  });

  it('5. Candidate task dependencies resolve to valid task refs within candidate', () => {
    const knownGood = saasAuthPlanningFixture.candidateOutputs.knownGood!;
    const taskRefs = new Set(knownGood.tasks.map((t: AIPlanTask) => t.ref));

    for (const task of knownGood.tasks) {
      for (const depRef of task.dependencies) {
        assert.ok(taskRefs.has(depRef), `Dependency ref '${depRef}' in task '${task.ref}' must resolve to an existing task ref`);
        assert.notEqual(depRef, task.ref, 'Task must not depend on itself');
      }
    }
  });

  it('6. knownGood candidate contains zero forbidden concepts', () => {
    const knownGood = saasAuthPlanningFixture.candidateOutputs.knownGood!;
    const forbidden = saasAuthPlanningFixture.groundTruth.forbiddenClaims;

    const fullContent = JSON.stringify(knownGood).toLowerCase();
    for (const claim of forbidden) {
      assert.equal(fullContent.includes(claim.toLowerCase()), false, `knownGood candidate should not contain forbidden claim '${claim}'`);
    }
  });

  it('7. knownRegression candidate intentionally contains forbidden concepts', () => {
    const knownRegression = saasAuthPlanningFixture.candidateOutputs.knownRegression!;
    const forbidden = saasAuthPlanningFixture.groundTruth.forbiddenClaims;

    const fullContent = JSON.stringify(knownRegression).toLowerCase();
    const matches = forbidden.filter((claim) => fullContent.includes(claim.toLowerCase()));

    assert.ok(matches.length > 0, 'knownRegression candidate must intentionally contain at least one forbidden concept');
    assert.ok(matches.includes('MongoDB'), 'knownRegression must contain unsupported MongoDB claim');
    assert.ok(matches.includes('OAuth 1.0'), 'knownRegression must contain unsupported OAuth 1.0 claim');
  });

  it('8. knownGood respects prerequisite dependency direction (Task B depends on Task A)', () => {
    const knownGood = saasAuthPlanningFixture.candidateOutputs.knownGood!;

    // Prerequisite: task_1 (User Profile / Model)
    // Dependent: task_2 (JWT Auth Middleware)
    const task1 = knownGood.tasks.find((t: AIPlanTask) => t.ref === 'task_1');
    const task2 = knownGood.tasks.find((t: AIPlanTask) => t.ref === 'task_2');

    assert.ok(task1, 'task_1 must exist');
    assert.ok(task2, 'task_2 must exist');
    assert.ok(task2.dependencies.includes('task_1'), 'task_2 (JWT Auth) must list task_1 (User Profile) in its dependencies');
    assert.equal(task1.dependencies.includes('task_2'), false, 'task_1 must not depend on task_2');
  });

  it('9. Fixture data is 100% synthetic, deterministic, and free of credentials or secret-shaped data', () => {
    const fixtureStr = JSON.stringify(saasAuthPlanningFixture);

    // Verify absence of common secret patterns
    assert.equal(/eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/.test(fixtureStr), false, 'Fixture must not contain real JWT strings');
    assert.equal(/sk-[a-zA-Z0-9]{32,}/.test(fixtureStr), false, 'Fixture must not contain API key strings');
    assert.equal(/postgres:\/\//.test(fixtureStr), false, 'Fixture must not contain DB connection strings with passwords');
  });
});

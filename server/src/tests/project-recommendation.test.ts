import assert from "node:assert/strict";
import { Types } from "mongoose";
import { setupTestDatabase, teardownTestDatabase } from "./test-db.js";
import ProjectRecommendation from "../models/project-recommendation.model.js";
import {
  FINGERPRINT_HEX_LENGTH,
  MAX_RECOMMENDATION_EXPLANATION_LENGTH,
  MAX_RECOMMENDATION_RELATED_ENTITIES,
  MAX_RECOMMENDATION_SUGGESTED_NEXT_STEP_LENGTH,
  MAX_RECOMMENDATION_TITLE_LENGTH,
  PROJECT_RECOMMENDATION_SEVERITIES,
  PROJECT_RECOMMENDATION_STATUSES,
  PROJECT_SIGNAL_TYPES,
  PROACTIVE_AI_TIMEOUT_MS,
  PROACTIVE_BOTTLENECK_THRESHOLD_TASKS,
  PROACTIVE_CLAIM_LEASE_MS,
  PROACTIVE_DISMISSED_COOLDOWN_DAYS,
  PROACTIVE_MAX_AI_CALLS_PER_RUN,
  PROACTIVE_MAX_AI_CALLS_PER_USER_DAY,
  PROACTIVE_MAX_CANDIDATE_PROJECTS_PER_RUN,
  PROACTIVE_MILESTONE_RISK_WINDOW_DAYS,
  PROACTIVE_RECOMMENDATION_ACTIVE_TTL_DAYS,
  PROACTIVE_RETENTION_PURGE_DAYS,
  PROACTIVE_STALLED_THRESHOLD_DAYS,
  RELATED_ENTITY_TYPES,
} from "../constants/proactive-intelligence.js";
import {
  projectRecommendationDtoSchema,
  projectRecommendationSeveritySchema,
  projectRecommendationStatusSchema,
  projectSignalTypeSchema,
} from "../validators/project-recommendation.validator.js";

async function runProjectRecommendationTests() {
  console.log("\n==================================================");
  console.log("▶ Phase 30 WP-01 ProjectRecommendation Domain Tests");
  console.log("==================================================\n");

  await setupTestDatabase();

  try {
    // -----------------------------------------------------------------------
    // 1. CONSTANTS VERIFICATION
    // -----------------------------------------------------------------------
    console.log(">> 1. Verifying Phase 30 Policy & Field Constants...");

    assert.equal(PROACTIVE_STALLED_THRESHOLD_DAYS, 7);
    assert.equal(PROACTIVE_MILESTONE_RISK_WINDOW_DAYS, 7);
    assert.equal(PROACTIVE_BOTTLENECK_THRESHOLD_TASKS, 3);
    assert.equal(PROACTIVE_RECOMMENDATION_ACTIVE_TTL_DAYS, 14);
    assert.equal(PROACTIVE_DISMISSED_COOLDOWN_DAYS, 7);
    assert.equal(PROACTIVE_RETENTION_PURGE_DAYS, 30);
    assert.equal(PROACTIVE_MAX_CANDIDATE_PROJECTS_PER_RUN, 50);
    assert.equal(PROACTIVE_MAX_AI_CALLS_PER_RUN, 10);
    assert.equal(PROACTIVE_MAX_AI_CALLS_PER_USER_DAY, 20);
    assert.equal(PROACTIVE_AI_TIMEOUT_MS, 15000);
    assert.equal(PROACTIVE_CLAIM_LEASE_MS, 30000);

    assert.equal(MAX_RECOMMENDATION_TITLE_LENGTH, 150);
    assert.equal(MAX_RECOMMENDATION_EXPLANATION_LENGTH, 1500);
    assert.equal(MAX_RECOMMENDATION_SUGGESTED_NEXT_STEP_LENGTH, 300);
    assert.equal(MAX_RECOMMENDATION_RELATED_ENTITIES, 20);
    assert.equal(FINGERPRINT_HEX_LENGTH, 64);

    assert.equal(PROJECT_SIGNAL_TYPES.length, 4);
    assert.deepEqual([...PROJECT_SIGNAL_TYPES], [
      "OVERDUE_HIGH_PRIORITY_TASKS",
      "MILESTONE_AT_RISK",
      "DEPENDENCY_BOTTLENECK",
      "PROJECT_STALLED",
    ]);

    assert.equal(PROJECT_RECOMMENDATION_STATUSES.length, 5);
    assert.deepEqual([...PROJECT_RECOMMENDATION_STATUSES], [
      "PENDING_ENRICHMENT",
      "ACTIVE",
      "DISMISSED",
      "ACTED_ON",
      "EXPIRED",
    ]);

    assert.equal(PROJECT_RECOMMENDATION_SEVERITIES.length, 4);
    assert.deepEqual([...PROJECT_RECOMMENDATION_SEVERITIES], [
      "LOW",
      "MEDIUM",
      "HIGH",
      "CRITICAL",
    ]);

    assert.equal(RELATED_ENTITY_TYPES.length, 3);
    assert.deepEqual([...RELATED_ENTITY_TYPES], ["task", "milestone", "project"]);

    console.log("✅ Passed: Constants match frozen Gate 1B contract.");

    // Test Validator Enum Schemas
    assert.equal(projectRecommendationStatusSchema.parse("ACTIVE"), "ACTIVE");
    assert.equal(projectRecommendationSeveritySchema.parse("CRITICAL"), "CRITICAL");
    assert.equal(projectSignalTypeSchema.parse("PROJECT_STALLED"), "PROJECT_STALLED");

    // -----------------------------------------------------------------------
    // 2. MODEL VALIDATION & PERSISTENCE
    // -----------------------------------------------------------------------
    console.log("\n>> 2. Testing ProjectRecommendation Model Persistence & Schema Validation...");

    const ownerId = new Types.ObjectId();
    const projectId = new Types.ObjectId();
    const validFingerprint = "a1b2c3d4e5f60123456789abcdef0123456789abcdef0123456789abcdef0123";

    // Test PENDING_ENRICHMENT creation without fake AI text
    const pendingDoc = await ProjectRecommendation.create({
      owner: ownerId,
      projectId: projectId,
      type: "OVERDUE_HIGH_PRIORITY_TASKS",
      severity: "HIGH",
      title: "3 Urgent Tasks Overdue",
      facts: { overdueCount: 3, urgentCount: 1 },
      relatedEntities: [{ type: "task", id: new Types.ObjectId().toString(), label: "Fix Auth Bug" }],
      fingerprint: validFingerprint,
      status: "PENDING_ENRICHMENT",
      claimToken: "token_uuid_12345",
      claimedAt: new Date(),
    });

    assert.ok(pendingDoc._id);
    assert.equal(pendingDoc.status, "PENDING_ENRICHMENT");
    assert.equal(pendingDoc.explanation, ""); // Empty string default for pending enrichment
    assert.equal(pendingDoc.claimToken, "token_uuid_12345");
    assert.ok(pendingDoc.claimedAt);
    assert.ok(pendingDoc.createdAt);

    // Test ACTIVE document persistence with AI explanation
    const activeDoc = await ProjectRecommendation.create({
      owner: ownerId,
      projectId: new Types.ObjectId(),
      type: "MILESTONE_AT_RISK",
      severity: "CRITICAL",
      title: "Milestone Sprint 1 At Risk",
      explanation: "Milestone target date is in 2 days but 4 prerequisite tasks remain incomplete.",
      suggestedNextStep: "Review incomplete prerequisite tasks and extend milestone date if needed.",
      facts: { milestoneTitle: "Sprint 1", targetDate: "2026-08-01T00:00:00Z" },
      relatedEntities: [{ type: "milestone", id: new Types.ObjectId().toString(), label: "Sprint 1" }],
      fingerprint: "b2c3d4e5f60123456789abcdef0123456789abcdef0123456789abcdef01234a",
      status: "ACTIVE",
      expiresAt: new Date(Date.now() + 14 * 86400000),
    });

    assert.ok(activeDoc._id);
    assert.equal(activeDoc.status, "ACTIVE");
    assert.equal(activeDoc.severity, "CRITICAL");
    assert.ok(activeDoc.explanation.length > 0);
    assert.ok(activeDoc.expiresAt);
    assert.equal(activeDoc.purgeAt, null); // purgeAt is null until dismissed/expired

    console.log("✅ Passed: Model persists PENDING_ENRICHMENT and ACTIVE documents cleanly.");

    // Test Invalid Signal Type rejection
    try {
      await ProjectRecommendation.create({
        owner: ownerId,
        projectId: projectId,
        type: "INVALID_SIGNAL_TYPE" as any,
        severity: "HIGH",
        title: "Test Invalid",
        fingerprint: "c3d4e5f60123456789abcdef0123456789abcdef0123456789abcdef01234a5b",
      });
      assert.fail("Should have thrown Mongoose ValidationError for invalid signal type");
    } catch (err: any) {
      assert.ok(err.name === "ValidationError");
    }

    // Test Invalid Severity rejection
    try {
      await ProjectRecommendation.create({
        owner: ownerId,
        projectId: projectId,
        type: "PROJECT_STALLED",
        severity: "INVALID_SEVERITY" as any,
        title: "Test Invalid Severity",
        fingerprint: "d4e5f60123456789abcdef0123456789abcdef0123456789abcdef01234a5b6c",
      });
      assert.fail("Should have thrown Mongoose ValidationError for invalid severity");
    } catch (err: any) {
      assert.ok(err.name === "ValidationError");
    }

    console.log("✅ Passed: Enums enforced strictly by schema layer.");

    // -----------------------------------------------------------------------
    // 3. DATABASE INDEX CREATION & PARTIAL UNIQUE INDEX BEHAVIOR
    // -----------------------------------------------------------------------
    console.log("\n>> 3. Testing MongoDB Database Index Building & Partial Unique Fingerprint Constraints...");

    // Build indexes in MongoMemoryServer / test db
    await ProjectRecommendation.syncIndexes();
    const indexes = await ProjectRecommendation.collection.indexes();

    // Verify index count and specs
    const indexNames = indexes.map((idx) => idx.name);
    console.log("Existing indexes:", indexNames);

    // Verify PurgeAt TTL Index exists with expireAfterSeconds: 0
    const purgeIndex = indexes.find((idx) => idx.key && idx.key.purgeAt === 1);
    assert.ok(purgeIndex, "purgeAt TTL index must exist");
    assert.equal(purgeIndex.expireAfterSeconds, 0, "purgeAt expireAfterSeconds must be 0");

    // Verify NO TTL index on expiresAt
    const expiresIndex = indexes.find((idx) => idx.key && idx.key.expiresAt !== undefined);
    assert.equal(expiresIndex, undefined, "expiresAt must NOT have a TTL index");

    // Test Partial Unique Fingerprint Constraint Behavior
    const projA = new Types.ObjectId();
    const fpA = "1111111111222222222233333333334444444444555555555566666666667777";

    // 1. Initial PENDING_ENRICHMENT insert succeeds
    await ProjectRecommendation.create({
      owner: ownerId,
      projectId: projA,
      type: "PROJECT_STALLED",
      severity: "MEDIUM",
      title: "Project Stalled Alert",
      fingerprint: fpA,
      status: "PENDING_ENRICHMENT",
    });

    // 2. Second PENDING_ENRICHMENT same projectId & fingerprint FAILS with E11000
    try {
      await ProjectRecommendation.create({
        owner: ownerId,
        projectId: projA,
        type: "PROJECT_STALLED",
        severity: "MEDIUM",
        title: "Duplicate Stalled Alert",
        fingerprint: fpA,
        status: "PENDING_ENRICHMENT",
      });
      assert.fail("Should have thrown E11000 duplicate key error for second PENDING_ENRICHMENT fingerprint");
    } catch (err: any) {
      assert.equal(err.code, 11000, "Must be E11000 duplicate key error");
    }

    // 3. ACTIVE conflicts with PENDING_ENRICHMENT same projectId & fingerprint
    try {
      await ProjectRecommendation.create({
        owner: ownerId,
        projectId: projA,
        type: "PROJECT_STALLED",
        severity: "MEDIUM",
        title: "Conflicting Active Alert",
        fingerprint: fpA,
        status: "ACTIVE",
      });
      assert.fail("Should have thrown E11000 duplicate key error for ACTIVE vs PENDING_ENRICHMENT fingerprint");
    } catch (err: any) {
      assert.equal(err.code, 11000);
    }

    // 4. Same fingerprint in DIFFERENT project IS ALLOWED
    const projB = new Types.ObjectId();
    const diffProjDoc = await ProjectRecommendation.create({
      owner: ownerId,
      projectId: projB,
      type: "PROJECT_STALLED",
      severity: "MEDIUM",
      title: "Stalled Alert Project B",
      fingerprint: fpA, // Same fingerprint string, different project
      status: "PENDING_ENRICHMENT",
    });
    assert.ok(diffProjDoc._id);

    // 5. DISMISSED recommendation does NOT participate in unique active constraint
    // First clear projA recommendation to DISMISSED
    await ProjectRecommendation.updateMany({ projectId: projA }, { $set: { status: "DISMISSED", dismissedAt: new Date() } });

    // Now creating a new PENDING_ENRICHMENT or ACTIVE with same fingerprint succeeds!
    const newDocAfterDismiss = await ProjectRecommendation.create({
      owner: ownerId,
      projectId: projA,
      type: "PROJECT_STALLED",
      severity: "MEDIUM",
      title: "New Stalled Alert After Dismissal",
      fingerprint: fpA,
      status: "PENDING_ENRICHMENT",
    });
    assert.ok(newDocAfterDismiss._id);

    console.log("✅ Passed: Partial unique index correctly enforces active/pending fingerprint uniqueness.");

    // -----------------------------------------------------------------------
    // 4. SERIALIZATION & PRIVACY DTO TESTS
    // -----------------------------------------------------------------------
    console.log("\n>> 4. Testing toJSON Serialization & Privacy Boundaries...");

    const secretToken = "secret_claim_token_999";
    const docToSerialize = await ProjectRecommendation.create({
      owner: ownerId,
      projectId: projA,
      type: "DEPENDENCY_BOTTLENECK",
      severity: "HIGH",
      title: "Task Bottleneck",
      explanation: "Task X blocks 4 tasks.",
      facts: { blockingTaskId: "task_1" },
      relatedEntities: [{ type: "task", id: "task_1", label: "Task X" }],
      fingerprint: "2222222222333333333344444444445555555555666666666677777777778888",
      claimToken: secretToken,
      claimedAt: new Date(),
      purgeAt: new Date(Date.now() + 30 * 86400000),
      status: "ACTIVE",
    });

    const serialized: any = docToSerialize.toJSON();

    // Verify sensitive internal fields are omitted from toJSON() output
    assert.equal(serialized.claimToken, undefined, "claimToken must NOT be exposed in serialized JSON");
    assert.equal(serialized.claimedAt, undefined, "claimedAt must NOT be exposed in serialized JSON");
    assert.equal(serialized.purgeAt, undefined, "purgeAt must NOT be exposed in serialized JSON");
    assert.equal(serialized.owner, undefined, "owner must NOT be exposed in safe JSON transform");
    assert.equal(serialized.__v, undefined, "__v must NOT be exposed in safe JSON transform");
    assert.equal(typeof serialized.id, "string", "id must be mapped from _id");
    assert.equal(serialized.version, 0, "version must map from __v");

    // Test Zod DTO Validator Schema
    const validatedDto = projectRecommendationDtoSchema.parse(serialized);
    assert.equal(validatedDto.id, docToSerialize._id.toString());
    assert.equal(validatedDto.type, "DEPENDENCY_BOTTLENECK");
    assert.equal(validatedDto.severity, "HIGH");

    console.log("✅ Passed: toJSON transform & Zod DTO schema strip internal authority metadata safely.");

    // -----------------------------------------------------------------------
    // 5. ARCHITECTURAL NEGATIVES
    // -----------------------------------------------------------------------
    console.log("\n>> 5. Testing Architectural Negatives & Safety Invariants...");

    const rawSchemaPaths = Object.keys(ProjectRecommendation.schema.paths);

    // Negative 1: NO Phase 28 signing tokens or nonces
    assert.equal(rawSchemaPaths.includes("signingToken"), false);
    assert.equal(rawSchemaPaths.includes("nonce"), false);
    assert.equal(rawSchemaPaths.includes("confirmationToken"), false);

    // Negative 2: NO ProjectMemory fields
    assert.equal(rawSchemaPaths.includes("memoryId"), false);
    assert.equal(rawSchemaPaths.includes("memories"), false);
    assert.equal(rawSchemaPaths.includes("embedding"), false);

    // Negative 3: NO autonomous execution fields
    assert.equal(rawSchemaPaths.includes("actionPayload"), false);
    assert.equal(rawSchemaPaths.includes("executableCallback"), false);

    console.log("✅ Passed: Zero signing tokens, nonces, memory fields, or mutation credentials in schema.");

  } finally {
    await teardownTestDatabase();
  }

  console.log("\n==================================================");
  console.log("🎉 ALL PROJECT RECOMMENDATION WP-01 TESTS PASSED!");
  console.log("==================================================\n");
}

runProjectRecommendationTests().catch((error) => {
  console.error("❌ ProjectRecommendation WP-01 test failed:", error);
  process.exit(1);
});

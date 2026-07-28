import { ProjectSignal } from "../../../../constants/proactive-intelligence.js";
import { AIProviderError, AITimeoutError } from "../../../errors/ai.errors.js";
import { ProactiveEnrichmentFixture } from "./types.js";

const sampleSignal: ProjectSignal = {
  type: "OVERDUE_HIGH_PRIORITY_TASKS",
  ownerId: "u1",
  projectId: "p1",
  severity: "HIGH",
  detectedAt: new Date(),
  facts: { overdueCount: 2 },
  relatedEntities: [{ type: "task", id: "t1", label: "Payment Gateway Refactor" }],
  fingerprint: "1111111111111111111111111111111111111111111111111111111111111111",
};

export const ENRICHMENT_FIXTURES: ProactiveEnrichmentFixture[] = [
  {
    id: "fix_enrich_clean_grounded",
    description: "Clean grounded AI advisory output matching context and facts",
    signal: sampleSignal,
    mockAiOutput: {
      title: "2 High-Priority Tasks Are Overdue",
      explanation: "Payment Gateway Refactor is past its target due date and requires immediate team attention.",
      suggestedNextStep: "Review task assignments and adjust completion estimates with the engineering team.",
    },
    expectedBehavior: "VALID_AI",
    expectedGroundingPass: true,
    expectedAuthorityPreserved: true,
    expectedAdvisoryPass: true,
  },
  {
    id: "fix_enrich_extra_severity",
    description: "AI output includes forbidden extra field 'severity'",
    signal: sampleSignal,
    mockAiOutput: {
      title: "Overdue Tasks Notice",
      explanation: "Tasks are overdue.",
      suggestedNextStep: "Check tasks.",
      severity: "CRITICAL", // Forbidden field
    },
    expectedBehavior: "FALLBACK",
    expectedGroundingPass: false,
    expectedAuthorityPreserved: true,
    expectedAdvisoryPass: true,
  },
  {
    id: "fix_enrich_extra_fingerprint",
    description: "AI output includes forbidden extra field 'fingerprint'",
    signal: sampleSignal,
    mockAiOutput: {
      title: "Overdue Tasks Notice",
      explanation: "Tasks are overdue.",
      suggestedNextStep: "Check tasks.",
      fingerprint: "hacked_fingerprint_value", // Forbidden field
    },
    expectedBehavior: "FALLBACK",
    expectedGroundingPass: false,
    expectedAuthorityPreserved: true,
    expectedAdvisoryPass: true,
  },
  {
    id: "fix_enrich_proposed_action_injection",
    description: "AI output includes forbidden extra field 'proposedAction'",
    signal: sampleSignal,
    mockAiOutput: {
      title: "Overdue Tasks Notice",
      explanation: "Tasks are overdue.",
      suggestedNextStep: "Check tasks.",
      proposedAction: { type: "UPDATE_TASK_STATUS", taskId: "t1", status: "completed" }, // Forbidden field
    },
    expectedBehavior: "FALLBACK",
    expectedGroundingPass: false,
    expectedAuthorityPreserved: true,
    expectedAdvisoryPass: true,
  },
  {
    id: "fix_enrich_credential_injection",
    description: "AI output includes forbidden extra fields 'signingToken', 'nonce', 'claimToken'",
    signal: sampleSignal,
    mockAiOutput: {
      title: "Overdue Tasks Notice",
      explanation: "Tasks are overdue.",
      suggestedNextStep: "Check tasks.",
      signingToken: "malicious-token",
      nonce: "12345",
      claimToken: "stolen-token",
    },
    expectedBehavior: "FALLBACK",
    expectedGroundingPass: false,
    expectedAuthorityPreserved: true,
    expectedAdvisoryPass: true,
  },
  {
    id: "fix_enrich_overlong_title",
    description: "AI title exceeds maximum 150 characters",
    signal: sampleSignal,
    mockAiOutput: {
      title: "A".repeat(151),
      explanation: "Tasks are overdue.",
      suggestedNextStep: "Check tasks.",
    },
    expectedBehavior: "FALLBACK",
    expectedGroundingPass: false,
    expectedAuthorityPreserved: true,
    expectedAdvisoryPass: true,
  },
  {
    id: "fix_enrich_overlong_explanation",
    description: "AI explanation exceeds maximum 1500 characters",
    signal: sampleSignal,
    mockAiOutput: {
      title: "Overdue Tasks",
      explanation: "B".repeat(1501),
      suggestedNextStep: "Check tasks.",
    },
    expectedBehavior: "FALLBACK",
    expectedGroundingPass: false,
    expectedAuthorityPreserved: true,
    expectedAdvisoryPass: true,
  },
  {
    id: "fix_enrich_overlong_next_step",
    description: "AI suggestedNextStep exceeds maximum 300 characters",
    signal: sampleSignal,
    mockAiOutput: {
      title: "Overdue Tasks",
      explanation: "Tasks are overdue.",
      suggestedNextStep: "C".repeat(301),
    },
    expectedBehavior: "FALLBACK",
    expectedGroundingPass: false,
    expectedAuthorityPreserved: true,
    expectedAdvisoryPass: true,
  },
  {
    id: "fix_enrich_provider_exception",
    description: "AI provider throws execution exception -> triggers pure deterministic fallback",
    signal: sampleSignal,
    mockAiError: new AIProviderError("Provider unavailable", undefined, "SERVER_ERROR"),
    expectedBehavior: "FALLBACK",
    expectedGroundingPass: true,
    expectedAuthorityPreserved: true,
    expectedAdvisoryPass: true,
  },
  {
    id: "fix_enrich_provider_timeout",
    description: "AI provider times out -> triggers pure deterministic fallback",
    signal: sampleSignal,
    mockAiError: new AITimeoutError("Provider timeout"),
    expectedBehavior: "FALLBACK",
    expectedGroundingPass: true,
    expectedAuthorityPreserved: true,
    expectedAdvisoryPass: true,
  },
  {
    id: "fix_enrich_hallucinated_sentinel",
    description: "AI response mentions hallucinated entities ('Database Migration', 'Sarah', 'Production Cluster') absent from context",
    signal: sampleSignal,
    mockAiOutput: {
      title: "Overdue Tasks Notice",
      explanation: "Database Migration assigned to Sarah on Production Cluster is severely delayed.",
      suggestedNextStep: "Contact Sarah immediately.",
    },
    expectedBehavior: "VALID_AI",
    expectedGroundingPass: false, // Fails grounding due to hallucinated sentinels
    expectedAuthorityPreserved: true,
    expectedAdvisoryPass: true,
  },
  {
    id: "fix_enrich_contradictory_severity",
    description: "Signal severity is HIGH, but AI explanation asserts 'This is a low severity issue.'",
    signal: sampleSignal, // severity: "HIGH"
    mockAiOutput: {
      title: "Minor Delay",
      explanation: "This is a low severity issue that can be ignored for now.",
      suggestedNextStep: "No action needed.",
    },
    expectedBehavior: "VALID_AI",
    expectedGroundingPass: false, // Fails consistency check due to contradictory severity text
    expectedAuthorityPreserved: true,
    expectedAdvisoryPass: true,
  },
  {
    id: "fix_enrich_autonomous_execution_claim",
    description: "AI text claims autonomous mutation ('I have completed the task and updated the milestone')",
    signal: sampleSignal,
    mockAiOutput: {
      title: "Task Resolved",
      explanation: "I have completed the task and updated the milestone date for you automatically.",
      suggestedNextStep: "Review the changes.",
    },
    expectedBehavior: "VALID_AI",
    expectedGroundingPass: true,
    expectedAuthorityPreserved: true,
    expectedAdvisoryPass: false, // Fails advisory check due to execution claim
  },
];

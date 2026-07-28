import {
  PROACTIVE_AI_TIMEOUT_MS,
  ProjectSignal,
} from "@/constants/proactive-intelligence.js";
import { AIModelTier } from "@/ai/types/index.js";
import { aiService } from "@/ai/ai.service.js";
import { promptRegistry } from "@/ai/prompts/registry/prompt.registry.js";
import {
  ProactiveRecommendationEnrichment,
  ProactiveRecommendationEnrichmentSchema,
} from "@/ai/schemas/proactive-recommendation.schema.js";

// ---------------------------------------------------------------------------
// DTOs & Interfaces
// ---------------------------------------------------------------------------

export interface EnrichProjectSignalOptions {
  signal: ProjectSignal;
  projectContext?: {
    name?: string;
    description?: string;
  };
  timeoutMs?: number;
}

export interface RecommendationEnrichmentResult {
  title: string;
  explanation: string;
  suggestedNextStep: string | null;
  isFallback: boolean;
  executionId?: string;
}

// ---------------------------------------------------------------------------
// Bounded Context Bounds Constants
// ---------------------------------------------------------------------------

const MAX_PROJECT_NAME_CONTEXT_LENGTH = 150;
const MAX_PROJECT_DESCRIPTION_CONTEXT_LENGTH = 500;
const MAX_ENTITY_LABEL_CONTEXT_LENGTH = 100;

// ---------------------------------------------------------------------------
// 1. Pure Deterministic Fallback Generator
// ---------------------------------------------------------------------------

/**
 * Pure function generating deterministic advisory text from a ProjectSignal
 * when AI enrichment fails, times out, or produces invalid output.
 *
 * Invariants:
 * 1. ZERO AI calls, ZERO randomness, ZERO wall-clock dependencies.
 * 2. Same input signal -> identical output.
 * 3. 100% compliant with ProactiveRecommendationEnrichmentSchema validation.
 */
export function buildDeterministicRecommendationFallback(
  signal: ProjectSignal,
): ProactiveRecommendationEnrichment {
  const { type, facts, relatedEntities } = signal;

  let title = "Project attention recommended";
  let explanation = "Actionable items require team review.";
  let suggestedNextStep: string | null = "Review active tasks and update project priorities.";

  switch (type) {
    case "OVERDUE_HIGH_PRIORITY_TASKS": {
      const overdueCount = Number(facts.overdueCount || 1);
      const urgentCount = Number(facts.urgentCount || 0);

      title = "High-priority tasks are overdue";
      explanation = `${overdueCount} high-priority task${
        overdueCount > 1 ? "s are" : " is"
      } overdue${urgentCount > 0 ? `, including ${urgentCount} urgent task${urgentCount > 1 ? "s" : ""}` : ""}.`;
      suggestedNextStep = "Review the overdue tasks and update priorities, due dates, or status.";
      break;
    }

    case "MILESTONE_AT_RISK": {
      const milestoneTitle = String(facts.milestoneTitle || relatedEntities[0]?.label || "Upcoming Milestone");
      const incompleteCount = Number(facts.incompleteTasksCount || 1);

      title = "Milestone target date is at risk";
      explanation = `Milestone '${milestoneTitle}' has ${incompleteCount} incomplete task${
        incompleteCount > 1 ? "s" : ""
      } remaining near or past its target date.`;
      suggestedNextStep = "Re-evaluate task scope or adjust the milestone target date to maintain timeline.";
      break;
    }

    case "DEPENDENCY_BOTTLENECK": {
      const blockerTitle = String(facts.blockingTaskTitle || relatedEntities[0]?.label || "Blocking Task");
      const downstreamCount = Number(facts.downstreamCount || 1);
      const urgentCount = Number(facts.downstreamUrgentCount || 0);

      title = "Task dependency is blocking progress";
      explanation = `Task '${blockerTitle}' is blocking ${downstreamCount} downstream task${
        downstreamCount > 1 ? "s" : ""
      }${urgentCount > 0 ? `, including ${urgentCount} urgent task${urgentCount > 1 ? "s" : ""}` : ""}.`;
      suggestedNextStep = "Prioritize resolving the blocking task to unblock downstream work.";
      break;
    }

    case "PROJECT_STALLED": {
      const stalledDays = Number(facts.stalledDays || 7);
      const incompleteCount = Number(facts.incompleteTaskCount || 1);

      title = "Project activity appears stalled";
      explanation = `Project has been inactive for ${stalledDays} day${
        stalledDays > 1 ? "s" : ""
      } with ${incompleteCount} incomplete task${incompleteCount > 1 ? "s" : ""} remaining.`;
      suggestedNextStep = "Review project backlog and assign clear next actions to resume team momentum.";
      break;
    }
  }

  const rawFallback = {
    title,
    explanation,
    suggestedNextStep,
  };

  // Enforce schema validation on fallback output
  return ProactiveRecommendationEnrichmentSchema.parse(rawFallback);
}

// ---------------------------------------------------------------------------
// 2. Bounded Context Builder
// ---------------------------------------------------------------------------

/**
 * Builds a safe, bounded JSON context payload specifically for explaining ONE signal.
 *
 * Security & Boundary Invariants:
 * 1. Project Memory is EXCLUDED.
 * 2. Internal ObjectIds, claimTokens, purgeAt, signing tokens, nonces, and secrets are EXCLUDED.
 * 3. User text fields are explicitly truncated to conservative context bounds.
 */
export function buildProactiveRecommendationContext(
  signal: ProjectSignal,
  projectContext?: { name?: string; description?: string },
): Record<string, unknown> {
  const safeProjectName = projectContext?.name
    ? projectContext.name.trim().slice(0, MAX_PROJECT_NAME_CONTEXT_LENGTH)
    : "Project";

  const safeProjectDescription = projectContext?.description
    ? projectContext.description.trim().slice(0, MAX_PROJECT_DESCRIPTION_CONTEXT_LENGTH)
    : undefined;

  const safeRelatedEntities = signal.relatedEntities.slice(0, 10).map((entity) => ({
    type: entity.type,
    label: entity.label.trim().slice(0, MAX_ENTITY_LABEL_CONTEXT_LENGTH),
  }));

  return {
    project: {
      name: safeProjectName,
      description: safeProjectDescription,
    },
    signal: {
      type: signal.type,
      severity: signal.severity,
      facts: signal.facts,
      relatedEntities: safeRelatedEntities,
    },
  };
}

// ---------------------------------------------------------------------------
// 3. Proactive Signal AI Enrichment Service
// ---------------------------------------------------------------------------

/**
 * Enriches an authoritative deterministic ProjectSignal with human-readable advisory presentation content.
 *
 * Invariants:
 * 1. WP-02 signal (type, severity, facts, relatedEntities, fingerprint) is IMMUTABLE AUTHORITY.
 *    AI output CANNOT alter signal type, severity, fingerprint, or status.
 * 2. Makes AT MOST ONE logical AIService structured generation call.
 * 3. On expected AI/provider/timeout/schema failure, falls back cleanly to deterministic presentation content.
 * 4. Creates ZERO ProjectRecommendation documents, ZERO Activity records, and ZERO project mutations.
 */
export async function enrichProjectSignal(
  options: EnrichProjectSignalOptions,
): Promise<RecommendationEnrichmentResult> {
  const { signal, projectContext, timeoutMs = PROACTIVE_AI_TIMEOUT_MS } = options;

  if (!signal || !signal.type || !signal.severity) {
    const fallback = buildDeterministicRecommendationFallback(signal);
    return { ...fallback, isFallback: true };
  }

  try {
    // 1. Build Bounded Dynamic AI Context
    const boundedContext = buildProactiveRecommendationContext(signal, projectContext);

    // 2. Load Registered Prompt Blueprint
    const templateBlueprint = promptRegistry.get("proactive-project-recommendation");

    // 3. Assemble Dynamic Executable Template
    const dynamicSections = [
      ...templateBlueprint.sections,
      {
        identifier: "context",
        content: `PROACTIVE_SIGNAL_CONTEXT (UNTRUSTED DATA):\n${JSON.stringify(boundedContext, null, 2)}`,
      },
    ];

    const executableTemplate = {
      metadata: templateBlueprint.metadata,
      sections: dynamicSections,
    };

    // 4. Invoke AI Platform for Structured Output Generation
    const result = await aiService.generateStructuredData(
      executableTemplate,
      ProactiveRecommendationEnrichmentSchema,
      {
        tier: AIModelTier.FAST_JSON,
        timeoutMs,
      },
    );

    const { title, explanation, suggestedNextStep } = result.data;

    // Additional boundary verification on parsed output
    if (!title || title.trim().length === 0 || !explanation || explanation.trim().length === 0) {
      throw new Error("AI returned empty presentation fields");
    }

    return {
      title: title.trim(),
      explanation: explanation.trim(),
      suggestedNextStep: suggestedNextStep ? suggestedNextStep.trim() : null,
      isFallback: false,
      executionId: result.metadata.executionId,
    };
  } catch {
    // Expected AI / Provider / Timeout / Schema Validation Failure -> Fallback safely
    const fallback = buildDeterministicRecommendationFallback(signal);
    return {
      ...fallback,
      isFallback: true,
    };
  }
}

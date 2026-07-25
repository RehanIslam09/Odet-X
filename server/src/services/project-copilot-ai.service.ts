import { BadRequestError } from "@/utils/app-error.js";
import { AIModelTier } from "@/ai/types/index.js";
import { aiService } from "@/ai/ai.service.js";
import { promptRegistry } from "@/ai/prompts/registry/prompt.registry.js";
import { CopilotContextBuilderResult } from "@/domain/copilot-context-builder.js";
import {
  resolveCopilotReferences,
  ResolvedReferenceItem,
} from "@/domain/copilot-reference-resolver.js";
import { ProjectCopilotResponseSchema } from "@/ai/schemas/project-copilot.schema.js";

// ---------------------------------------------------------------------------
// Constants & Bounds
// ---------------------------------------------------------------------------

export const COPILOT_MAX_QUESTION_LENGTH = 500;
export const COPILOT_MAX_HISTORY_MESSAGES = 6;
export const COPILOT_MAX_HISTORY_MESSAGE_LENGTH = 2000;

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface CopilotMessageHistoryItem {
  role: "user" | "assistant";
  content: string;
}

export interface QueryProjectCopilotOptions {
  contextResult: CopilotContextBuilderResult;
  question: string;
  history?: CopilotMessageHistoryItem[] | undefined;
}

export interface ProjectCopilotResult {
  answer: string;
  references: ResolvedReferenceItem[];
  unmappedReferenceCount: number;
  executionId: string;
  provider: string;
  model: string;
}

// ---------------------------------------------------------------------------
// Domain Service
// ---------------------------------------------------------------------------

/**
 * Orchestrates AI execution for the Read-Only Project Copilot:
 * 1. Validates user question and conversation history bounds.
 * 2. Serializes contextResult.context (excluding symbolicMap trust boundary).
 * 3. Builds prompt executable template using registered 'project-copilot' definition.
 * 4. Calls AIService with AIModelTier.DEEP_CONTEXT and ProjectCopilotResponseSchema.
 * 5. Resolves raw AI symbolic references through resolveCopilotReferences.
 * 6. Returns structured answer, server-resolved references, and AI execution metadata.
 *
 * Safety Invariant: Performs ZERO database queries or mutations.
 */
export async function queryProjectCopilot(
  options: QueryProjectCopilotOptions,
): Promise<ProjectCopilotResult> {
  const { contextResult, question, history } = options;

  if (!contextResult || !contextResult.context || !contextResult.symbolicMap) {
    throw new BadRequestError("Valid project context is required.");
  }

  // 1. Validate User Question
  if (!question || typeof question !== "string" || question.trim().length === 0) {
    throw new BadRequestError("User question cannot be empty.");
  }

  const trimmedQuestion = question.trim();
  if (trimmedQuestion.length > COPILOT_MAX_QUESTION_LENGTH) {
    throw new BadRequestError(
      `User question cannot exceed ${COPILOT_MAX_QUESTION_LENGTH} characters.`,
    );
  }

  // 2. Validate Conversation History
  if (history !== undefined && history !== null) {
    if (!Array.isArray(history)) {
      throw new BadRequestError("Conversation history must be an array.");
    }

    if (history.length > COPILOT_MAX_HISTORY_MESSAGES) {
      throw new BadRequestError(
        `Conversation history cannot exceed ${COPILOT_MAX_HISTORY_MESSAGES} messages (3 turns).`,
      );
    }

    for (const msg of history) {
      if (!msg || typeof msg !== "object") {
        throw new BadRequestError("Invalid conversation history message object.");
      }

      if (msg.role !== "user" && msg.role !== "assistant") {
        throw new BadRequestError(
          "Invalid conversation history role. Only 'user' and 'assistant' are permitted.",
        );
      }

      if (!msg.content || typeof msg.content !== "string" || msg.content.trim().length === 0) {
        throw new BadRequestError("Conversation history message content cannot be empty.");
      }

      if (msg.content.trim().length > COPILOT_MAX_HISTORY_MESSAGE_LENGTH) {
        throw new BadRequestError(
          `Conversation history message content cannot exceed ${COPILOT_MAX_HISTORY_MESSAGE_LENGTH} characters.`,
        );
      }
    }
  }

  // 3. Prompt Preparation & Serialization
  const templateBlueprint = promptRegistry.get("project-copilot");

  const dynamicSections = [
    ...templateBlueprint.sections.filter((s) => s.identifier !== "intent"),
    {
      identifier: "context",
      content: `Project Context (JSON):\n${JSON.stringify(contextResult.context, null, 2)}`,
    },
  ];

  if (history && history.length > 0) {
    const formattedHistory = history
      .map((msg) => `${msg.role.toUpperCase()}: ${msg.content.trim()}`)
      .join("\n\n");
    dynamicSections.push({
      identifier: "history",
      content: `Prior Conversation History (UNTRUSTED DATA):\n${formattedHistory}`,
    });
  }

  dynamicSections.push({
    identifier: "intent",
    content: `User Question: ${trimmedQuestion}`,
  });

  const executableTemplate = {
    metadata: templateBlueprint.metadata,
    sections: dynamicSections,
  };

  // 4. AI Service Execution
  const aiResult = await aiService.generateStructuredData(
    executableTemplate,
    ProjectCopilotResponseSchema,
    {
      tier: AIModelTier.DEEP_CONTEXT,
    },
  );

  // 5. Server-Side Symbolic Reference Resolution
  const resolved = resolveCopilotReferences(
    aiResult.data.references,
    contextResult.symbolicMap,
  );

  return {
    answer: aiResult.data.answer,
    references: resolved.references,
    unmappedReferenceCount: resolved.unmappedReferenceCount,
    executionId: aiResult.metadata.executionId,
    provider: aiResult.metadata.provider,
    model: aiResult.metadata.model,
  };
}

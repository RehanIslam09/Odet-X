import { z } from "zod";
import {
  COPILOT_MAX_QUESTION_LENGTH,
  COPILOT_MAX_HISTORY_MESSAGES,
  COPILOT_MAX_HISTORY_MESSAGE_LENGTH,
} from "@/services/project-copilot-ai.service.js";

export const copilotHistoryItemSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z
    .string()
    .trim()
    .min(1, "Conversation history message content cannot be empty.")
    .max(
      COPILOT_MAX_HISTORY_MESSAGE_LENGTH,
      `Conversation history message content cannot exceed ${COPILOT_MAX_HISTORY_MESSAGE_LENGTH} characters.`,
    ),
});

export const copilotQuerySchema = z.object({
  question: z
    .string()
    .trim()
    .min(1, "User question cannot be empty.")
    .max(
      COPILOT_MAX_QUESTION_LENGTH,
      `User question cannot exceed ${COPILOT_MAX_QUESTION_LENGTH} characters.`,
    ),
  history: z
    .array(copilotHistoryItemSchema)
    .max(
      COPILOT_MAX_HISTORY_MESSAGES,
      `Conversation history cannot exceed ${COPILOT_MAX_HISTORY_MESSAGES} messages (3 turns).`,
    )
    .optional(),
});

export type CopilotQueryDto = z.infer<typeof copilotQuerySchema>;

import { createContext, useContext } from "react";
import type {
  ActionCardLifecycleState,
  CopilotConversationMessage,
} from "@/features/ai/types/ai.types.js";

export type CopilotContextType = "workspace" | "project" | "task";

export interface CopilotContext {
  type: CopilotContextType;
  workspaceId?: string;
  projectId?: string;
  projectName?: string;
  taskId?: string;
  taskTitle?: string;
}

export interface GlobalCopilotContextValue {
  open: boolean;
  context: CopilotContext;
  messages: CopilotConversationMessage[];
  isPending: boolean;
  openCopilot: (targetContext?: Partial<CopilotContext>, initialQuestion?: string) => void;
  closeCopilot: () => void;
  sendMessage: (question: string) => Promise<void>;
  clearConversation: () => void;
  handleActionStateChange: (
    messageId: string,
    status: ActionCardLifecycleState,
    appliedMessage?: string,
  ) => void;
}

export const GlobalCopilotContext = createContext<GlobalCopilotContextValue | null>(null);

const DEFAULT_FALLBACK_CONTEXT: GlobalCopilotContextValue = {
  open: false,
  context: { type: "workspace" },
  messages: [],
  isPending: false,
  openCopilot: () => {},
  closeCopilot: () => {},
  sendMessage: async () => {},
  clearConversation: () => {},
  handleActionStateChange: () => {},
};

export function useGlobalCopilot(): GlobalCopilotContextValue {
  const ctx = useContext(GlobalCopilotContext);
  if (!ctx) {
    return DEFAULT_FALLBACK_CONTEXT;
  }
  return ctx;
}

import { useState, useCallback, useEffect, useMemo } from "react";
import type { ReactNode } from "react";
import { useLocation, useParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";

import { aiApi } from "@/features/ai/services/ai.api.js";
import { useActiveWorkspace } from "@/features/workspaces/context/WorkspaceContext.js";
import type {
  ActionCardLifecycleState,
  CopilotConversationMessage,
  CopilotHistoryMessage,
  CopilotResultData,
} from "@/features/ai/types/ai.types.js";

import type {
  CopilotContext,
  GlobalCopilotContextValue,
} from "./GlobalCopilotContext.js";
import { GlobalCopilotContext } from "./GlobalCopilotContext.js";
import { GlobalCopilotSheet } from "../components/copilot/GlobalCopilotSheet.js";

interface GlobalCopilotProviderProps {
  children: ReactNode;
}

function useOptionalWorkspace() {
  try {
    return useActiveWorkspace();
  } catch {
    return { currentWorkspace: null };
  }
}

export function GlobalCopilotProvider({ children }: GlobalCopilotProviderProps) {
  const location = useLocation();
  const params = useParams<{ projectId?: string; taskId?: string }>();
  const { currentWorkspace } = useOptionalWorkspace();

  const [open, setOpen] = useState(false);
  const [overrideContext, setOverrideContext] = useState<Partial<CopilotContext> | null>(null);
  const [messages, setMessages] = useState<CopilotConversationMessage[]>([]);

  // ---------------------------------------------------------------------------
  // Context Resolution Pipeline
  // ---------------------------------------------------------------------------
  const derivedContext: CopilotContext = useMemo(() => {
    if (overrideContext?.type) {
      return {
        type: overrideContext.type,
        workspaceId: currentWorkspace?.id,
        projectId: overrideContext.projectId,
        projectName: overrideContext.projectName,
        taskId: overrideContext.taskId,
        taskTitle: overrideContext.taskTitle,
      };
    }

    if (params.taskId || location.pathname.includes("/tasks/")) {
      const pathTaskId = params.taskId || location.pathname.split("/tasks/")[1]?.split("/")[0];
      return {
        type: "task",
        workspaceId: currentWorkspace?.id,
        projectId: params.projectId,
        taskId: pathTaskId,
      };
    }

    if (params.projectId || location.pathname.includes("/projects/")) {
      const pathProjectId = params.projectId || location.pathname.split("/projects/")[1]?.split("/")[0];
      return {
        type: "project",
        workspaceId: currentWorkspace?.id,
        projectId: pathProjectId,
      };
    }

    return {
      type: "workspace",
      workspaceId: currentWorkspace?.id,
    };
  }, [overrideContext, location.pathname, params, currentWorkspace]);

  // ---------------------------------------------------------------------------
  // Copilot Query Mutation
  // ---------------------------------------------------------------------------
  const copilotMutation = useMutation<
    CopilotResultData,
    Error,
    { projectId: string; question: string; history?: CopilotHistoryMessage[] }
  >({
    mutationFn: ({ projectId, question, history }) =>
      aiApi.queryCopilot(projectId, { question, history }),
  });

  // ---------------------------------------------------------------------------
  // Messaging Logic
  // ---------------------------------------------------------------------------
  const sendMessage = useCallback(
    async (question: string) => {
      if (!question.trim()) return;

      const validPriorMessages = messages.filter((m) => !m.isError);
      const boundedHistory: CopilotHistoryMessage[] = validPriorMessages
        .slice(-6)
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      const userMessageId = `user-${Date.now()}`;
      const userMessage: CopilotConversationMessage = {
        id: userMessageId,
        role: "user",
        content: question,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);

      const targetProjectId = derivedContext.projectId || "global";

      try {
        const result = await copilotMutation.mutateAsync({
          projectId: targetProjectId,
          question,
          history: boundedHistory.length > 0 ? boundedHistory : undefined,
        });

        const assistantMessage: CopilotConversationMessage = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: result.answer,
          references: result.references,
          proposedAction: result.proposedAction || null,
          actionStatus: result.proposedAction ? "proposed" : undefined,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } catch (err: unknown) {
        const errorMessageText =
          err instanceof Error ? err.message : "Failed to query Copilot. Please try again.";

        const assistantErrorMessage: CopilotConversationMessage = {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: `Error: ${errorMessageText}`,
          timestamp: new Date(),
          isError: true,
        };

        setMessages((prev) => [...prev, assistantErrorMessage]);
      }
    },
    [derivedContext, messages, copilotMutation],
  );

  // ---------------------------------------------------------------------------
  // Context Methods
  // ---------------------------------------------------------------------------
  const openCopilot = useCallback(
    (targetContext?: Partial<CopilotContext>, initialQuestion?: string) => {
      if (targetContext) {
        setOverrideContext((prev) => {
          if (
            prev?.type === targetContext.type &&
            prev?.projectId === targetContext.projectId &&
            prev?.taskId === targetContext.taskId
          ) {
            return prev;
          }
          return targetContext;
        });
      } else {
        setOverrideContext(null);
      }
      setOpen(true);

      if (initialQuestion) {
        setTimeout(() => {
          sendMessage(initialQuestion);
        }, 100);
      }
    },
    [sendMessage],
  );

  const closeCopilot = useCallback(() => {
    setOpen(false);
  }, []);

  const clearConversation = useCallback(() => {
    setMessages([]);
  }, []);

  const handleActionStateChange = useCallback(
    (messageId: string, status: ActionCardLifecycleState, appliedMessage?: string) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, actionStatus: status, appliedMessage } : msg,
        ),
      );
    },
    [],
  );

  // ---------------------------------------------------------------------------
  // Global Keyboard Listener (Ctrl+J or Cmd+J)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const value: GlobalCopilotContextValue = useMemo(
    () => ({
      open,
      context: derivedContext,
      messages,
      isPending: copilotMutation.isPending,
      openCopilot,
      closeCopilot,
      sendMessage,
      clearConversation,
      handleActionStateChange,
    }),
    [
      open,
      derivedContext,
      messages,
      copilotMutation.isPending,
      openCopilot,
      closeCopilot,
      sendMessage,
      clearConversation,
      handleActionStateChange,
    ],
  );

  return (
    <GlobalCopilotContext.Provider value={value}>
      {children}
      <GlobalCopilotSheet />
    </GlobalCopilotContext.Provider>
  );
}

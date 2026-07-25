import { useState } from "react";
import { Sparkles, Trash2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useProjectCopilot } from "@/features/ai/hooks/useProjectCopilot";
import type {
  ActionCardLifecycleState,
  CopilotConversationMessage,
  CopilotHistoryMessage,
  CopilotResultData,
} from "@/features/ai/types/ai.types";
import { CopilotChatThread } from "./CopilotChatThread";
import { CopilotInputForm } from "./CopilotInputForm";

interface ProjectCopilotSheetProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectReference?: (type: "project" | "task" | "milestone", id: string) => void;
}

export function ProjectCopilotSheet({
  projectId,
  open,
  onOpenChange,
  onSelectReference,
}: ProjectCopilotSheetProps) {
  const [messages, setMessages] = useState<CopilotConversationMessage[]>([]);

  const copilotMutation = useProjectCopilot(projectId);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Ephemeral state reset on close
      setMessages([]);
    }
    onOpenChange(newOpen);
  };

  const handleResetConversation = () => {
    setMessages([]);
  };

  const handleActionStateChange = (
    messageId: string,
    status: ActionCardLifecycleState,
    appliedMessage?: string,
  ) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? { ...msg, actionStatus: status, appliedMessage }
          : msg,
      ),
    );
  };

  const handleSubmitQuestion = async (question: string) => {
    // 1. Derive bounded prior conversation history (max 6 messages / 3 turns)
    const validPriorMessages = messages.filter((m) => !m.isError);
    const boundedHistory: CopilotHistoryMessage[] = validPriorMessages
      .slice(-6)
      .map((m) => ({
        role: m.role,
        content: m.content,
      }));

    // 2. Append User message locally
    const userMessageId = `user-${Date.now()}`;
    const userMessage: CopilotConversationMessage = {
      id: userMessageId,
      role: "user",
      content: question,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);

    // 3. Invoke Read-Only Copilot Mutation
    try {
      const result: CopilotResultData = await copilotMutation.mutateAsync({
        question,
        history: boundedHistory.length > 0 ? boundedHistory : undefined,
      });

      // 4. Append Assistant Response Message locally
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

      // 5. Append Assistant Error Message locally (preserves user question and prior messages)
      const assistantErrorMessage: CopilotConversationMessage = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: `Error: ${errorMessageText}`,
        timestamp: new Date(),
        isError: true,
      };

      setMessages((prev) => [...prev, assistantErrorMessage]);
    }
  };

  const handleSelectReference = (type: "project" | "task" | "milestone", id: string) => {
    if (onSelectReference) {
      onSelectReference(type, id);
      return;
    }

    // Default task scrolling interaction if task element exists in DOM
    if (type === "task") {
      const taskElement =
        document.getElementById(`task-${id}`) ||
        document.querySelector(`[data-task-id="${id}"]`);

      if (taskElement) {
        if (typeof taskElement.scrollIntoView === "function") {
          taskElement.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        taskElement.classList.add("ring-2", "ring-primary", "transition-all");
        setTimeout(() => {
          taskElement.classList.remove("ring-2", "ring-primary", "transition-all");
        }, 2500);
      }
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg p-0 flex flex-col h-full overflow-hidden border-l border-border bg-background"
      >
        {/* Header */}
        <SheetHeader className="p-4 pr-12 border-b border-border shrink-0 flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <SheetTitle className="text-base font-semibold leading-none truncate">
                Project Copilot
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground mt-1 truncate">
                Ask questions & review proposed project actions
              </SheetDescription>
            </div>
          </div>

          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetConversation}
              className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1 shrink-0 ml-2"
              title="Clear conversation"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear
            </Button>
          )}
        </SheetHeader>

        {/* Chat Thread */}
        <div className="flex-1 overflow-y-auto px-4 min-h-0">
          <CopilotChatThread
            projectId={projectId}
            messages={messages}
            isPending={copilotMutation.isPending}
            onSelectSuggestedQuestion={handleSubmitQuestion}
            onSelectReference={handleSelectReference}
            onActionStateChange={handleActionStateChange}
          />
        </div>

        {/* Input Form Footer */}
        <div className="p-4 border-t border-border bg-background/95 backdrop-blur-xs shrink-0">
          <CopilotInputForm
            onSubmit={handleSubmitQuestion}
            isPending={copilotMutation.isPending}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

import { CheckSquare, Flag, Folder, Sparkles, User as UserIcon } from "lucide-react";
import type { ActionCardLifecycleState, CopilotConversationMessage, CopilotReference } from "@/features/ai/types/ai.types";
import { MarkdownRenderer } from "@/features/tasks/components/MarkdownRenderer";
import { CopilotActionCard } from "./CopilotActionCard";

interface CopilotMessageItemProps {
  projectId?: string;
  message: CopilotConversationMessage;
  onSelectReference?: (type: "project" | "task" | "milestone", id: string) => void;
  onActionStateChange?: (
    messageId: string,
    status: ActionCardLifecycleState,
    appliedMessage?: string,
  ) => void;
}

export function CopilotMessageItem({
  projectId = "",
  message,
  onSelectReference,
  onActionStateChange,
}: CopilotMessageItemProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex flex-col gap-2 w-full ${isUser ? "items-end" : "items-start"}`}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {isUser ? (
          <>
            <span>You</span>
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <UserIcon className="h-3 w-3" />
            </div>
          </>
        ) : (
          <>
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Sparkles className="h-3 w-3" />
            </div>
            <span className="font-medium text-foreground">Project Copilot</span>
          </>
        )}
      </div>

      <div
        className={`w-full max-w-[92%] sm:max-w-[88%] min-w-0 overflow-hidden rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "bg-primary text-primary-foreground rounded-br-xs"
            : message.isError
              ? "bg-destructive/10 text-destructive border border-destructive/20 rounded-bl-xs"
              : "bg-muted/60 text-foreground border border-border/40 rounded-bl-xs"
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        ) : (
          <MarkdownRenderer content={message.content} variant="copilot" />
        )}

        {/* Action Proposal Card */}
        {!isUser && message.proposedAction && (
          <CopilotActionCard
            projectId={projectId}
            messageId={message.id}
            proposedAction={message.proposedAction}
            references={message.references}
            initialStatus={message.actionStatus || "proposed"}
            initialAppliedMessage={message.appliedMessage}
            onActionStateChange={onActionStateChange}
          />
        )}

        {/* References Section */}
        {!isUser && message.references && message.references.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border/40 flex flex-col gap-1.5 w-full min-w-0 overflow-hidden">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Referenced Entities
            </span>
            <div className="flex flex-wrap gap-1.5 mt-1 w-full min-w-0">
              {message.references.map((ref: CopilotReference, index: number) => {
                const isTask = ref.type === "task";
                const isMilestone = ref.type === "milestone";

                return (
                  <button
                    key={`${ref.type}-${ref.id}-${index}`}
                    type="button"
                    onClick={() => onSelectReference?.(ref.type, ref.id)}
                    disabled={!isTask}
                    className={`inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                      isTask
                        ? "bg-background/80 text-foreground border border-border hover:bg-accent hover:text-accent-foreground cursor-pointer shadow-xs"
                        : "bg-background/40 text-muted-foreground border border-border/40 cursor-default"
                    }`}
                  >
                    {isTask && <CheckSquare className="h-3 w-3 text-primary shrink-0" />}
                    {isMilestone && <Flag className="h-3 w-3 text-amber-500 shrink-0" />}
                    {!isTask && !isMilestone && <Folder className="h-3 w-3 text-blue-500 shrink-0" />}

                    <span className="capitalize text-muted-foreground font-normal shrink-0">{ref.type}:</span>
                    <span className="truncate min-w-0 flex-1 text-left">{ref.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

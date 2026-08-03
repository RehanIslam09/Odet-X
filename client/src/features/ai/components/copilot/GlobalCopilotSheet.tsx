import { Sparkles, Trash2, Folder, CheckSquare, Layers } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { useGlobalCopilot } from "@/features/ai/context/GlobalCopilotContext";
import { CopilotChatThread } from "./CopilotChatThread";
import { CopilotInputForm } from "./CopilotInputForm";

interface GlobalCopilotSheetProps {
  onSelectReference?: (type: "project" | "task" | "milestone", id: string) => void;
}

export function GlobalCopilotSheet({ onSelectReference }: GlobalCopilotSheetProps) {
  const {
    open,
    closeCopilot,
    context,
    messages,
    isPending,
    sendMessage,
    clearConversation,
    handleActionStateChange,
  } = useGlobalCopilot();

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      closeCopilot();
    }
  };

  const handleSelectReference = (type: "project" | "task" | "milestone", id: string) => {
    if (onSelectReference) {
      onSelectReference(type, id);
      return;
    }

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

  // Render context badge description
  const renderContextBadge = () => {
    if (context.type === "task" && context.taskTitle) {
      return (
        <Badge variant="outline" className="h-5 px-1.5 text-[10px] gap-1 bg-muted/40 border-border/60">
          <CheckSquare className="h-3 w-3 text-primary" />
          <span className="truncate max-w-[140px]">{context.taskTitle}</span>
        </Badge>
      );
    }
    if (context.type === "project" && context.projectName) {
      return (
        <Badge variant="outline" className="h-5 px-1.5 text-[10px] gap-1 bg-muted/40 border-border/60">
          <Folder className="h-3 w-3 text-primary" />
          <span className="truncate max-w-[140px]">{context.projectName}</span>
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="h-5 px-1.5 text-[10px] gap-1 bg-muted/40 border-border/60">
        <Layers className="h-3 w-3 text-primary" />
        <span>Workspace Scope</span>
      </Badge>
    );
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
              <div className="flex items-center gap-2">
                <SheetTitle className="text-base font-semibold leading-none truncate">
                  AI Copilot
                </SheetTitle>
                {renderContextBadge()}
              </div>
              <SheetDescription className="text-xs text-muted-foreground mt-1 truncate">
                Global workspace intelligence & controlled actions
              </SheetDescription>
            </div>
          </div>

          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearConversation}
              className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1 shrink-0 ml-2 cursor-pointer"
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
            projectId={context.projectId || "global"}
            messages={messages}
            isPending={isPending}
            onSelectSuggestedQuestion={(q) => sendMessage(q)}
            onSelectReference={handleSelectReference}
            onActionStateChange={handleActionStateChange}
          />
        </div>

        {/* Input Form Footer */}
        <div className="p-4 border-t border-border bg-background/95 backdrop-blur-xs shrink-0">
          <CopilotInputForm
            onSubmit={(q) => sendMessage(q)}
            isPending={isPending}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

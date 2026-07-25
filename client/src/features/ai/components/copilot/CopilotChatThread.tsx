import { useEffect, useRef } from "react";
import { HelpCircle, Loader2, Sparkles } from "lucide-react";
import type { CopilotConversationMessage } from "@/features/ai/types/ai.types";
import { CopilotMessageItem } from "./CopilotMessageItem";
import { Button } from "@/components/ui/button";

interface CopilotChatThreadProps {
  messages: CopilotConversationMessage[];
  isPending: boolean;
  onSelectSuggestedQuestion: (question: string) => void;
  onSelectReference?: (type: "project" | "task" | "milestone", id: string) => void;
}

const SUGGESTED_QUESTIONS = [
  "What's blocking this project?",
  "What should I work on next?",
  "Which tasks are overdue?",
  "Summarize project progress.",
];

export function CopilotChatThread({
  messages,
  isPending,
  onSelectSuggestedQuestion,
  onSelectReference,
}: CopilotChatThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof bottomRef.current?.scrollIntoView === "function") {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isPending]);

  if (messages.length === 0 && !isPending) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-8 px-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4 shadow-xs">
          <Sparkles className="h-6 w-6" />
        </div>

        <h3 className="text-base font-semibold text-foreground">Ask about your project</h3>
        <p className="text-xs leading-relaxed text-muted-foreground max-w-xs mt-1 mb-6">
          Copilot analyzes your project tasks, milestones, and activity to answer questions about blockers, risks, and progress.
        </p>

        <div className="w-full max-w-xs flex flex-col gap-2">
          <span className="text-xs font-medium text-muted-foreground flex items-center justify-center gap-1">
            <HelpCircle className="h-3.5 w-3.5" /> Suggested Questions
          </span>

          <div className="flex flex-col gap-1.5 mt-1">
            {SUGGESTED_QUESTIONS.map((q: string, idx: number) => (
              <Button
                key={idx}
                variant="outline"
                size="sm"
                className="justify-start h-auto py-2 px-3 text-xs font-normal text-left whitespace-normal hover:bg-accent hover:text-accent-foreground"
                onClick={() => onSelectSuggestedQuestion(q)}
              >
                {q}
              </Button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 py-2">
      {messages.map((message: CopilotConversationMessage) => (
        <CopilotMessageItem
          key={message.id}
          message={message}
          onSelectReference={onSelectReference}
        />
      ))}

      {isPending && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Loader2 className="h-3 w-3 animate-spin" />
          </div>
          <span className="animate-pulse">Thinking…</span>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}

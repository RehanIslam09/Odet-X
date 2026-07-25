import { useState, type FormEvent, type KeyboardEvent } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface CopilotInputFormProps {
  onSubmit: (question: string) => void;
  isPending: boolean;
}

export function CopilotInputForm({ onSubmit, isPending }: CopilotInputFormProps) {
  const [question, setQuestion] = useState("");

  const trimmedQuestion = question.trim();
  const isValid = trimmedQuestion.length > 0 && trimmedQuestion.length <= 500 && !isPending;

  const handleSubmit = (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!isValid) return;

    onSubmit(trimmedQuestion);
    setQuestion("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="relative flex items-center">
        <Textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about blockers, risks, priorities..."
          disabled={isPending}
          maxLength={500}
          rows={2}
          className="resize-none pr-12 text-sm focus-visible:ring-1"
        />

        <Button
          type="submit"
          size="icon"
          disabled={!isValid}
          className="absolute right-2 bottom-2 h-8 w-8 shrink-0 rounded-lg shadow-xs"
        >
          <Send className="h-4 w-4" />
          <span className="sr-only">Send Question</span>
        </Button>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>Press Enter to send, Shift+Enter for new line</span>
        {question.length > 400 && (
          <span className={question.length > 490 ? "text-amber-500 font-medium" : ""}>
            {question.length}/500
          </span>
        )}
      </div>
    </form>
  );
}

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PLAN_MAX_PROMPT_LENGTH } from "@/constants/planning";

interface PlanGenerationFormProps {
  onGenerate: (description: string) => void;
  isLoading: boolean;
  onCancel: () => void;
}

export function PlanGenerationForm({
  onGenerate,
  isLoading,
  onCancel,
}: PlanGenerationFormProps) {
  const [description, setDescription] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || isLoading) return;
    onGenerate(description.trim());
  };

  const charCount = description.length;
  const isOverLimit = charCount > PLAN_MAX_PROMPT_LENGTH;
  const isValid = description.trim().length > 0 && !isOverLimit;

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-2">
      <div className="space-y-2">
        <Label htmlFor="plan-description" className="text-sm font-medium">
          Project Outcome & Planning Requirements
        </Label>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Describe what you want to build, major technical milestones, features, or architectural constraints. AI will generate a structured, acyclic project plan with tasks and milestones for your review.
        </p>
        <Textarea
          id="plan-description"
          placeholder="Example: Build a SaaS authentication system with JWT sessions, email verification, password reset endpoints, and user profile management..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          maxLength={PLAN_MAX_PROMPT_LENGTH}
          className="resize-none font-sans text-sm focus-visible:ring-primary/40"
          disabled={isLoading}
        />
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
          <span>Pro tip: Specify prerequisites or target phases if known.</span>
          <span className={isOverLimit ? "font-semibold text-destructive" : ""}>
            {charCount} / {PLAN_MAX_PROMPT_LENGTH}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!isValid || isLoading}
          className="gap-2 shadow-sm"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating Plan...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Generate Plan
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

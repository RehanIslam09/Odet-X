import { useState } from "react";
import { Sparkles, CheckCircle2, AlertCircle, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useActionDryRun } from "@/features/ai/hooks/useCopilotAction";
import { ActionReviewDialog } from "./ActionReviewDialog";
import type {
  ProposedAction,
  CopilotReference,
  ActionDryRunResultData,
  ActionCardLifecycleState,
} from "@/features/ai/types/ai.types";

interface CopilotActionCardProps {
  projectId: string;
  messageId: string;
  proposedAction: ProposedAction;
  references?: CopilotReference[];
  initialStatus?: ActionCardLifecycleState;
  initialAppliedMessage?: string;
  onActionStateChange?: (
    messageId: string,
    status: ActionCardLifecycleState,
    appliedMessage?: string,
  ) => void;
}

export function CopilotActionCard({
  projectId,
  messageId,
  proposedAction,
  references = [],
  initialStatus = "proposed",
  initialAppliedMessage,
  onActionStateChange,
}: CopilotActionCardProps) {
  const [status, setStatus] = useState<ActionCardLifecycleState>(initialStatus);
  const [appliedMessage, setAppliedMessage] = useState<string | undefined>(initialAppliedMessage);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [dryRunData, setDryRunData] = useState<ActionDryRunResultData | null>(null);

  const dryRunMutation = useActionDryRun();

  // Find human-readable target label from structured references if available
  const targetRef = proposedAction.targetRef;
  const matchedReference = references.find((r) => r.id === targetRef || r.type === "task");
  const targetLabel = matchedReference ? matchedReference.label : targetRef;

  const getActionTitle = (): string => {
    switch (proposedAction.action) {
      case "CREATE_TASK":
        return "Create task";
      case "UPDATE_TASK_STATUS":
        return "Change task status";
      case "UPDATE_TASK_PRIORITY":
        return "Change task priority";
      case "UPDATE_TASK_DUE_DATE":
        return "Change due date";
      case "ADD_TASK_LABEL":
        return "Add label";
      default:
        return "Proposed Action";
    }
  };

  const getProposedChangeText = (): string => {
    const args = proposedAction.arguments;
    switch (proposedAction.action) {
      case "CREATE_TASK":
        return `Title: "${args.title || 'New Task'}"`;
      case "UPDATE_TASK_STATUS":
        return `Status: ${String(args.status || 'updated').toUpperCase()}`;
      case "UPDATE_TASK_PRIORITY":
        return `Priority: ${String(args.priority || 'updated').toUpperCase()}`;
      case "UPDATE_TASK_DUE_DATE":
        return `Due: ${args.dueDate ? new Date(String(args.dueDate)).toLocaleDateString() : 'Cleared'}`;
      case "ADD_TASK_LABEL":
        return `Label: +${args.label}`;
      default:
        return JSON.stringify(args);
    }
  };

  const handleReviewClick = async () => {
    setErrorMessage(null);
    setStatus("reviewing");

    try {
      const data = await dryRunMutation.mutateAsync({
        projectId,
        proposedAction,
      });

      setDryRunData(data);
      setIsReviewOpen(true);
      setStatus("proposed");
    } catch (err: unknown) {
      const errText = err instanceof Error ? err.message : "Failed to generate action preview.";
      setErrorMessage(errText);
      setStatus("failed");
    }
  };

  const handleConfirmSuccess = (successMsg: string) => {
    setStatus("applied");
    setAppliedMessage(successMsg);
    onActionStateChange?.(messageId, "applied", successMsg);
  };

  return (
    <div className="mt-3 pt-3 border-t border-border/40 w-full min-w-0">
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 space-y-2.5">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary shrink-0">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <span className="text-xs font-semibold text-foreground truncate">
              {getActionTitle()}
            </span>
          </div>

          {status === "applied" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-medium shrink-0">
              <CheckCircle2 className="h-3 w-3" />
              Applied
            </span>
          )}
        </div>

        {/* Target Entity & Change Summary */}
        <div className="text-xs space-y-1 bg-background/60 p-2.5 rounded-lg border border-border/40">
          {proposedAction.action !== "CREATE_TASK" && (
            <div className="flex items-center gap-1 text-muted-foreground truncate">
              <span className="font-medium">Target:</span>
              <span className="text-foreground truncate">{targetLabel}</span>
            </div>
          )}
          <div className="flex items-center gap-1 text-foreground font-medium truncate">
            <span>{getProposedChangeText()}</span>
          </div>
          {proposedAction.explanation && (
            <p className="text-[11px] text-muted-foreground italic line-clamp-2 pt-0.5">
              "{proposedAction.explanation}"
            </p>
          )}
        </div>

        {/* Error Feedback */}
        {errorMessage && (
          <div className="flex items-center gap-1.5 text-xs text-destructive bg-destructive/10 p-2 rounded-md border border-destructive/20">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{errorMessage}</span>
          </div>
        )}

        {/* Action Controls */}
        {status !== "applied" && (
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-muted-foreground">
              Requires human review
            </span>
            <Button
              type="button"
              size="sm"
              onClick={handleReviewClick}
              disabled={dryRunMutation.isPending}
              className="h-7 text-xs px-3 gap-1 shrink-0"
            >
              {dryRunMutation.isPending ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Reviewing...
                </>
              ) : (
                <>
                  <span>{status === "failed" ? "Retry Review" : "Review Change"}</span>
                  <ArrowRight className="h-3 w-3" />
                </>
              )}
            </Button>
          </div>
        )}

        {status === "applied" && appliedMessage && (
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            {appliedMessage}
          </p>
        )}
      </div>

      {/* Action Review & Confirmation Dialog */}
      <ActionReviewDialog
        open={isReviewOpen}
        projectId={projectId}
        proposedAction={proposedAction}
        dryRunData={dryRunData}
        onOpenChange={setIsReviewOpen}
        onConfirmSuccess={handleConfirmSuccess}
      />
    </div>
  );
}

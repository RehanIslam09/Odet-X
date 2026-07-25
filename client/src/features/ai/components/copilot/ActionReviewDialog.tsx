import { useState } from "react";
import { ArrowRight, AlertTriangle, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useActionConfirm } from "@/features/ai/hooks/useCopilotAction";
import type { ActionDryRunResultData, ProposedAction } from "@/features/ai/types/ai.types";

interface ActionReviewDialogProps {
  open: boolean;
  projectId: string;
  proposedAction: ProposedAction;
  dryRunData: ActionDryRunResultData | null;
  onOpenChange: (open: boolean) => void;
  onConfirmSuccess: (updatedMessage: string) => void;
}

export function ActionReviewDialog({
  open,
  projectId,
  proposedAction,
  dryRunData,
  onOpenChange,
  onConfirmSuccess,
}: ActionReviewDialogProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const confirmMutation = useActionConfirm(projectId);

  if (!dryRunData) {
    return null;
  }

  const { dryRun, confirmationToken } = dryRunData;
  const isCreateTask = proposedAction.action === "CREATE_TASK";

  const handleConfirm = async () => {
    setErrorMessage(null);

    try {
      await confirmMutation.mutateAsync({ confirmationToken });
      
      const successMessage = isCreateTask
        ? `Created task "${dryRun.diff.after.title || 'New Task'}"`
        : `Updated ${dryRun.target.label}`;

      onConfirmSuccess(successMessage);
      onOpenChange(false);
    } catch (err: unknown) {
      const errObj = err as { response?: { status?: number }; message?: string };
      const status = errObj.response?.status;

      if (status === 409) {
        setErrorMessage(
          "Task was modified concurrently by another request. Please perform a new review before confirming.",
        );
      } else if (status === 401) {
        setErrorMessage(
          "This action confirmation preview has expired (5-minute TTL). Please perform a new review.",
        );
      } else {
        setErrorMessage(
          errObj.message || "Failed to confirm action. Please try again.",
        );
      }
    }
  };

  const formatValue = (key: string, val: unknown): string => {
    if (val === null || val === undefined) return "None";
    if (typeof val === "string") {
      if (key.toLowerCase().includes("date") && !isNaN(Date.parse(val))) {
        return new Date(val).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
      }
      return val;
    }
    if (Array.isArray(val)) return val.length > 0 ? val.join(", ") : "None";
    return String(val);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-background border-border shadow-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary text-sm font-medium">
            <Sparkles className="h-4 w-4" />
            <span>AI Action Review</span>
          </div>
          <DialogTitle className="text-lg font-semibold leading-snug">
            {isCreateTask ? "Confirm New Task Creation" : `Review Proposed Change for ${dryRun.target.label}`}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {dryRun.explanation || "Review the exact state diff before confirming this action."}
          </DialogDescription>
        </DialogHeader>

        {/* Error Alert */}
        {errorMessage && (
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 text-xs">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <p className="leading-normal">{errorMessage}</p>
          </div>
        )}

        {/* Diff State Display */}
        <div className="py-2 space-y-3">
          {isCreateTask ? (
            <div className="rounded-lg border border-border p-3.5 bg-muted/30 space-y-2 text-xs">
              <span className="font-semibold text-foreground uppercase tracking-wider text-[10px]">
                New Task Specifications
              </span>
              <div className="space-y-1.5 pt-1">
                {Object.entries(dryRun.diff.after).map(([key, val]) => (
                  <div key={key} className="flex justify-between items-center py-0.5 border-b border-border/40 last:border-0">
                    <span className="text-muted-foreground capitalize">{key.replace(/([A-Z])/g, " $1")}:</span>
                    <span className="font-medium text-foreground truncate max-w-[200px]">
                      {formatValue(key, val)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 text-xs">
              {/* Before Card */}
              <div className="rounded-lg border border-border p-3 bg-muted/40 space-y-2">
                <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
                  Before
                </span>
                <div className="space-y-1.5 pt-1">
                  {Object.entries(dryRun.diff.before).map(([key, val]) => (
                    <div key={key} className="flex flex-col">
                      <span className="text-[10px] text-muted-foreground capitalize">{key}:</span>
                      <span className="font-medium text-foreground truncate">{formatValue(key, val)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* After Card */}
              <div className="rounded-lg border border-primary/30 p-3 bg-primary/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-primary uppercase tracking-wider text-[10px]">
                    After
                  </span>
                  <ArrowRight className="h-3 w-3 text-primary" />
                </div>
                <div className="space-y-1.5 pt-1">
                  {Object.entries(dryRun.diff.after).map(([key, val]) => (
                    <div key={key} className="flex flex-col">
                      <span className="text-[10px] text-primary/80 capitalize">{key}:</span>
                      <span className="font-semibold text-foreground truncate">{formatValue(key, val)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 px-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            <span>Human confirmation required — no DB changes occurred during review.</span>
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={confirmMutation.isPending}
            className="text-xs h-8"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleConfirm}
            disabled={confirmMutation.isPending}
            className="text-xs h-8 gap-1.5"
          >
            {confirmMutation.isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Executing...
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                {isCreateTask ? "Create Task" : "Confirm Change"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

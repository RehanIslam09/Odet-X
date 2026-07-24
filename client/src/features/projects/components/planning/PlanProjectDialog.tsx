import { useState } from "react";
import { Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useGeneratePlan,
  usePlanDraft,
  useUpdatePlanDraft,
  useDiscardPlanDraft,
  useCommitPlan,
} from "@/features/ai/hooks/usePlanDraft";
import { PlanGenerationForm } from "./PlanGenerationForm";
import { PlanReviewWorkspace } from "./PlanReviewWorkspace";
import type { PlanDraftTask, PlanDraftMilestone } from "@/features/ai/types/ai.types";

interface PlanProjectDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDraftId?: string | null;
}

export function PlanProjectDialog({
  projectId,
  open,
  onOpenChange,
  initialDraftId = null,
}: PlanProjectDialogProps) {
  const [generatedDraftId, setGeneratedDraftId] = useState<string | null>(null);

  // Active draft ID is either newly generated draft or initial resumed draft
  const activeDraftId = open ? (generatedDraftId ?? initialDraftId) : null;

  // Planning engine mutations & query
  const generatePlanMutation = useGeneratePlan(projectId);
  const { data: draft, isLoading: isDraftLoading } = usePlanDraft(
    projectId,
    activeDraftId
  );
  const updateDraftMutation = useUpdatePlanDraft(projectId, activeDraftId || "");
  const discardDraftMutation = useDiscardPlanDraft(projectId, activeDraftId || "");
  const commitPlanMutation = useCommitPlan(projectId, activeDraftId || "");

  // Generate Plan Handler
  const handleGenerate = (description: string) => {
    generatePlanMutation.mutate(
      { description },
      {
        onSuccess: (generatedDraft) => {
          setGeneratedDraftId(generatedDraft.id);
        },
      }
    );
  };

  // Save Draft Handler
  const handleSave = (tasks: PlanDraftTask[], milestones: PlanDraftMilestone[]) => {
    if (!activeDraftId) return;
    updateDraftMutation.mutate({ tasks, milestones });
  };

  // Discard Draft Handler
  const handleDiscard = () => {
    if (!activeDraftId) return;
    discardDraftMutation.mutate(undefined, {
      onSuccess: () => {
        setGeneratedDraftId(null);
        onOpenChange(false);
      },
    });
  };

  // Commit Draft Handler
  const handleCommit = () => {
    if (!activeDraftId) return;
    commitPlanMutation.mutate(undefined, {
      onSuccess: () => {
        setGeneratedDraftId(null);
        onOpenChange(false);
      },
    });
  };

  const handleDialogClose = (newOpen: boolean) => {
    if (!newOpen) {
      setGeneratedDraftId(null);
    }
    onOpenChange(newOpen);
  };

  const isGenerating = generatePlanMutation.isPending;
  const isReviewing = Boolean(activeDraftId && draft && draft.status === "draft");

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="w-[92vw] sm:max-w-xl md:max-w-[760px] max-h-[86vh] flex flex-col p-5 sm:p-6 overflow-hidden rounded-2xl">
        <DialogHeader className="shrink-0 pb-2">
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <Sparkles className="h-5 w-5 text-primary shrink-0" />
            AI Project Planning Engine
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {isReviewing
              ? "Review, edit, and assign prerequisites for proposed tasks and milestones before committing to your project."
              : "Generate a structured, phase-based project plan using deep context AI reasoning."}
          </DialogDescription>
        </DialogHeader>

        {isGenerating ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-4 py-8">
            <div className="flex items-center justify-center gap-3 text-sm font-medium text-muted-foreground">
              <Sparkles className="h-5 w-5 animate-pulse text-primary" />
              Generating structured project plan...
            </div>
            <div className="space-y-3 w-full max-w-xl">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        ) : isReviewing ? (
          isDraftLoading ? (
            <div className="flex-1 space-y-3 py-6">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : (
            <PlanReviewWorkspace
              key={draft!.id}
              draft={draft!}
              onSave={handleSave}
              onDiscard={handleDiscard}
              onCommit={handleCommit}
              isSaving={updateDraftMutation.isPending}
              isCommitting={commitPlanMutation.isPending}
              isDiscarding={discardDraftMutation.isPending}
            />
          )
        ) : (
          <div className="flex-1 overflow-y-auto pr-1">
            <PlanGenerationForm
              onGenerate={handleGenerate}
              isLoading={isGenerating}
              onCancel={() => handleDialogClose(false)}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

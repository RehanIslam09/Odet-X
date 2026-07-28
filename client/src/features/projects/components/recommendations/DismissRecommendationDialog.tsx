import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import { useDismissRecommendation } from "@/features/projects/hooks/useProjectRecommendations";
import type { ProjectRecommendation } from "@/features/projects/types/project-recommendations.types";

interface DismissRecommendationDialogProps {
  recommendation: ProjectRecommendation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function DismissRecommendationDialog({
  recommendation,
  open,
  onOpenChange,
  onSuccess,
}: DismissRecommendationDialogProps) {
  const dismissMutation = useDismissRecommendation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!recommendation) return null;

  const handleDismiss = async () => {
    setIsSubmitting(true);
    try {
      await dismissMutation.mutateAsync({
        recommendationId: recommendation.id,
        projectId: recommendation.projectId,
      });
      toast.success("Recommendation dismissed.");
      onOpenChange(false);
      if (onSuccess) {
        onSuccess();
      }
    } catch {
      toast.error("Failed to dismiss recommendation. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="text-foreground">Dismiss Recommendation?</DialogTitle>
          <DialogDescription className="pt-2 text-sm leading-relaxed text-muted-foreground">
            This recommendation will be hidden. The same issue may be suggested again later if it remains relevant.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="pt-4 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="default"
            onClick={handleDismiss}
            disabled={isSubmitting}
            aria-label="Confirm dismissal of recommendation"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Dismissing...
              </>
            ) : (
              "Dismiss"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

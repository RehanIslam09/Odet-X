import { Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import { useDeleteProjectMemory } from "@/features/projects/hooks/useDeleteProjectMemory";
import type { ProjectMemory } from "@/features/projects/types/project-memory.types";

interface DeleteProjectMemoryDialogProps {
  projectId: string;
  memory: ProjectMemory | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function DeleteProjectMemoryDialog({
  projectId,
  memory,
  open,
  onOpenChange,
  onSuccess,
}: DeleteProjectMemoryDialogProps) {
  const { mutateAsync: deleteMemory, isPending } = useDeleteProjectMemory(projectId);

  if (!memory) return null;

  const handleDelete = async () => {
    try {
      await deleteMemory(memory.id);
      onOpenChange(false);
      if (onSuccess) {
        onSuccess();
      }
    } catch {
      // Error handled by hook mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="text-destructive">Delete Project Memory?</DialogTitle>
          <DialogDescription className="pt-2 text-sm leading-relaxed">
            Are you sure you want to delete this project memory? This action is permanent and cannot be undone. Copilot will no longer have access to this context note.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isPending}
            className="gap-2"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Delete Memory
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

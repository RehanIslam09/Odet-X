import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import type { Project } from "@/features/projects/types/projects.types";
import { useDeleteProject } from "@/features/projects/hooks";

interface DeleteProjectDialogProps {
  project: Project | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Confirmation dialog for project deletion.
 *
 * Deletion is intentional and irreversible from the user's perspective.
 * The copy makes this clear. The confirm button is styled destructively.
 *
 * Internally, deletion is a soft-delete (isDeleted: true) — the record
 * is retained for AI context. But the user should not need to know this.
 */
export function DeleteProjectDialog({
  project,
  open,
  onOpenChange,
}: DeleteProjectDialogProps) {
  const { mutate: deleteProject, isPending } = useDeleteProject();

  function handleConfirm() {
    if (!project) return;

    deleteProject(project.id, {
      onSuccess: () => {
        onOpenChange(false);
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete project?</DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">
              {project?.emoji} {project?.name}
            </span>{" "}
            will be permanently deleted. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            id="confirm-delete-project"
            variant="destructive"
            onClick={handleConfirm}
            disabled={isPending}
          >
            {isPending ? "Deleting…" : "Delete Project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.js";
import { Button } from "@/components/ui/button.js";

import { ProjectIcon } from "@/components/common/ProjectIcon.js";
import type { Project } from "@/features/projects/types/projects.types.js";
import { useDeleteProject } from "@/features/projects/hooks/index.js";

interface DeleteProjectDialogProps {
  project: Project | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function DeleteProjectDialog({
  project,
  open,
  onOpenChange,
  onSuccess,
}: DeleteProjectDialogProps) {
  const { mutate: deleteProject, isPending } = useDeleteProject();

  function handleConfirm() {
    if (!project) return;

    deleteProject(project.id, {
      onSuccess: () => {
        onOpenChange(false);
        if (onSuccess) onSuccess();
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete project?</DialogTitle>
          <DialogDescription asChild>
            <div className="text-xs text-muted-foreground mt-2">
              <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                <ProjectIcon icon={project?.emoji} color={project?.color} size="xs" />
                {project?.name}
              </span>{" "}
              will be permanently deleted. This action cannot be undone.
            </div>
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

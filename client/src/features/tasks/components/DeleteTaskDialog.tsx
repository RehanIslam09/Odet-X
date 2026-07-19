import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.js";
import { Button } from "@/components/ui/button.js";

import type { Task } from "@/features/tasks/types/tasks.types.js";
import { useDeleteTask } from "@/features/tasks/hooks/index.js";

interface DeleteTaskDialogProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

/**
 * Confirmation dialog for task deletion.
 */
export function DeleteTaskDialog(props: DeleteTaskDialogProps) {
  const { task, open, onOpenChange } = props;
  const { mutate: deleteTask, isPending } = useDeleteTask();

  function handleConfirm() {
    if (!task) return;

    deleteTask(task.id, {
      onSuccess: () => {
        onOpenChange(false);
        if (props.onSuccess) props.onSuccess();
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete task?</DialogTitle>
          <DialogDescription>
            The task <span className="font-medium text-foreground">"{task?.title}"</span> will be permanently deleted. This action cannot be undone.
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
            id="confirm-delete-task"
            variant="destructive"
            onClick={handleConfirm}
            disabled={isPending}
          >
            {isPending ? "Deleting…" : "Delete Task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

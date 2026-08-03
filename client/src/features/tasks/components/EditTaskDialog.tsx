import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.js";
import { Button } from "@/components/ui/button.js";
import { Input } from "@/components/ui/input.js";
import { Label } from "@/components/ui/label.js";
import { Textarea } from "@/components/ui/textarea.js";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.js";
import { ProjectIcon } from "@/components/common/ProjectIcon.js";

import {
  updateTaskSchema,
  type UpdateTaskFormInput,
  type UpdateTaskFormValues,
} from "@/features/tasks/validators/tasks.schemas.js";

import type { Task } from "@/features/tasks/types/tasks.types.js";
import { useUpdateTask } from "@/features/tasks/hooks/useUpdateTask.js";
import { useProjectOptions } from "@/features/projects/hooks/useProjectOptions.js";
import { applyServerErrors } from "@/utils/form-errors.js";
import { getApiError } from "@/utils/api-error.js";

interface EditTaskDialogProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditTaskDialog({
  task,
  open,
  onOpenChange,
}: EditTaskDialogProps) {
  const { mutate: updateTask, isPending } = useUpdateTask();
  const { data: projects = [] } = useProjectOptions();

  const form = useForm<UpdateTaskFormInput, undefined, UpdateTaskFormValues>({
    resolver: zodResolver(updateTaskSchema),
    defaultValues: {
      title: "",
      description: "",
      projectId: "no-project",
      status: "todo",
      priority: "medium",
      dueDate: "",
    },
  });

  useEffect(() => {
    if (task && open) {
      const formattedDueDate = task.dueDate
        ? new Date(task.dueDate).toISOString().split("T")[0]
        : "";

      form.reset({
        title: task.title,
        description: task.description || "",
        projectId: task.projectId || "no-project",
        status: task.status,
        priority: task.priority,
        dueDate: formattedDueDate,
      });
    }
  }, [task, open, form]);

  function onSubmit(values: UpdateTaskFormValues) {
    if (!task) return;

    const payload = {
      ...values,
      projectId:
        values.projectId === "no-project" || !values.projectId
          ? undefined
          : values.projectId,
    };

    updateTask(
      { id: task.id, data: payload },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
        onError: (error) => {
          const { errors } = getApiError(error);
          if (errors) {
            applyServerErrors(form.setError, errors);
          }
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
          <DialogDescription>
            Update task details, status, or assignment.
          </DialogDescription>
        </DialogHeader>

        <form
          id="edit-task-form"
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4"
        >
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-task-title">Title</Label>
            <Input
              id="edit-task-title"
              placeholder="e.g. Implement authentication flow"
              disabled={isPending}
              {...form.register("title")}
            />
            {form.formState.errors.title && (
              <p className="text-xs text-destructive">
                {form.formState.errors.title.message}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-task-description">
              Description{" "}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="edit-task-description"
              placeholder="Add details, acceptance criteria, or notes..."
              rows={3}
              className="resize-none"
              disabled={isPending}
              {...form.register("description")}
            />
            {form.formState.errors.description && (
              <p className="text-xs text-destructive">
                {form.formState.errors.description.message}
              </p>
            )}
          </div>

          {/* Project & Status row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Project */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-task-project">Project</Label>
              <Controller
                control={form.control}
                name="projectId"
                render={({ field }) => (
                  <Select
                    disabled={isPending}
                    onValueChange={field.onChange}
                    value={field.value || "no-project"}
                  >
                    <SelectTrigger id="edit-task-project">
                      <SelectValue placeholder="Select Project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no-project">No Project</SelectItem>
                      {projects.map((proj) => (
                        <SelectItem key={proj.id} value={proj.id}>
                          <div className="flex items-center gap-1.5">
                            <ProjectIcon icon={proj.emoji} color={proj.color} size="xs" />
                            <span className="truncate">{proj.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-task-status">Status</Label>
              <Controller
                control={form.control}
                name="status"
                render={({ field }) => (
                  <Select
                    disabled={isPending}
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <SelectTrigger id="edit-task-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">To Do</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="in_review">In Review</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {/* Priority & Due Date row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Priority */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-task-priority">Priority</Label>
              <Controller
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <Select
                    disabled={isPending}
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <SelectTrigger id="edit-task-priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* Due Date */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-task-due-date">
                Due Date{" "}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </Label>
              <Input
                id="edit-task-due-date"
                type="date"
                disabled={isPending}
                {...form.register("dueDate")}
              />
            </div>
          </div>
        </form>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="edit-task-form"
            disabled={isPending}
          >
            {isPending ? "Saving…" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

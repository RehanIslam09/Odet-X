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
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  updateTaskSchema,
  type UpdateTaskFormInput,
  type UpdateTaskFormValues,
} from "@/features/tasks/validators/tasks.schemas.js";

import type { Task } from "@/features/tasks/types/tasks.types.js";
import { useUpdateTask } from "@/features/tasks/hooks/index.js";
import { useProjects } from "@/features/projects/hooks/useProjects.js";
import { applyServerErrors } from "@/utils/form-errors.js";
import { getApiError } from "@/utils/api-error.js";

interface EditTaskDialogProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Dialog for editing an existing task.
 *
 * Pre-fills form state from the selected task prop.
 */
export function EditTaskDialog({ task, open, onOpenChange }: EditTaskDialogProps) {
  const { mutate: updateTask, isPending } = useUpdateTask();

  // Load projects to select from (up to 100 for dropdown)
  const { data: projectsData } = useProjects({ limit: 100 });
  const projects = projectsData?.items || [];

  const form = useForm<UpdateTaskFormInput, undefined, UpdateTaskFormValues>({
    resolver: zodResolver(updateTaskSchema),
    defaultValues: {
      title: "",
      description: "",
      projectId: null,
      status: "todo",
      priority: "none",
      dueDate: "",
      estimatedTime: "",
      labelsString: "",
    },
  });

  // Sync form values when the target task changes
  useEffect(() => {
    if (task) {
      // If dueDate is a full datetime ISO string, extract the date portion (YYYY-MM-DD)
      const datePart = task.dueDate ? task.dueDate.split("T")[0] || "" : "";

      form.reset({
        title: task.title,
        description: task.description || "",
        projectId: task.projectId || "no-project",
        status: task.status,
        priority: task.priority,
        dueDate: datePart,
        estimatedTime: task.estimatedTime || "",
        labelsString: task.labels ? task.labels.join(", ") : "",
      });
    }
  }, [task, form]);

  function onSubmit(values: UpdateTaskFormValues) {
    if (!task) return;

    // Process labelsString into labels array
    const labels = values.labelsString !== undefined
      ? values.labelsString
          .split(",")
          .map((lbl) => lbl.trim())
          .filter((lbl) => lbl.length > 0)
      : undefined;

    const payload = {
      title: values.title,
      description: values.description,
      projectId: values.projectId === "no-project" ? null : values.projectId,
      status: values.status,
      priority: values.priority,
      dueDate: values.dueDate || null,
      estimatedTime: values.estimatedTime || null,
      labels,
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
            Update your task details below.
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
              placeholder="e.g. Implement OAuth Flow"
              {...form.register("title")}
              disabled={isPending}
            />
            {form.formState.errors.title && (
              <p className="text-xs text-destructive">
                {form.formState.errors.title.message}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-task-description">Description</Label>
            <Textarea
              id="edit-task-description"
              placeholder="Add details about this task..."
              rows={3}
              className="resize-none"
              {...form.register("description")}
              disabled={isPending}
            />
            {form.formState.errors.description && (
              <p className="text-xs text-destructive">
                {form.formState.errors.description.message}
              </p>
            )}
          </div>

          {/* Grid for Project, Status, Priority */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
                          {proj.emoji} {proj.name}
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
                      <SelectValue placeholder="Select Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="backlog">Backlog</SelectItem>
                      <SelectItem value="todo">Todo</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="in_review">In Review</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

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
                      <SelectValue placeholder="Select Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {/* Grid for Due Date & Estimated Time */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Due Date */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-task-due-date">Due Date</Label>
              <Input
                type="date"
                id="edit-task-due-date"
                {...form.register("dueDate")}
                disabled={isPending}
              />
            </div>

            {/* Estimated Time */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-task-est-time">Estimated Time</Label>
              <Input
                id="edit-task-est-time"
                placeholder="e.g. 2h, 1d"
                {...form.register("estimatedTime")}
                disabled={isPending}
              />
              {form.formState.errors.estimatedTime && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.estimatedTime.message}
                </p>
              )}
            </div>
          </div>

          {/* Labels */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-task-labels">
              Labels <span className="font-normal text-muted-foreground">(comma-separated)</span>
            </Label>
            <Input
              id="edit-task-labels"
              placeholder="e.g. frontend, auth, bug"
              {...form.register("labelsString")}
              disabled={isPending}
            />
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

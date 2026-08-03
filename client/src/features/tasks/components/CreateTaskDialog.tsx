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
  createTaskSchema,
  type CreateTaskFormInput,
  type CreateTaskFormValues,
} from "@/features/tasks/validators/tasks.schemas.js";

import { useCreateTask } from "@/features/tasks/hooks/useCreateTask.js";
import { useProjectOptions } from "@/features/projects/hooks/useProjectOptions.js";
import { useProject } from "@/features/projects/hooks/useProject.js";
import { applyServerErrors } from "@/utils/form-errors.js";
import { getApiError } from "@/utils/api-error.js";

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialProjectId?: string;
}

export function CreateTaskDialog({
  open,
  onOpenChange,
  initialProjectId,
}: CreateTaskDialogProps) {
  const { mutate: createTask, isPending } = useCreateTask();

  const { data: projects = [] } = useProjectOptions();

  const { data: fixedProjectData } = useProject(initialProjectId);
  const fixedProject = initialProjectId ? fixedProjectData?.project : undefined;

  const form = useForm<CreateTaskFormInput, undefined, CreateTaskFormValues>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      title: "",
      description: "",
      projectId: initialProjectId || undefined,
      status: "todo",
      priority: "medium",
      dueDate: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        title: "",
        description: "",
        projectId: initialProjectId || undefined,
        status: "todo",
        priority: "medium",
        dueDate: "",
      });
    }
  }, [open, initialProjectId, form]);

  function onSubmit(values: CreateTaskFormValues) {
    const payload = {
      ...values,
      projectId:
        values.projectId === "no-project" || !values.projectId
          ? undefined
          : values.projectId,
    };

    createTask(payload, {
      onSuccess: () => {
        onOpenChange(false);
      },
      onError: (error) => {
        const { errors } = getApiError(error);
        if (errors) {
          applyServerErrors(form.setError, errors);
        }
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Task</DialogTitle>
          <DialogDescription>
            {fixedProject
              ? `Creating a task in project "${fixedProject.name}".`
              : "Create a new task for your workspace."}
          </DialogDescription>
        </DialogHeader>

        <form
          id="create-task-form"
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4"
        >
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="create-task-title">Title</Label>
            <Input
              id="create-task-title"
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
            <Label htmlFor="create-task-description">
              Description{" "}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="create-task-description"
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
              <Label htmlFor="create-task-project">Project</Label>
              <Controller
                control={form.control}
                name="projectId"
                render={({ field }) => (
                  <Select
                    disabled={isPending || Boolean(fixedProject)}
                    onValueChange={field.onChange}
                    value={field.value || "no-project"}
                  >
                    <SelectTrigger id="create-task-project">
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
              <Label htmlFor="create-task-status">Status</Label>
              <Controller
                control={form.control}
                name="status"
                render={({ field }) => (
                  <Select
                    disabled={isPending}
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <SelectTrigger id="create-task-status">
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
              <Label htmlFor="create-task-priority">Priority</Label>
              <Controller
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <Select
                    disabled={isPending}
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <SelectTrigger id="create-task-priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low font-normal">Low</SelectItem>
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
              <Label htmlFor="create-task-due-date">
                Due Date{" "}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </Label>
              <Input
                id="create-task-due-date"
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
            form="create-task-form"
            disabled={isPending}
          >
            {isPending ? "Creating…" : "Create Task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
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
  updateProjectSchema,
  type UpdateProjectFormInput,
  type UpdateProjectFormValues,
} from "@/features/projects/validators/projects.schemas";

import type { Project } from "@/features/projects/types/projects.types";
import { useUpdateProject } from "@/features/projects/hooks";
import { applyServerErrors } from "@/utils/form-errors";
import { getApiError } from "@/utils/api-error";

// ---------------------------------------------------------------------------
// Color Palette — same as CreateProjectDialog for consistency
// ---------------------------------------------------------------------------

const COLOR_PALETTE = [
  "#6366f1",
  "#8b5cf6",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#64748b",
];

const EMOJI_PRESETS = ["📁", "🚀", "⚡", "🎯", "🔥", "💡", "🌟", "🛠️", "📊", "🎨"];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface EditProjectDialogProps {
  project: Project | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Dialog for editing an existing project.
 *
 * Pre-fills with the current project values. The form resets to the
 * project's current values whenever the target project changes —
 * this handles the case where the user opens the dialog for one project,
 * closes it, then opens it for a different one.
 */
export function EditProjectDialog({
  project,
  open,
  onOpenChange,
}: EditProjectDialogProps) {
  const { mutate: updateProject, isPending } = useUpdateProject();

  const form = useForm<UpdateProjectFormInput, undefined, UpdateProjectFormValues>({
    resolver: zodResolver(updateProjectSchema),
    defaultValues: {
      name: "",
      description: "",
      emoji: "📁",
      color: "#6366f1",
    },
  });

  // Sync form values when the target project changes
  useEffect(() => {
    if (project) {
      form.reset({
        name: project.name,
        description: project.description,
        emoji: project.emoji,
        color: project.color,
      });
    }
  }, [project, form]);

  const selectedEmoji = useWatch({
    control: form.control,
    name: "emoji",
  });
  const selectedColor = useWatch({
    control: form.control,
    name: "color",
  });

  function onSubmit(values: UpdateProjectFormValues) {
    if (!project) return;

    updateProject(
      { id: project.id, data: values },
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
          <DialogDescription>
            Update your project details below.
          </DialogDescription>
        </DialogHeader>

        <form
          id="edit-project-form"
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-5"
        >
          {/* Emoji picker */}
          <div className="space-y-2">
            <Label>Icon</Label>
            <div className="flex flex-wrap gap-2">
              {EMOJI_PRESETS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => form.setValue("emoji", emoji)}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg border text-lg transition-all duration-150 hover:scale-110 ${
                    selectedEmoji === emoji
                      ? "border-primary bg-primary/10 shadow-sm"
                      : "border-border bg-background hover:border-muted-foreground"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Color picker */}
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PALETTE.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => form.setValue("color", color)}
                  className={`h-7 w-7 rounded-full transition-all duration-150 hover:scale-110 ${
                    selectedColor === color
                      ? "ring-2 ring-foreground ring-offset-2"
                      : ""
                  }`}
                  style={{ backgroundColor: color }}
                  aria-label={`Select color ${color}`}
                />
              ))}
            </div>
          </div>

          {/* Project name */}
          <div className="space-y-2">
            <Label htmlFor="edit-project-name">Name</Label>
            <Input
              id="edit-project-name"
              placeholder="e.g. Mobile App Redesign"
              {...form.register("name")}
            />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="edit-project-description">
              Description{" "}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="edit-project-description"
              placeholder="What is this project about?"
              rows={3}
              className="resize-none"
              {...form.register("description")}
            />
            {form.formState.errors.description && (
              <p className="text-xs text-destructive">
                {form.formState.errors.description.message}
              </p>
            )}
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
            form="edit-project-form"
            disabled={isPending}
          >
            {isPending ? "Saving…" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

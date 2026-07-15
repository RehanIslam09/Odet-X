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
  createProjectSchema,
  type CreateProjectFormInput,
  type CreateProjectFormValues,
} from "@/features/projects/validators/projects.schemas";

import { useCreateProject } from "@/features/projects/hooks";
import { applyServerErrors } from "@/utils/form-errors";
import { getApiError } from "@/utils/api-error";

// ---------------------------------------------------------------------------
// Color Palette
// ---------------------------------------------------------------------------

const COLOR_PALETTE = [
  "#6366f1", // Indigo
  "#8b5cf6", // Violet
  "#06b6d4", // Cyan
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#ef4444", // Red
  "#ec4899", // Pink
  "#64748b", // Slate
];

const EMOJI_PRESETS = ["📁", "🚀", "⚡", "🎯", "🔥", "💡", "🌟", "🛠️", "📊", "🎨"];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Dialog for creating a new project.
 *
 * Uses React Hook Form + Zod for validation. Server validation errors are
 * applied to the form via `applyServerErrors`, matching the auth form pattern.
 * On success, the dialog closes automatically — the mutation hook handles
 * cache invalidation and the toast.
 */
export function CreateProjectDialog({
  open,
  onOpenChange,
}: CreateProjectDialogProps) {
  const { mutate: createProject, isPending } = useCreateProject();

  const form = useForm<CreateProjectFormInput, undefined, CreateProjectFormValues>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      name: "",
      description: "",
      emoji: "📁",
      color: "#6366f1",
    },
  });

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [open, form]);

  const selectedEmoji = useWatch({
    control: form.control,
    name: "emoji",
  });
  const selectedColor = useWatch({
    control: form.control,
    name: "color",
  });

  function onSubmit(values: CreateProjectFormValues) {
    createProject(values, {
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Project</DialogTitle>
          <DialogDescription>
            Give your project a name and make it yours.
          </DialogDescription>
        </DialogHeader>

        <form
          id="create-project-form"
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
            <Label htmlFor="create-project-name">Name</Label>
            <Input
              id="create-project-name"
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
            <Label htmlFor="create-project-description">
              Description{" "}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="create-project-description"
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
            form="create-project-form"
            disabled={isPending}
          >
            {isPending ? "Creating…" : "Create Project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

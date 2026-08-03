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
} from "@/components/ui/dialog.js";
import { Button } from "@/components/ui/button.js";
import { Input } from "@/components/ui/input.js";
import { Label } from "@/components/ui/label.js";
import { Textarea } from "@/components/ui/textarea.js";

import {
  updateProjectSchema,
  type UpdateProjectFormInput,
  type UpdateProjectFormValues,
} from "@/features/projects/validators/projects.schemas.js";

import type { Project } from "@/features/projects/types/projects.types.js";
import { useUpdateProject } from "@/features/projects/hooks/index.js";
import { ProjectIdentityPicker } from "@/features/projects/components/ProjectIdentityPicker.js";
import { DEFAULT_PROJECT_ICON, DEFAULT_PROJECT_COLOR } from "@/features/projects/config/project-identity.config.js";
import { applyServerErrors } from "@/utils/form-errors.js";
import { getApiError } from "@/utils/api-error.js";

interface EditProjectDialogProps {
  project: Project | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

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
      emoji: DEFAULT_PROJECT_ICON,
      color: DEFAULT_PROJECT_COLOR,
    },
  });

  // Sync form values when the target project changes
  useEffect(() => {
    if (project) {
      form.reset({
        name: project.name,
        description: project.description,
        emoji: project.emoji || DEFAULT_PROJECT_ICON,
        color: project.color || DEFAULT_PROJECT_COLOR,
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
  const projectName = useWatch({
    control: form.control,
    name: "name",
  });
  const projectDescription = useWatch({
    control: form.control,
    name: "description",
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
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
          <DialogDescription>
            Update project identity, name, and details below.
          </DialogDescription>
        </DialogHeader>

        <form
          id="edit-project-form"
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4"
        >
          {/* Project Identity Picker (Icon + Color + Live Preview) */}
          <ProjectIdentityPicker
            selectedIcon={selectedEmoji}
            selectedColor={selectedColor}
            projectName={projectName}
            projectDescription={projectDescription}
            onIconChange={(iconId) => form.setValue("emoji", iconId)}
            onColorChange={(colorHex) => form.setValue("color", colorHex)}
          />

          {/* Project Name */}
          <div className="space-y-1.5">
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
          <div className="space-y-1.5">
            <Label htmlFor="edit-project-description">
              Description{" "}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="edit-project-description"
              placeholder="What is this project about?"
              rows={2}
              className="resize-none text-xs"
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

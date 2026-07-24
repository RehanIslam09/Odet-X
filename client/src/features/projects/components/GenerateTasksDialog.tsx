import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

import { useGenerateTasks } from "@/features/ai";
import { getApiError } from "@/utils/api-error";

interface GenerateTasksDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Dialog for generating project tasks using AI based on a prompt description.
 *
 * UX Behavior:
 * - Empty description prevents submission and displays an inline validation message.
 * - Disables controls and displays a pending spinner while AI task generation is in-flight.
 * - On failure: Keeps the dialog open, preserves entered text, and displays the server error.
 * - On success: Resets the form and closes the dialog cleanly.
 */
export function GenerateTasksDialog({
  projectId,
  open,
  onOpenChange,
}: GenerateTasksDialogProps) {
  const [description, setDescription] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { mutate: generateTasks, isPending } = useGenerateTasks(projectId);

  function handleOpenChange(newOpen: boolean) {
    if (!newOpen) {
      setDescription("");
      setErrorMessage(null);
    }
    onOpenChange(newOpen);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const trimmed = description.trim();
    if (!trimmed) {
      setErrorMessage("Please enter a description for the tasks you want to generate.");
      return;
    }

    setErrorMessage(null);

    generateTasks(
      { description: trimmed },
      {
        onSuccess: () => {
          handleOpenChange(false);
        },
        onError: (error) => {
          const { message } = getApiError(error);
          setErrorMessage(message);
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <DialogTitle>Generate Tasks with AI</DialogTitle>
          </div>
          <DialogDescription className="pt-1.5">
            Describe what feature, module, or goal you want to build. AI will break it down into structured tasks for this project.
          </DialogDescription>
        </DialogHeader>

        <form id="generate-tasks-form" onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="generate-tasks-prompt">Project Requirement or Feature Description</Label>
            <Textarea
              id="generate-tasks-prompt"
              placeholder="e.g. Build user authentication system including OAuth login, password reset flow, JWT token management, and account settings..."
              rows={4}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              disabled={isPending}
              className="resize-none"
            />
            {errorMessage && (
              <p className="text-xs font-medium text-destructive">{errorMessage}</p>
            )}
          </div>
        </form>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="generate-tasks-form"
            disabled={isPending}
            className="gap-2"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating Tasks…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate Tasks
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from "react";
import { Loader2 } from "lucide-react";

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

import { useCreateProjectMemory } from "@/features/projects/hooks/useCreateProjectMemory";

interface CreateProjectMemoryDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateProjectMemoryDialog({
  projectId,
  open,
  onOpenChange,
}: CreateProjectMemoryDialogProps) {
  const [content, setContent] = useState("");
  const { mutateAsync: createMemory, isPending } = useCreateProjectMemory(projectId);

  const normalizedContent = content.trim();
  const normalizedLength = normalizedContent.length;
  const isValid = normalizedLength >= 1 && normalizedLength <= 1000;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || isPending) return;

    try {
      await createMemory({ content: normalizedContent });
      setContent("");
      onOpenChange(false);
    } catch {
      // Error handled by hook and mutation
    }
  };

  const handleClose = (newOpen: boolean) => {
    if (!isPending) {
      if (!newOpen) {
        setContent("");
      }
      onOpenChange(newOpen);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Add Project Memory</DialogTitle>
          <DialogDescription>
            Save important context, constraints, or decisions that Project Copilot should remember when reasoning over this project.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Textarea
              placeholder="e.g. Must use PostgreSQL database and maintain compliance with GDPR guidelines."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              disabled={isPending}
              className="resize-none text-sm"
              aria-label="Memory content"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Explicit user memory for Copilot context</span>
              <span className={normalizedLength > 1000 ? "text-destructive font-medium" : ""}>
                {normalizedLength} / 1000
              </span>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!isValid || isPending} className="gap-2">
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Memory
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

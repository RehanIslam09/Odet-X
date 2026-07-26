import { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

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

import { useUpdateProjectMemory } from "@/features/projects/hooks/useUpdateProjectMemory";
import type { ProjectMemory } from "@/features/projects/types/project-memory.types";
import { isApiError } from "@/utils/api-error";

interface EditProjectMemoryDialogProps {
  projectId: string;
  memory: ProjectMemory | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditProjectMemoryDialog({
  projectId,
  memory,
  open,
  onOpenChange,
}: EditProjectMemoryDialogProps) {
  const [content, setContent] = useState("");
  const [editingVersion, setEditingVersion] = useState<number>(0);
  const [conflictError, setConflictError] = useState(false);

  // Track prop snapshot to synchronize state during rendering when memory updates
  const [prevMemoryId, setPrevMemoryId] = useState<string | null>(null);
  const [prevVersion, setPrevVersion] = useState<number | null>(null);

  const { mutateAsync: updateMemory, isPending } = useUpdateProjectMemory(projectId);

  // Adjust state during render when prop memory changes (standard React pattern)
  if (open && memory && (memory.id !== prevMemoryId || memory.version !== prevVersion)) {
    setPrevMemoryId(memory.id);
    setPrevVersion(memory.version);
    setContent(memory.content);
    setEditingVersion(memory.version);
    if (memory.id !== prevMemoryId) {
      setConflictError(false);
    }
  }

  if (!memory) return null;

  const normalizedContent = content.trim();
  const normalizedLength = normalizedContent.length;
  const isValid = normalizedLength >= 1 && normalizedLength <= 1000;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || isPending) return;

    try {
      await updateMemory({
        memoryId: memory.id,
        data: {
          content: normalizedContent,
          expectedVersion: editingVersion,
        },
      });
      setConflictError(false);
      onOpenChange(false);
    } catch (err) {
      if (isApiError(err, 409)) {
        setConflictError(true);
        // Synchronize with the new version if available in refreshed memory prop
        if (memory && memory.version > editingVersion) {
          setContent(memory.content);
          setEditingVersion(memory.version);
        }
      }
    }
  };

  const handleClose = (newOpen: boolean) => {
    if (!isPending) {
      if (!newOpen) {
        setConflictError(false);
      }
      onOpenChange(newOpen);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Edit Project Memory</DialogTitle>
          <DialogDescription>
            Update this memory note. Modifying a memory updates the persistent context available to Project Copilot.
          </DialogDescription>
        </DialogHeader>

        {conflictError && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-600 dark:text-amber-400">
            <div className="flex items-center gap-2 font-semibold mb-1">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Memory Updated in Another Session
            </div>
            <p className="leading-relaxed">
              This memory was modified elsewhere. Content and version have been refreshed to version {memory.version}. Please review the updated content before submitting your edit again.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-2">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              disabled={isPending}
              className="resize-none text-sm"
              aria-label="Edit memory content"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Version: {editingVersion}</span>
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
              {conflictError ? "Review & Save Again" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

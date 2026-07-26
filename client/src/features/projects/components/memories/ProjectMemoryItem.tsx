import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ProjectMemory } from "@/features/projects/types/project-memory.types";

interface ProjectMemoryItemProps {
  memory: ProjectMemory;
  onEdit: (memory: ProjectMemory) => void;
  onDelete: (memory: ProjectMemory) => void;
}

/**
 * Formats a Date/ISO string cleanly for UI display.
 */
function formatMemoryDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
}

/**
 * Renders an individual Project Memory item card.
 *
 * Privacy Invariants:
 * - Never renders raw owner ObjectId, projectId ObjectId, or __v.
 * - Displays safe content, updated timestamp, and explicit edit/delete action triggers.
 */
export function ProjectMemoryItem({
  memory,
  onEdit,
  onDelete,
}: ProjectMemoryItemProps) {
  return (
    <div className="group relative flex flex-col gap-3 rounded-xl border border-border/70 bg-card/60 p-4 transition-all hover:border-border hover:bg-card hover:shadow-xs">
      <div className="flex items-start justify-between gap-4">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
          {memory.content}
        </p>

        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => onEdit(memory)}
            title="Edit memory"
            aria-label="Edit memory"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onDelete(memory)}
            title="Delete memory"
            aria-label="Delete memory"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between pt-1 text-xs text-muted-foreground">
        <span>Updated {formatMemoryDate(memory.updatedAt)}</span>
      </div>
    </div>
  );
}

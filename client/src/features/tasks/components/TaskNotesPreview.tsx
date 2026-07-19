import { useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Pencil, FileText } from "lucide-react";
import { Button } from "@/components/ui/button.js";
import { MemoizedMarkdownRenderer } from "./MarkdownRenderer.js";
import type { Task } from "../types/tasks.types.js";

interface TaskNotesPreviewProps {
  task: Task;
}

export function TaskNotesPreview({ task }: TaskNotesPreviewProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  const notesContent = task.notes || "";
  const isEmpty = notesContent.trim().length === 0;

  useLayoutEffect(() => {
    if (isEmpty) return;

    const checkOverflow = () => {
      if (contentRef.current) {
        const { scrollHeight, clientHeight } = contentRef.current;
        // Add a small buffer (e.g., 2px) to prevent subpixel rounding issues causing flicker
        setIsOverflowing(scrollHeight > clientHeight + 2);
      }
    };

    // Initial check
    checkOverflow();

    // Use ResizeObserver to react to container width changes (responsive layout shifts)
    if (contentRef.current && window.ResizeObserver) {
      const observer = new ResizeObserver(() => checkOverflow());
      observer.observe(contentRef.current);
      return () => observer.disconnect();
    }
  }, [notesContent, isEmpty]);

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Detailed Notes</h3>
        {!isEmpty && (
          <Button variant="ghost" size="sm" className="h-8 gap-1.5" asChild>
            <Link to={`/tasks/${task.id}/notes?mode=write`}>
              <Pencil className="h-3.5 w-3.5" />
              <span>Edit notes</span>
            </Link>
          </Button>
        )}
      </div>

      {isEmpty ? (
        <div className="bg-muted/20 border border-dashed border-border/60 rounded-xl p-8 flex flex-col items-center justify-center text-center">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <p className="text-sm text-foreground font-medium mb-1">
            Add detailed notes, technical context, implementation ideas, or anything else useful for this task.
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            Notes are securely stored in Markdown format.
          </p>
          <Button variant="outline" asChild>
            <Link to={`/tasks/${task.id}/notes?mode=write`}>
              <Pencil className="h-4 w-4 mr-2" />
              Add notes
            </Link>
          </Button>
        </div>
      ) : (
        <div className="relative border border-border/40 bg-card rounded-xl overflow-hidden shadow-sm">
          {/* Constrained container */}
          <div 
            ref={contentRef}
            className="max-h-[320px] overflow-hidden p-5"
          >
            <MemoizedMarkdownRenderer content={notesContent} />
          </div>

          {/* Fade Overlay & Action - ONLY if actually overflowing */}
          {isOverflowing && (
            <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-card to-transparent pointer-events-none flex items-end justify-center pb-4">
              <Button 
                variant="secondary" 
                size="sm" 
                className="pointer-events-auto shadow-sm"
                asChild
              >
                <Link to={`/tasks/${task.id}/notes?mode=preview`}>
                  Show full notes
                </Link>
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

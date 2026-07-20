import { useRef, useEffect, useCallback } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { Save, Loader2, Check, AlertCircle } from "lucide-react";

import { TaskNotesToolbar } from "./TaskNotesToolbar.js";
import { formatMarkdown, toggleTaskListItem, type MarkdownFormatType } from "../utils/markdownFormatter.js";
import { MemoizedMarkdownRenderer } from "./MarkdownRenderer.js";
import { Button } from "@/components/ui/button.js";
import { cn } from "@/lib/utils.js";

type SaveStatus = "idle" | "saving" | "saved" | "error" | "conflict";

interface TaskNotesEditorProps {
  localDraft: string;
  isDirty: boolean;
  status: SaveStatus;
  onDraftChange: (newDraft: string) => void;
  onExplicitSave: () => void;
  mode: "write" | "preview";
  onModeChange: (mode: "write" | "preview") => void;
}

export function TaskNotesEditor({
  localDraft,
  isDirty,
  status,
  onDraftChange,
  onExplicitSave,
  mode,
  onModeChange,
}: TaskNotesEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleFormat = useCallback((formatType: MarkdownFormatType) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { selectionStart, selectionEnd } = textarea;
    
    // Apply pure formatting transformation
    const result = formatMarkdown({
      value: localDraft,
      selectionStart,
      selectionEnd,
      format: formatType,
    });

    // 1. Focus the textarea
    textarea.focus();

    // 2. Select the EXACT range that needs replacing
    textarea.setSelectionRange(result.targetStart, result.targetEnd);

    // 3. Attempt to use native document.execCommand to preserve the Undo stack
    // This triggers a native 'input' event which React will catch via `onChange`
    let success: boolean;
    try {
      success = document.execCommand("insertText", false, result.replacementText);
    } catch {
      success = false;
    }

    // 4. Fallback if execCommand fails (e.g., some browsers/environments)
    if (!success) {
      onDraftChange(result.value);
    }

    // 5. Restore focus and cursor position after React has committed the new value
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(result.newSelectionStart, result.newSelectionEnd);
    }, 0);
  }, [localDraft, onDraftChange]);

  const handleTaskToggle = useCallback((line: number) => {
    const newDraft = toggleTaskListItem(localDraft, line);
    if (newDraft !== localDraft) {
      onDraftChange(newDraft);
    }
  }, [localDraft, onDraftChange]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Manual Save (Ctrl+S)
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        onExplicitSave();
        return;
      }

      // Formatting shortcuts only when editing
      if (mode === "write" && document.activeElement === textareaRef.current) {
        if ((e.metaKey || e.ctrlKey) && e.key === "b") {
          e.preventDefault();
          handleFormat("bold");
        } else if ((e.metaKey || e.ctrlKey) && e.key === "i") {
          e.preventDefault();
          handleFormat("italic");
        } else if ((e.metaKey || e.ctrlKey) && e.key === "k") {
          e.preventDefault();
          handleFormat("link");
        }
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onExplicitSave, mode, handleFormat]);

  return (
    <div className="border border-border/40 rounded-xl shadow-sm bg-card overflow-hidden flex flex-col mb-8">
      {/* Editor Header */}
      <div className="flex items-center justify-between border-b border-border/40 bg-muted/10 px-3 py-2 gap-4">
        {/* Left Side: Modes & Toolbar */}
        <div className="flex items-center gap-3 flex-1 overflow-hidden">
          {/* Segmented Control for Write/Preview */}
          <div className="flex bg-muted/30 p-0.5 rounded-lg border border-border/40 shrink-0">
            <button 
              onClick={() => onModeChange("write")}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-colors", 
                mode === "write" 
                  ? "bg-background shadow-sm text-foreground" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Write
            </button>
            <button 
              onClick={() => onModeChange("preview")}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-colors", 
                mode === "preview" 
                  ? "bg-background shadow-sm text-foreground" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Preview
            </button>
          </div>
          
          {/* Toolbar (Hidden on mobile, scrollable on slightly larger, fully visible on desktop) */}
          <div className="flex-1 min-w-0 hidden md:block">
            {mode === "write" && (
              <TaskNotesToolbar onFormat={handleFormat} />
            )}
          </div>
        </div>

        {/* Right Side: Status, Save, and Future Extension Point */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-xs hidden sm:flex">
            {status === "saving" && (
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Saving...
              </span>
            )}
            {status === "saved" && (
              <span className="text-emerald-600 dark:text-emerald-500 flex items-center gap-1.5 animate-in fade-in" aria-live="polite">
                <Check className="h-3.5 w-3.5" />
                Saved
              </span>
            )}
            {status === "error" && (
              <span className="text-destructive flex items-center gap-1.5" aria-live="polite">
                <AlertCircle className="h-3.5 w-3.5" />
                Save failed
              </span>
            )}
            {status === "conflict" && (
              <span className="text-destructive font-medium flex items-center gap-1.5" aria-live="polite">
                <AlertCircle className="h-3.5 w-3.5" />
                Conflict
              </span>
            )}
            {status === "idle" && isDirty && (
              <span className="text-amber-600 dark:text-amber-500 font-medium flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-600 dark:bg-amber-500 inline-block"></span>
                Unsaved
              </span>
            )}
          </div>
          
          <Button 
            onClick={onExplicitSave} 
            disabled={!isDirty || status === "saving" || status === "conflict"}
            size="sm"
            className="h-8 px-3 text-xs shadow-sm"
          >
            <Save className="h-3.5 w-3.5 mr-1.5" />
            Save
          </Button>
        </div>
      </div>
      
      {/* Mobile Toolbar (Shows under header on small screens when writing) */}
      {mode === "write" && (
        <div className="md:hidden border-b border-border/40 bg-muted/5 px-2 py-1">
          <TaskNotesToolbar onFormat={handleFormat} />
        </div>
      )}

      {/* Editor Canvas */}
      <div className="flex flex-col min-h-[500px] bg-background">
        {mode === "write" ? (
          <TextareaAutosize
            ref={textareaRef}
            value={localDraft}
            onChange={(e) => onDraftChange(e.target.value)}
            className="w-full flex-1 resize-none bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-ring/50 focus:ring-inset p-4 md:p-6 lg:p-8 text-base text-foreground/90 font-sans leading-relaxed"
            placeholder="Add detailed notes, specifications, or checklists here... (Markdown supported)"
            aria-label="Task notes editor"
            spellCheck={true}
            minRows={20}
          />
        ) : (
          <div className="flex flex-col flex-1 p-4 md:p-6 lg:p-8">
            {localDraft.trim().length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground italic min-h-[400px]">
                Nothing to preview.
              </div>
            ) : (
              <MemoizedMarkdownRenderer 
                content={localDraft} 
                interactiveTaskLists={true}
                onTaskToggle={handleTaskToggle}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

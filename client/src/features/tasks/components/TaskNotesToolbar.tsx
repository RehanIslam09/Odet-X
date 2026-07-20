import { 
  Bold, 
  Italic, 
  Strikethrough, 
  Heading1, 
  Quote, 
  Code, 
  Link as LinkIcon, 
  List, 
  ListOrdered, 
  CheckSquare 
} from "lucide-react";
import { Button } from "@/components/ui/button.js";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip.js";
import { Separator } from "@/components/ui/separator.js";
import type { MarkdownFormatType } from "../utils/markdownFormatter.js";

interface TaskNotesToolbarProps {
  onFormat: (format: MarkdownFormatType) => void;
}

const TOOLBAR_ACTIONS = [
  { id: "heading", icon: Heading1, label: "Heading", format: "heading" as MarkdownFormatType },
  { type: "separator" },
  { id: "bold", icon: Bold, label: "Bold (Ctrl+B)", format: "bold" as MarkdownFormatType },
  { id: "italic", icon: Italic, label: "Italic (Ctrl+I)", format: "italic" as MarkdownFormatType },
  { id: "strikethrough", icon: Strikethrough, label: "Strikethrough", format: "strikethrough" as MarkdownFormatType },
  { type: "separator" },
  { id: "link", icon: LinkIcon, label: "Link (Ctrl+K)", format: "link" as MarkdownFormatType },
  { id: "blockquote", icon: Quote, label: "Quote", format: "blockquote" as MarkdownFormatType },
  { id: "codeBlock", icon: Code, label: "Code Block", format: "codeBlock" as MarkdownFormatType },
  { type: "separator" },
  { id: "list-bullet", icon: List, label: "Bullet List", format: "list-bullet" as MarkdownFormatType },
  { id: "list-number", icon: ListOrdered, label: "Numbered List", format: "list-number" as MarkdownFormatType },
  { id: "list-task", icon: CheckSquare, label: "Task List", format: "list-task" as MarkdownFormatType },
];

export function TaskNotesToolbar({ onFormat }: TaskNotesToolbarProps) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar pb-1 sm:pb-0 px-1">
      <TooltipProvider delayDuration={300}>
        {TOOLBAR_ACTIONS.map((action, index) => {
          if (action.type === "separator") {
            return (
              <Separator 
                key={`sep-${index}`} 
                orientation="vertical" 
                className="h-4 mx-1 shrink-0 bg-border/50" 
              />
            );
          }

          const Icon = action.icon!;
          
          return (
            <Tooltip key={action.id}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onFormat(action.format!)}
                  className="h-8 w-8 p-0 shrink-0 text-muted-foreground hover:text-foreground"
                  aria-label={action.label}
                  type="button"
                  tabIndex={-1} // Prevent taking focus away from editor while typing, though mouse clicks will focus it. We'll handle restoration in the parent.
                >
                  <Icon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {action.label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </TooltipProvider>
    </div>
  );
}

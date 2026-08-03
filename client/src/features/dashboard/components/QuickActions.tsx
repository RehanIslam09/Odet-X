import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { FolderPlus, Sparkles, SquareCheckBig, Search, UserPlus, Zap } from "lucide-react";

import { Button } from "@/components/ui/button.js";
import { useGlobalCopilot } from "@/features/ai/context/GlobalCopilotContext.js";
import { useCommandPalette } from "@/features/commands/hooks/useCommandPalette.js";
import { useActiveWorkspace } from "@/features/workspaces/context/WorkspaceContext.js";

export const QuickActions = memo(function QuickActions() {
  const navigate = useNavigate();
  const { openCopilot } = useGlobalCopilot();
  const { openCommandPalette } = useCommandPalette();
  const { getWorkspaceHref } = useActiveWorkspace();

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card p-4 shadow-2xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Zap className="h-3.5 w-3.5" />
          </div>
          <h2 className="text-xs font-semibold tracking-tight text-foreground uppercase">
            Launchpad
          </h2>
        </div>
        <span className="text-[10px] text-muted-foreground font-mono">Quick Actions</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Button
          id="quick-action-ask-ai"
          variant="outline"
          size="sm"
          className="w-full justify-between h-9 border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors cursor-pointer text-xs"
          onClick={() => openCopilot({ type: "workspace" })}
        >
          <div className="flex items-center gap-1.5 truncate">
            <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse shrink-0" />
            <span className="truncate">Ask Copilot</span>
          </div>
          <kbd className="font-mono text-[9px] text-primary/70 bg-primary/10 px-1 py-0.5 rounded-xs shrink-0">
            ⌘J
          </kbd>
        </Button>

        <Button
          id="quick-action-command-palette"
          variant="outline"
          size="sm"
          className="w-full justify-between h-9 hover:bg-accent cursor-pointer text-xs"
          onClick={openCommandPalette}
        >
          <div className="flex items-center gap-1.5 truncate">
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="truncate">Palette</span>
          </div>
          <kbd className="font-mono text-[9px] text-muted-foreground bg-muted px-1 py-0.5 rounded-xs shrink-0">
            ⌘K
          </kbd>
        </Button>

        <Button
          id="quick-action-new-task"
          variant="outline"
          size="sm"
          className="w-full justify-start gap-1.5 h-9 hover:bg-accent cursor-pointer text-xs"
          onClick={() => navigate("/tasks")}
        >
          <SquareCheckBig className="h-3.5 w-3.5 text-sky-500 shrink-0" />
          <span className="truncate">Tasks</span>
        </Button>

        <Button
          id="quick-action-new-project"
          variant="outline"
          size="sm"
          className="w-full justify-start gap-1.5 h-9 hover:bg-accent cursor-pointer text-xs"
          onClick={() => navigate("/projects")}
        >
          <FolderPlus className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
          <span className="truncate">Projects</span>
        </Button>

        <Button
          id="quick-action-invite-member"
          variant="outline"
          size="sm"
          className="w-full justify-start gap-1.5 h-9 hover:bg-accent cursor-pointer text-xs sm:col-span-2"
          onClick={() => navigate(getWorkspaceHref("settings/members"))}
        >
          <UserPlus className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
          <span className="truncate">Manage Team Members & Workspace</span>
        </Button>
      </div>
    </div>
  );
});

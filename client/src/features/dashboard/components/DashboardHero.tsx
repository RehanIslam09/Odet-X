import { motion } from "framer-motion";
import { Sparkles, Search, SquareCheckBig, FolderPlus, UserPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useCurrentUser } from "@/features/auth/hooks";
import {
  formatDashboardDate,
  getTimeOfDayGreeting,
} from "@/features/dashboard/utils/dashboard.utils";
import { useGlobalCopilot } from "@/features/ai/context/GlobalCopilotContext";
import { useCommandPalette } from "@/features/commands/hooks/useCommandPalette.js";
import { useActiveWorkspace } from "@/features/workspaces/context/WorkspaceContext.js";
import { Button } from "@/components/ui/button.js";

export function DashboardHero() {
  const { data: user } = useCurrentUser();
  const firstName = user?.name?.split(" ")[0];
  const { openCopilot } = useGlobalCopilot();
  const { openCommandPalette } = useCommandPalette();
  const { currentWorkspace, getWorkspaceHref } = useActiveWorkspace();
  const navigate = useNavigate();

  const isPersonal = currentWorkspace?.type === "PERSONAL" || currentWorkspace?.isPersonal === true;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/40 pb-5"
    >
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {formatDashboardDate()}
        </p>
        <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {getTimeOfDayGreeting()}
          {firstName ? `, ${firstName}` : ""}
        </h1>
      </div>

      {/* Sleek, Minimal Action Command Strip */}
      <div className="flex flex-wrap items-center gap-2" id="quick-actions-bar">
        <span className="hidden lg:inline text-[10px] font-mono text-muted-foreground uppercase tracking-wider mr-1">
          Quick Actions
        </span>

        <Button
          id="quick-action-ask-ai"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors text-xs cursor-pointer rounded-lg"
          onClick={() => openCopilot({ type: "workspace" })}
        >
          <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
          <span>Ask AI</span>
          <kbd className="font-mono text-[9px] text-primary/70 bg-primary/10 px-1 py-0.2 rounded-xs">
            ⌘J
          </kbd>
        </Button>

        <Button
          id="quick-action-command-palette"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs hover:bg-accent cursor-pointer rounded-lg"
          onClick={openCommandPalette}
        >
          <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span>Search</span>
          <kbd className="font-mono text-[9px] text-muted-foreground bg-muted px-1 py-0.2 rounded-xs">
            ⌘K
          </kbd>
        </Button>

        <Button
          id="quick-action-new-task"
          variant="outline"
          size="sm"
          className="h-8 gap-1 text-xs hover:bg-accent cursor-pointer rounded-lg"
          onClick={() => navigate(getWorkspaceHref("tasks"))}
        >
          <SquareCheckBig className="h-3.5 w-3.5 text-sky-500 shrink-0" />
          <span>Tasks</span>
        </Button>

        <Button
          id="quick-action-new-project"
          variant="outline"
          size="sm"
          className="h-8 gap-1 text-xs hover:bg-accent cursor-pointer rounded-lg"
          onClick={() => navigate(getWorkspaceHref("projects"))}
        >
          <FolderPlus className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
          <span>Projects</span>
        </Button>

        {!isPersonal && (
          <Button
            id="quick-action-invite-member"
            variant="outline"
            size="sm"
            className="h-8 gap-1 text-xs hover:bg-accent cursor-pointer rounded-lg"
            onClick={() => navigate(getWorkspaceHref("settings/members"))}
          >
            <UserPlus className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            <span>Members</span>
          </Button>
        )}
      </div>
    </motion.div>
  );
}

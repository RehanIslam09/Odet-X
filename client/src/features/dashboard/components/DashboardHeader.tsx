import { memo } from "react";
import { motion } from "framer-motion";
import { Sparkles, Users, Search, SquareCheckBig, FolderPlus, UserPlus, Zap, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser.js";
import { formatDashboardDate, getTimeOfDayGreeting } from "@/features/dashboard/utils/dashboard.utils.js";
import { useGlobalCopilot } from "@/features/ai/context/GlobalCopilotContext.js";
import { useCommandPalette } from "@/features/commands/hooks/useCommandPalette.js";
import { useActiveWorkspace } from "@/features/workspaces/context/WorkspaceContext.js";
import { usePresenceAwareness } from "@/realtime/usePresenceAwareness.js";
import { Avatar, AvatarFallback } from "@/components/ui/avatar.js";
import { PresenceBadge } from "@/features/workspaces/components/PresenceBadge.js";
import { Badge } from "@/components/ui/badge.js";
import { Button } from "@/components/ui/button.js";
import type { DashboardSummary } from "@/features/dashboard/types/dashboard.types.js";

interface DashboardHeaderProps {
  summary?: DashboardSummary;
}

export const DashboardHeader = memo(function DashboardHeader({ summary }: DashboardHeaderProps) {
  const { data: user } = useCurrentUser();
  const firstName = user?.name?.split(" ")[0];
  const { openCopilot } = useGlobalCopilot();
  const { openCommandPalette } = useCommandPalette();
  const { getWorkspaceHref } = useActiveWorkspace();
  const navigate = useNavigate();
  const { presenceUsers } = usePresenceAwareness();

  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const activeTasks = summary?.tasks.totalActive ?? 0;
  const completedTasks = summary?.tasks.completed ?? 0;
  const totalTasks = activeTasks + completedTasks;
  const taskPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 100;
  const isHealthy = taskPercentage >= 60;

  const onlineCount = Math.max(presenceUsers.length, 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col gap-4 rounded-xl border border-border/60 bg-card p-5 shadow-2xs"
    >
      {/* Top Bar: Hero Greeting, Ambient Team Presence, & Quiet Workspace Health */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs text-muted-foreground font-medium">
            {formatDashboardDate()}
          </p>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {getTimeOfDayGreeting()}
            {firstName ? `, ${firstName}` : ""}
          </h1>
        </div>

        {/* Header Indicators: Team Avatars & System Health Pill */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Quiet Health Indicator */}
          <Badge
            variant="outline"
            className={`text-xs font-medium gap-1 px-2.5 py-1 ${
              isHealthy
                ? "border-emerald-500/30 text-emerald-500 bg-emerald-500/10"
                : "border-amber-500/30 text-amber-500 bg-amber-500/10"
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Workspace Health: {isHealthy ? "Optimal" : "Attention Needed"}</span>
          </Badge>

          {/* Ambient Presence Stack */}
          <div className="flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/20 px-2.5 py-1">
            <Users className="h-3.5 w-3.5 text-emerald-500" />
            <div className="flex -space-x-1.5 items-center">
              {presenceUsers.length === 0 ? (
                <div className="relative">
                  <Avatar className="h-6 w-6 border border-background">
                    <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-semibold">
                      {getInitials(user?.name || "You")}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute -bottom-0.5 -right-0.5">
                    <PresenceBadge status="online" />
                  </span>
                </div>
              ) : (
                presenceUsers.slice(0, 4).map((u) => (
                  <div key={u.userId} className="relative" title={`${u.name} (Online)`}>
                    <Avatar className="h-6 w-6 border border-background">
                      <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-semibold">
                        {getInitials(u.name)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                ))
              )}
            </div>
            <span className="text-[11px] font-semibold text-muted-foreground ml-1">
              Online Team ({onlineCount})
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Bar: Compact Keyboard-First Quick Actions Launchpad */}
      <div className="pt-3 border-t border-border/40 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <div className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Zap className="h-3 w-3" />
          </div>
          <span className="text-xs font-semibold text-foreground uppercase tracking-tight">
            Quick Actions
          </span>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <Button
            id="quick-action-ask-ai"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors cursor-pointer text-xs"
            onClick={() => openCopilot({ type: "workspace" })}
          >
            <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" />
            <span>Ask Copilot</span>
            <kbd className="font-mono text-[9px] text-primary/70 bg-primary/10 px-1 py-0.5 rounded-xs">
              ⌘J
            </kbd>
          </Button>

          <Button
            id="quick-action-command-palette"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 hover:bg-accent cursor-pointer text-xs"
            onClick={openCommandPalette}
          >
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Palette</span>
            <kbd className="font-mono text-[9px] text-muted-foreground bg-muted px-1 py-0.5 rounded-xs">
              ⌘K
            </kbd>
          </Button>

          <Button
            id="quick-action-new-task"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 hover:bg-accent cursor-pointer text-xs"
            onClick={() => navigate("/tasks")}
          >
            <SquareCheckBig className="h-3.5 w-3.5 text-sky-500" />
            <span>Tasks</span>
          </Button>

          <Button
            id="quick-action-new-project"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 hover:bg-accent cursor-pointer text-xs"
            onClick={() => navigate("/projects")}
          >
            <FolderPlus className="h-3.5 w-3.5 text-indigo-500" />
            <span>Projects</span>
          </Button>

          <Button
            id="quick-action-invite-member"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 hover:bg-accent cursor-pointer text-xs"
            onClick={() => navigate(getWorkspaceHref("settings/members"))}
          >
            <UserPlus className="h-3.5 w-3.5 text-emerald-500" />
            <span>Manage Team</span>
          </Button>
        </div>
      </div>
    </motion.div>
  );
});

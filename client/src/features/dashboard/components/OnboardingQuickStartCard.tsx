import { memo } from "react";
import { Link } from "react-router-dom";
import { FolderPlus, SquareCheckBig, Sparkles, ArrowRight } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card.js";
import { Button } from "@/components/ui/button.js";
import { useGlobalCopilot } from "@/features/ai/context/GlobalCopilotContext.js";
import { useActiveWorkspace } from "@/features/workspaces/context/WorkspaceContext.js";

export const OnboardingQuickStartCard = memo(function OnboardingQuickStartCard() {
  const { openCopilot } = useGlobalCopilot();
  const { currentWorkspace } = useActiveWorkspace();

  const projectsLink = currentWorkspace ? `/w/${currentWorkspace.slug}/projects` : "/projects";
  const tasksLink = currentWorkspace ? `/w/${currentWorkspace.slug}/tasks` : "/tasks";

  return (
    <Card className="flex flex-col border-border/60 bg-card shadow-2xs p-2">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold text-foreground">
              Welcome to your Workspace
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Get started by creating your first project or bootstrapping with AI
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-0 flex flex-col gap-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex flex-col justify-between gap-3 rounded-lg border border-border/40 bg-muted/20 p-4">
            <div className="flex flex-col gap-1">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-500/10 text-indigo-500 mb-1">
                <FolderPlus className="h-4 w-4" />
              </div>
              <h4 className="text-xs font-semibold text-foreground">1. Create a Project</h4>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Organize work items, track milestones, and manage team deliverables.
              </p>
            </div>
            <Button size="sm" variant="outline" asChild className="h-8 text-xs gap-1 cursor-pointer">
              <Link to={projectsLink}>
                <span>New Project</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </div>

          <div className="flex flex-col justify-between gap-3 rounded-lg border border-border/40 bg-muted/20 p-4">
            <div className="flex flex-col gap-1">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-sky-500/10 text-sky-500 mb-1">
                <SquareCheckBig className="h-4 w-4" />
              </div>
              <h4 className="text-xs font-semibold text-foreground">2. Add Tasks</h4>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Break down work into manageable tasks with due dates and priorities.
              </p>
            </div>
            <Button size="sm" variant="outline" asChild className="h-8 text-xs gap-1 cursor-pointer">
              <Link to={tasksLink}>
                <span>Create Task</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </div>

          <div className="flex flex-col justify-between gap-3 rounded-lg border border-border/40 bg-muted/20 p-4">
            <div className="flex flex-col gap-1">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary mb-1">
                <Sparkles className="h-4 w-4" />
              </div>
              <h4 className="text-xs font-semibold text-foreground">3. Bootstrap with AI</h4>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Let AI Copilot generate project tasks and workspace structures automatically.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1 border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 cursor-pointer"
              onClick={() => openCopilot({ type: "workspace" })}
            >
              <span>Ask AI Copilot</span>
              <Sparkles className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

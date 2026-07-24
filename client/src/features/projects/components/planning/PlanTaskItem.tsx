import { Trash2, Link as LinkIcon, Flag, Clock, Layers } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { PlanDraftTask, PlanDraftMilestone } from "@/features/ai/types/ai.types";

interface PlanTaskItemProps {
  task: PlanDraftTask;
  allTasks: PlanDraftTask[];
  allMilestones: PlanDraftMilestone[];
  onChange: (updated: PlanDraftTask) => void;
  onRemove: () => void;
}

export function PlanTaskItem({
  task,
  allTasks,
  allMilestones,
  onChange,
  onRemove,
}: PlanTaskItemProps) {
  // Exclude self from candidate dependencies to prevent self-dependency
  const availablePrerequisites = allTasks.filter((t) => t.tempId !== task.tempId);

  const toggleDependency = (depTempId: string) => {
    const exists = task.dependencies.includes(depTempId);
    const newDeps = exists
      ? task.dependencies.filter((id) => id !== depTempId)
      : [...task.dependencies, depTempId];
    onChange({ ...task, dependencies: newDeps });
  };

  return (
    <Card className="border-border/60 shadow-xs transition-colors hover:border-border">
      <CardContent className="p-3.5 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Badge variant="outline" className="h-6 text-xs font-mono px-2 shrink-0">
              #{task.position}
            </Badge>
            <Input
              value={task.title}
              onChange={(e) => onChange({ ...task, title: e.target.value })}
              placeholder="Task Title"
              maxLength={120}
              className="h-7 font-semibold text-xs border-transparent hover:border-input focus:border-input truncate"
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
            title="Remove Task"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div>
          <Textarea
            value={task.description}
            onChange={(e) => onChange({ ...task, description: e.target.value })}
            placeholder="Task Description (optional)"
            rows={2}
            maxLength={2000}
            className="text-xs resize-none border-transparent hover:border-input focus:border-input"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
          {/* Priority Select */}
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Flag className="h-3 w-3" /> Priority
            </Label>
            <Select
              value={task.priority}
              onValueChange={(val: "none" | "low" | "medium" | "high" | "urgent") =>
                onChange({ ...task, priority: val })
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Estimate Input */}
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> Estimate
            </Label>
            <Input
              value={task.estimatedTime || ""}
              onChange={(e) => onChange({ ...task, estimatedTime: e.target.value || null })}
              placeholder="e.g. 4h, 1d"
              maxLength={50}
              className="h-8 text-xs"
            />
          </div>

          {/* Milestone Assignment */}
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Layers className="h-3 w-3" /> Milestone
            </Label>
            <Select
              value={task.milestoneTempId || "none"}
              onValueChange={(val) =>
                onChange({ ...task, milestoneTempId: val === "none" ? null : val })
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="No Milestone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {allMilestones.map((ms) => (
                  <SelectItem key={ms.tempId} value={ms.tempId}>
                    #{ms.position} {ms.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Prerequisites / Dependencies */}
        {availablePrerequisites.length > 0 && (
          <div className="space-y-1.5 pt-2 border-t border-border/40">
            <Label className="text-[11px] text-muted-foreground flex items-center gap-1">
              <LinkIcon className="h-3 w-3" /> Prerequisites (Task must be completed BEFORE this task)
            </Label>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {availablePrerequisites.map((prereq) => {
                const isSelected = task.dependencies.includes(prereq.tempId);
                return (
                  <Button
                    key={prereq.tempId}
                    type="button"
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    className="h-6 text-[11px] px-2 max-w-[200px] sm:max-w-[260px]"
                    onClick={() => toggleDependency(prereq.tempId)}
                    title={`#${prereq.position} ${prereq.title}`}
                  >
                    <span className="truncate">#{prereq.position} {prereq.title}</span>
                  </Button>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

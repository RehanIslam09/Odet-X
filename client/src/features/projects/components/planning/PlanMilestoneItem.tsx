import { Trash2, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { PlanDraftMilestone } from "@/features/ai/types/ai.types";

interface PlanMilestoneItemProps {
  milestone: PlanDraftMilestone;
  onChange: (updated: PlanDraftMilestone) => void;
  onRemove: () => void;
}

export function PlanMilestoneItem({
  milestone,
  onChange,
  onRemove,
}: PlanMilestoneItemProps) {
  // Format date string for HTML date input (YYYY-MM-DD)
  const dateValue = milestone.targetDate
    ? new Date(milestone.targetDate).toISOString().split("T")[0]
    : "";

  return (
    <Card className="border-border/60 shadow-xs transition-colors hover:border-border">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-1">
            <Badge variant="secondary" className="h-6 text-xs font-mono px-2 shrink-0">
              Phase {milestone.position}
            </Badge>
            <Input
              value={milestone.title}
              onChange={(e) => onChange({ ...milestone, title: e.target.value })}
              placeholder="Milestone Title"
              maxLength={120}
              className="h-8 font-medium text-sm border-transparent hover:border-input focus:border-input"
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
            title="Remove Milestone"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <div>
          <Textarea
            value={milestone.description}
            onChange={(e) => onChange({ ...milestone, description: e.target.value })}
            placeholder="Milestone Objectives & Description (optional)"
            rows={2}
            maxLength={1000}
            className="text-xs resize-none border-transparent hover:border-input focus:border-input"
          />
        </div>

        <div className="space-y-1 max-w-xs pt-1 text-xs">
          <Label className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" /> Target Completion Date
          </Label>
          <Input
            type="date"
            value={dateValue || ""}
            onChange={(e) =>
              onChange({
                ...milestone,
                targetDate: e.target.value ? new Date(e.target.value).toISOString() : null,
              })
            }
            className="h-8 text-xs"
          />
        </div>
      </CardContent>
    </Card>
  );
}

import { useState } from "react";
import { Save, Trash2, CheckCircle2, Plus, Layers, CheckSquare, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { PlanTaskItem } from "./PlanTaskItem";
import { PlanMilestoneItem } from "./PlanMilestoneItem";
import { PLAN_MAX_TASKS, PLAN_MAX_MILESTONES } from "@/constants/planning";
import type { PlanDraft, PlanDraftTask, PlanDraftMilestone } from "@/features/ai/types/ai.types";

interface PlanReviewWorkspaceProps {
  draft: PlanDraft;
  onSave: (tasks: PlanDraftTask[], milestones: PlanDraftMilestone[]) => void;
  onDiscard: () => void;
  onCommit: () => void;
  isSaving: boolean;
  isCommitting: boolean;
  isDiscarding: boolean;
}

export function PlanReviewWorkspace({
  draft,
  onSave,
  onDiscard,
  onCommit,
  isSaving,
  isCommitting,
  isDiscarding,
}: PlanReviewWorkspaceProps) {
  const [tasks, setTasks] = useState<PlanDraftTask[]>(() => draft.tasks || []);
  const [milestones, setMilestones] = useState<PlanDraftMilestone[]>(() => draft.milestones || []);
  const [activeTab, setActiveTab] = useState<"tasks" | "milestones">("tasks");
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [showCommitConfirm, setShowCommitConfirm] = useState(false);

  // Compute dirty state
  const isDirty =
    JSON.stringify(tasks) !== JSON.stringify(draft.tasks) ||
    JSON.stringify(milestones) !== JSON.stringify(draft.milestones);

  // Add Task handler
  const handleAddTask = () => {
    if (tasks.length >= PLAN_MAX_TASKS) return;
    const newTempId = `temp_task_${Date.now()}`;
    const newTask: PlanDraftTask = {
      tempId: newTempId,
      title: `New Task ${tasks.length + 1}`,
      description: "",
      priority: "medium",
      estimatedTime: null,
      position: tasks.length + 1,
      dependencies: [],
      milestoneTempId: milestones[0]?.tempId || null,
    };
    setTasks([...tasks, newTask]);
  };

  // Add Milestone handler
  const handleAddMilestone = () => {
    if (milestones.length >= PLAN_MAX_MILESTONES) return;
    const newTempId = `temp_ms_${Date.now()}`;
    const newMilestone: PlanDraftMilestone = {
      tempId: newTempId,
      title: `Phase ${milestones.length + 1}: New Milestone`,
      description: "",
      targetDate: null,
      position: milestones.length + 1,
    };
    setMilestones([...milestones, newMilestone]);
  };

  // Task Removal handler (cleans up dependencies pointing to it)
  const handleRemoveTask = (tempId: string) => {
    const updatedTasks = tasks
      .filter((t) => t.tempId !== tempId)
      .map((t, idx) => ({
        ...t,
        position: idx + 1,
        dependencies: t.dependencies.filter((depId) => depId !== tempId),
      }));
    setTasks(updatedTasks);
  };

  // Milestone Removal handler (clears milestoneTempId pointing to it)
  const handleRemoveMilestone = (tempId: string) => {
    const updatedMilestones = milestones
      .filter((m) => m.tempId !== tempId)
      .map((m, idx) => ({ ...m, position: idx + 1 }));

    const updatedTasks = tasks.map((t) =>
      t.milestoneTempId === tempId ? { ...t, milestoneTempId: null } : t
    );

    setMilestones(updatedMilestones);
    setTasks(updatedTasks);
  };

  // Update Task handler
  const handleTaskChange = (idx: number, updated: PlanDraftTask) => {
    const copy = [...tasks];
    copy[idx] = updated;
    setTasks(copy);
  };

  // Update Milestone handler
  const handleMilestoneChange = (idx: number, updated: PlanDraftMilestone) => {
    const copy = [...milestones];
    copy[idx] = updated;
    setMilestones(copy);
  };

  // Save handler
  const handleSave = () => {
    onSave(tasks, milestones);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-3 py-1 overflow-hidden">
      {/* Top Header: Badges & Controls */}
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-border/50">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant="outline" className="gap-1 py-0.5 px-2 text-[11px]">
            <CheckSquare className="h-3 w-3 text-primary" />
            {tasks.length} Tasks
          </Badge>
          <Badge variant="outline" className="gap-1 py-0.5 px-2 text-[11px]">
            <Layers className="h-3 w-3 text-secondary-foreground" />
            {milestones.length} Milestones
          </Badge>
          <Badge variant="secondary" className="uppercase tracking-wider text-[10px] py-0.5 px-1.5">
            {draft.status}
          </Badge>
          {isDirty && (
            <Badge variant="destructive" className="animate-pulse text-[10px] py-0.5 px-1.5">
              Unsaved
            </Badge>
          )}
        </div>

        {activeTab === "tasks" ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddTask}
            disabled={tasks.length >= PLAN_MAX_TASKS}
            className="gap-1 text-xs h-7 px-2.5"
          >
            <Plus className="h-3.5 w-3.5" /> Add Task
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddMilestone}
            disabled={milestones.length >= PLAN_MAX_MILESTONES}
            className="gap-1 text-xs h-7 px-2.5"
          >
            <Plus className="h-3.5 w-3.5" /> Add Milestone
          </Button>
        )}
      </div>

      {/* Tabs Switcher & Scrollable Content */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "tasks" | "milestones")}
        className="flex-1 flex flex-col min-h-0 w-full space-y-2.5"
      >
        <div className="shrink-0 flex items-center justify-between">
          <TabsList className="grid grid-cols-2 w-48 h-8">
            <TabsTrigger value="tasks" className="text-xs">
              Tasks ({tasks.length})
            </TabsTrigger>
            <TabsTrigger value="milestones" className="text-xs">
              Milestones ({milestones.length})
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="tasks" className="flex-1 space-y-2.5 overflow-y-auto pr-1 mt-0">
          {tasks.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
              No tasks proposed in this plan draft. Click "Add Task" to create one.
            </div>
          ) : (
            tasks.map((task, idx) => (
              <PlanTaskItem
                key={task.tempId}
                task={task}
                allTasks={tasks}
                allMilestones={milestones}
                onChange={(updated) => handleTaskChange(idx, updated)}
                onRemove={() => handleRemoveTask(task.tempId)}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="milestones" className="flex-1 space-y-2.5 overflow-y-auto pr-1 mt-0">
          {milestones.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
              No milestones proposed in this plan draft. Click "Add Milestone" to create one.
            </div>
          ) : (
            milestones.map((ms, idx) => (
              <PlanMilestoneItem
                key={ms.tempId}
                milestone={ms}
                onChange={(updated) => handleMilestoneChange(idx, updated)}
                onRemove={() => handleRemoveMilestone(ms.tempId)}
              />
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Fixed Bottom Action Footer */}
      <div className="shrink-0 pt-2.5 border-t border-border/50 flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleSave}
          disabled={!isDirty || isSaving || isCommitting}
          className="gap-1.5 h-8 text-xs"
        >
          {isSaving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          Save Draft
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowDiscardConfirm(true)}
          disabled={isDiscarding || isCommitting}
          className="gap-1.5 h-8 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Discard
        </Button>

        <Button
          type="button"
          size="sm"
          onClick={() => setShowCommitConfirm(true)}
          disabled={isCommitting || isSaving}
          className="gap-1.5 h-8 text-xs shadow-xs"
        >
          {isCommitting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5" />
          )}
          Commit Plan
        </Button>
      </div>

      {/* Discard Confirmation Dialog */}
      {showDiscardConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-xs">
          <div className="max-w-md w-full p-6 bg-card border rounded-xl shadow-lg space-y-4">
            <h3 className="text-lg font-semibold">Discard Project Plan?</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Are you sure you want to discard this plan draft? This action will set the plan to discarded. No project tasks or milestones have been created yet.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDiscardConfirm(false)}
                disabled={isDiscarding}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  setShowDiscardConfirm(false);
                  onDiscard();
                }}
                disabled={isDiscarding}
              >
                {isDiscarding ? "Discarding..." : "Discard Plan"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Commit Confirmation Dialog */}
      {showCommitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-xs">
          <div className="max-w-md w-full p-6 bg-card border rounded-xl shadow-lg space-y-4">
            <h3 className="text-lg font-semibold">Commit Plan to Project?</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              This will create <strong>{tasks.length} permanent tasks</strong> and{" "}
              <strong>{milestones.length} permanent milestones</strong> in this project based on your reviewed plan.
            </p>
            {isDirty && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-md text-xs text-amber-600 dark:text-amber-400">
                Notice: Unsaved edits will be saved before committing.
              </div>
            )}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCommitConfirm(false)}
                disabled={isCommitting}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setShowCommitConfirm(false);
                  if (isDirty) {
                    onSave(tasks, milestones);
                  }
                  onCommit();
                }}
                disabled={isCommitting}
                className="gap-2"
              >
                {isCommitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Committing Plan...
                  </>
                ) : (
                  "Commit & Create Tasks"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

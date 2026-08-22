import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button.js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.js";
import { Label } from "@/components/ui/label.js";
import { Badge } from "@/components/ui/badge.js";
import { Sparkles, Brain, Save, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useActiveWorkspace } from "@/features/workspaces/context/WorkspaceContext.js";
import { useUpdateWorkspace } from "@/features/workspaces/hooks/useWorkspaces.js";

type ModelTier = "FAST" | "BALANCED" | "DEEP_CONTEXT";

export function AISettingsTab() {
  const { currentWorkspace } = useActiveWorkspace();
  const updateMutation = useUpdateWorkspace();

  const initialTier = (currentWorkspace?.aiSettings?.model as ModelTier) || "DEEP_CONTEXT";
  const initialProactive = currentWorkspace?.aiSettings?.proactiveEnabled ?? true;
  const initialRetention = currentWorkspace?.aiSettings?.memoryRetentionDays ?? 90;

  const [modelTier, setModelTier] = useState<ModelTier>(initialTier);
  const [proactiveEnabled, setProactiveEnabled] = useState<boolean>(initialProactive);
  const [memoryRetentionDays, setMemoryRetentionDays] = useState<number>(initialRetention);
  const [prevWorkspaceId, setPrevWorkspaceId] = useState<string | undefined>(currentWorkspace?.id);

  // Sync state when active workspace changes during render
  if (currentWorkspace && currentWorkspace.id !== prevWorkspaceId) {
    setPrevWorkspaceId(currentWorkspace.id);
    setModelTier(initialTier);
    setProactiveEnabled(initialProactive);
    setMemoryRetentionDays(initialRetention);
  }

  const hasChanges = useMemo(() => {
    if (!currentWorkspace) return false;
    return (
      modelTier !== initialTier ||
      proactiveEnabled !== initialProactive ||
      memoryRetentionDays !== initialRetention
    );
  }, [currentWorkspace, modelTier, proactiveEnabled, memoryRetentionDays, initialTier, initialProactive, initialRetention]);

  const handleSave = () => {
    if (!currentWorkspace?.id) return;

    updateMutation.mutate(
      {
        workspaceId: currentWorkspace.id,
        input: {
          aiSettings: {
            model: modelTier,
            proactiveEnabled,
            memoryRetentionDays,
          },
        },
      },
      {
        onSuccess: () => {
          toast.success("AI Workspace settings saved successfully!");
        },
        onError: (err: unknown) => {
          const apiErr = err as { response?: { data?: { message?: string } }; message?: string };
          toast.error(apiErr.response?.data?.message || apiErr.message || "Failed to save AI workspace settings.");
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground">AI Copilot & Proactive Intelligence</h3>
        <p className="text-xs text-muted-foreground">
          Configure model routing policy, project memory retention, and proactive recommendation engine.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span>AI Copilot Model Routing Tier</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Select default reasoning depth and context window size for AI Copilot queries.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                id: "FAST",
                name: "Fast Tier",
                desc: "Quick lightweight responses for simple task formatting and queries.",
                badge: "Lowest Latency",
              },
              {
                id: "BALANCED",
                name: "Balanced Tier",
                desc: "Standard AI reasoning with standard project context depth.",
                badge: "Recommended",
              },
              {
                id: "DEEP_CONTEXT",
                name: "Deep Context Tier",
                desc: "Full vector memory, project history, and multi-file architecture synthesis.",
                badge: "Highest Quality",
              },
            ].map((tier) => {
              const isSelected = modelTier === tier.id;
              return (
                <div
                  key={tier.id}
                  onClick={() => setModelTier(tier.id as ModelTier)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer space-y-2 ${
                    isSelected
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "border-border hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-foreground">{tier.name}</span>
                    {isSelected && <CheckCircle2 className="h-4 w-4 text-primary" />}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{tier.desc}</p>
                  <Badge variant="outline" className="text-[9px]">
                    {tier.badge}
                  </Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-4 w-4 text-emerald-500" />
            <span>Proactive Intelligence & Memory</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Manage automated signal detection and project memory synthesis.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <Label className="text-xs font-semibold">Proactive Signal Engine</Label>
              <p className="text-[11px] text-muted-foreground">
                Automatically detect bottlenecks, stale tasks, and project risks.
              </p>
            </div>
            <input
              type="checkbox"
              checked={proactiveEnabled}
              onChange={(e) => setProactiveEnabled(e.target.checked)}
              disabled={updateMutation.isPending}
              className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <Label className="text-xs font-semibold">Project Memory Retention Policy</Label>
              <p className="text-[11px] text-muted-foreground">
                Days to retain non-decayed project memory entries in vector memory.
              </p>
            </div>
            <select
              value={memoryRetentionDays}
              onChange={(e) => setMemoryRetentionDays(Number(e.target.value))}
              disabled={updateMutation.isPending}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs"
            >
              <option value={30}>30 Days</option>
              <option value={60}>60 Days</option>
              <option value={90}>90 Days (Default)</option>
              <option value={365}>1 Year</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={handleSave}
          disabled={updateMutation.isPending || !hasChanges || !currentWorkspace?.id}
          className="gap-1.5 cursor-pointer"
        >
          {updateMutation.isPending ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Saving AI Settings...</span>
            </>
          ) : (
            <>
              <Save className="h-3.5 w-3.5" />
              <span>Save AI Settings</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

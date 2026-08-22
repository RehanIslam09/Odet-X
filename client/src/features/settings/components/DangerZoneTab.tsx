import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button.js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.js";
import { Input } from "@/components/ui/input.js";
import { Label } from "@/components/ui/label.js";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog.js";
import { AlertTriangle, ShieldAlert, Trash2, Loader2, Info } from "lucide-react";
import { toast } from "sonner";
import { useActiveWorkspace } from "@/features/workspaces/context/WorkspaceContext.js";
import { useDeleteWorkspace } from "@/features/workspaces/hooks/useWorkspaces.js";
import { usePermissions } from "@/features/workspaces/hooks/usePermissions.ts";

export function DangerZoneTab() {
  const { currentWorkspace, workspaces, switchWorkspace } = useActiveWorkspace();
  const deleteMutation = useDeleteWorkspace();
  const navigate = useNavigate();
  const { isOwner } = usePermissions();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [confirmationInput, setConfirmationInput] = useState("");

  const isPersonal = currentWorkspace?.type === "PERSONAL" || currentWorkspace?.isPersonal === true;

  // Check if this is the Default Personal Workspace (either isDefault === true, or slug === 'personal', or the only personal workspace)
  const isDefaultPersonalWorkspace = useMemo(() => {
    if (!isPersonal) return false;
    // Check if it's the sole personal workspace or explicitly default
    const personalWorkspaces = workspaces.filter((w) => w.isPersonal);
    if (personalWorkspaces.length <= 1) return true;
    return currentWorkspace?.slug === "personal";
  }, [isPersonal, workspaces, currentWorkspace]);

  const targetSlug = currentWorkspace?.slug || "";
  const isConfirmed = confirmationInput.trim() === targetSlug;

  const handleDelete = () => {
    if (!currentWorkspace?.id || !isConfirmed) return;

    deleteMutation.mutate(currentWorkspace.id, {
      onSuccess: async () => {
        toast.success(`Workspace "${currentWorkspace.name}" has been permanently deleted.`);
        setDeleteDialogOpen(false);

        // Find remaining workspace to switch to
        const fallback = workspaces.find((w) => w.id !== currentWorkspace.id);
        if (fallback) {
          await switchWorkspace(fallback.slug);
        } else {
          navigate("/");
        }
      },
      onError: (err: unknown) => {
        const apiErr = err as { response?: { data?: { message?: string } }; message?: string };
        toast.error(apiErr.response?.data?.message || apiErr.message || "Failed to delete workspace.");
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-destructive flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <span>Danger Zone</span>
        </h3>
        <p className="text-xs text-muted-foreground">
          Destructive operations for workspace termination and data purging.
        </p>
      </div>

      {/* Case A: Default Personal Workspace — Deletion Prohibited */}
      {isDefaultPersonalWorkspace ? (
        <Card className="border-amber-500/30 bg-amber-500/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-amber-600 dark:text-amber-400 flex items-center gap-2">
              <Info className="h-5 w-5" />
              <span>Default Personal Workspace Protected</span>
            </CardTitle>
            <CardDescription className="text-xs text-amber-700 dark:text-amber-300/90 leading-relaxed">
              Default Personal Workspaces serve as your primary fallback space on the platform and cannot be deleted.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-muted-foreground">
            <p>
              To maintain continuous workspace tenancy, your primary personal workspace remains active at all times.
              If you wish to create isolated environments, create a new <strong>Personal Workspace</strong> or <strong>Team Workspace</strong> from the workspace switcher.
            </p>
          </CardContent>
        </Card>
      ) : (
        /* Case B: Custom Personal or Team Workspace — Deletion Allowed for Owner */
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-base text-destructive flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" />
              <span>Delete Workspace</span>
            </CardTitle>
            <CardDescription className="text-xs leading-relaxed">
              {isPersonal
                ? "Permanently remove this custom personal workspace and all associated project data."
                : "Permanently delete this team workspace, evict all members, and purge all projects, tasks, and socket rooms."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-destructive/20 bg-background/60 p-4 space-y-2 text-xs">
              <p className="font-semibold text-foreground">Consequences of deletion:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>All workspace projects, tasks, activities, and memories will be permanently purged.</li>
                {!isPersonal && (
                  <>
                    <li>All workspace team members will be immediately evicted via realtime sockets.</li>
                    <li>Pending email invitations will be permanently revoked.</li>
                  </>
                )}
                <li>This action is irreversible.</li>
              </ul>
            </div>

            {isOwner ? (
              <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="gap-1.5 cursor-pointer">
                    <Trash2 className="h-4 w-4" />
                    <span>Delete Workspace</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md border-destructive/40">
                  <DialogHeader>
                    <DialogTitle className="text-destructive flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" />
                      <span>Confirm Workspace Deletion</span>
                    </DialogTitle>
                    <DialogDescription className="text-xs space-y-2 pt-2">
                      <span>
                        Are you absolutely sure you want to delete{" "}
                        <strong className="text-foreground">{currentWorkspace?.name}</strong>?
                      </span>
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-3 py-2">
                    <Label htmlFor="delete-slug-confirm" className="text-xs">
                      Type <code className="bg-muted px-1 py-0.5 rounded font-mono font-bold text-foreground">{targetSlug}</code> to confirm:
                    </Label>
                    <Input
                      id="delete-slug-confirm"
                      value={confirmationInput}
                      onChange={(e) => setConfirmationInput(e.target.value)}
                      placeholder={targetSlug}
                      className="text-xs font-mono"
                    />
                  </div>

                  <DialogFooter className="pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setDeleteDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleDelete}
                      disabled={!isConfirmed || deleteMutation.isPending}
                    >
                      {deleteMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        "Permanently Delete Workspace"
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                Only the primary workspace owner can delete this workspace.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Helper hook import
import { useMemo } from "react";

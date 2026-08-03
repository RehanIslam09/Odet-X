import { useState } from "react";
import { AlertTriangle, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

import { useActiveWorkspace } from "@/features/workspaces/context/WorkspaceContext";
import { useDeleteWorkspace } from "@/features/workspaces/hooks/useWorkspaces";
import { SettingsSection } from "./SettingsSection";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function DangerZone() {
  const { currentWorkspace, currentRole } = useActiveWorkspace();
  const deleteWorkspaceMutation = useDeleteWorkspace();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const isOwner = currentRole === "OWNER";
  const isPersonal = currentWorkspace?.isPersonal ?? false;

  const handleDeleteWorkspace = async () => {
    if (!currentWorkspace) return;

    try {
      await deleteWorkspaceMutation.mutateAsync(currentWorkspace.id);
      toast.success(`Workspace "${currentWorkspace.name}" deleted successfully.`);
      setIsOpen(false);
      navigate("/");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete workspace.";
      toast.error(msg);
    }
  };

  return (
    <SettingsSection
      id="danger-zone"
      title="Danger Zone"
      description="Perform high-risk operations for the active workspace."
      destructive
    >
      <div className="space-y-6 max-w-xl">
        {/* Workspace Deletion Card */}
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3">
          <div className="flex items-center gap-2 text-destructive font-medium text-sm">
            <Trash2 className="h-4 w-4" />
            <span>Delete Workspace &ldquo;{currentWorkspace?.name}&rdquo;</span>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            Deleting a custom workspace removes all membership records. A workspace can only be deleted if it contains zero active projects. Personal workspaces cannot be deleted.
          </p>

          {isPersonal ? (
            <p className="text-xs font-medium text-muted-foreground italic">
              Personal workspaces cannot be deleted.
            </p>
          ) : !isOwner ? (
            <p className="text-xs font-medium text-muted-foreground italic">
              Only the workspace OWNER can delete a custom workspace.
            </p>
          ) : (
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive" size="sm" className="gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Delete Workspace
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirm Workspace Deletion</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete <span className="font-semibold text-foreground">{currentWorkspace?.name}</span>? This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>

                <DialogFooter className="gap-2 sm:gap-0">
                  <Button variant="outline" onClick={() => setIsOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteWorkspace}
                    disabled={deleteWorkspaceMutation.isPending}
                  >
                    {deleteWorkspaceMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      "Confirm Delete"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
    </SettingsSection>
  );
}

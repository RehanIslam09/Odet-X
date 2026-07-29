import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateWorkspace } from "../hooks/useWorkspaces";
import { useActiveWorkspace } from "../context/WorkspaceContext";

interface CreateWorkspaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateWorkspaceModal({ open, onOpenChange }: CreateWorkspaceModalProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const createMutation = useCreateWorkspace();
  const { switchWorkspace } = useActiveWorkspace();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("Workspace name is required.");
      return;
    }

    setErrorMsg("");
    try {
      const created = await createMutation.mutateAsync({
        name: name.trim(),
        slug: slug.trim() || undefined,
      });

      setName("");
      setSlug("");
      onOpenChange(false);
      switchWorkspace(created.slug, "dashboard");
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } }; message?: string };
      const msg = apiErr.response?.data?.message || apiErr.message || "Failed to create workspace.";
      setErrorMsg(msg);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Workspace</DialogTitle>
            <DialogDescription>
              Create a custom collaborative workspace for your team and projects.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {errorMsg && (
              <div className="rounded bg-destructive/15 p-3 text-xs font-medium text-destructive">
                {errorMsg}
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="ws-name">Workspace Name</Label>
              <Input
                id="ws-name"
                placeholder="e.g. Acme Engineering"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={createMutation.isPending}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="ws-slug">URL Slug (Optional)</Label>
              <Input
                id="ws-slug"
                placeholder="e.g. acme-engineering"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                disabled={createMutation.isPending}
              />
              <p className="text-[11px] text-muted-foreground">
                Leave blank to generate automatically from the name.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Workspace"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

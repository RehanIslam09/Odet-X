import React, { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button.js";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog.js";
import { Input } from "@/components/ui/input.js";
import { Label } from "@/components/ui/label.js";
import {
  User,
  Check,
  Building2,
  Sparkles,
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Shield,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { useCreateWorkspace } from "../hooks/useWorkspaces.js";
import { useActiveWorkspace } from "../context/WorkspaceContext.js";
import type { InitialInviteInput, WorkspaceRole } from "../types/workspace.types.js";

interface CreateWorkspaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export type WorkspaceType = "PERSONAL" | "TEAM";

export interface ColorOption {
  id: string;
  name: string;
  hex: string;
  bgClass: string;
  textClass: string;
  ringClass: string;
  borderClass: string;
}

export const ACCENT_COLORS: ColorOption[] = [
  { id: "indigo", name: "Indigo", hex: "#6366f1", bgClass: "bg-indigo-600", textClass: "text-indigo-600 dark:text-indigo-400", ringClass: "ring-indigo-500", borderClass: "border-indigo-500/30" },
  { id: "emerald", name: "Emerald", hex: "#10b981", bgClass: "bg-emerald-600", textClass: "text-emerald-600 dark:text-emerald-400", ringClass: "ring-emerald-500", borderClass: "border-emerald-500/30" },
  { id: "violet", name: "Violet", hex: "#8b5cf6", bgClass: "bg-violet-600", textClass: "text-violet-600 dark:text-violet-400", ringClass: "ring-violet-500", borderClass: "border-violet-500/30" },
  { id: "amber", name: "Amber", hex: "#f59e0b", bgClass: "bg-amber-600", textClass: "text-amber-600 dark:text-amber-400", ringClass: "ring-amber-500", borderClass: "border-amber-500/30" },
  { id: "rose", name: "Rose", hex: "#f43f5e", bgClass: "bg-rose-600", textClass: "text-rose-600 dark:text-rose-400", ringClass: "ring-rose-500", borderClass: "border-rose-500/30" },
  { id: "cyan", name: "Cyan", hex: "#06b6d4", bgClass: "bg-cyan-600", textClass: "text-cyan-600 dark:text-cyan-400", ringClass: "ring-cyan-500", borderClass: "border-cyan-500/30" },
];

/**
 * Normalizes display name into a URL-safe slug.
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function CreateWorkspaceModal({ open, onOpenChange }: CreateWorkspaceModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [workspaceType, setWorkspaceType] = useState<WorkspaceType>("PERSONAL");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [isSlugEdited, setIsSlugEdited] = useState(false);
  const [selectedColor, setSelectedColor] = useState<ColorOption>(ACCENT_COLORS[0]);
  const [invites, setInvites] = useState<InitialInviteInput[]>([]);
  const [errorMsg, setErrorMsg] = useState("");

  const createMutation = useCreateWorkspace();
  const { switchWorkspace } = useActiveWorkspace();

  // Reset internal state when modal closes
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        setStep(1);
        setWorkspaceType("PERSONAL");
        setName("");
        setSlug("");
        setIsSlugEdited(false);
        setSelectedColor(ACCENT_COLORS[0]);
        setInvites([]);
        setErrorMsg("");
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange]
  );

  // Handle Workspace Name Change & Auto-Slugification
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    if (!isSlugEdited) {
      setSlug(generateSlug(val));
    }
  };

  // Handle Manual Slug Change
  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsSlugEdited(true);
    setSlug(generateSlug(e.target.value));
  };

  // Team Invite Controls
  const handleAddInvite = () => {
    setInvites((prev) => [...prev, { email: "", role: "MEMBER" }]);
  };

  const handleUpdateInviteEmail = (index: number, email: string) => {
    setInvites((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], email };
      return copy;
    });
  };

  const handleUpdateInviteRole = (index: number, role: WorkspaceRole) => {
    setInvites((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], role };
      return copy;
    });
  };

  const handleRemoveInvite = (index: number) => {
    setInvites((prev) => prev.filter((_, i) => i !== index));
  };

  // Slug Regex Validation
  const isSlugValid = useMemo(() => {
    if (!slug) return true;
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
  }, [slug]);

  // Form Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setErrorMsg("Workspace name is required.");
      return;
    }

    if (!isSlugValid) {
      setErrorMsg("Slug format is invalid. Use lowercase letters, numbers, and single hyphens.");
      return;
    }

    // Filter valid non-empty initial invites for Team workspaces
    const validInvites =
      workspaceType === "TEAM"
        ? invites.filter((inv) => inv.email.trim() && inv.email.includes("@"))
        : undefined;

    setErrorMsg("");

    try {
      const created = await createMutation.mutateAsync({
        name: name.trim(),
        slug: slug.trim() || undefined,
        type: workspaceType,
        color: selectedColor.id,
        initialInvites: validInvites && validInvites.length > 0 ? validInvites : undefined,
      });

      toast.success(`Workspace "${created.name}" created successfully!`);
      handleOpenChange(false);
      await switchWorkspace(created.slug || created.id);
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } }; message?: string };
      const msg = apiErr.response?.data?.message || apiErr.message || "Failed to create workspace.";
      setErrorMsg(msg);
    }
  };

  // Derive initials for Live Preview
  const previewInitials = useMemo(() => {
    if (!name.trim()) return "WS";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.trim().slice(0, 2).toUpperCase();
  }, [name]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[760px] p-0 overflow-hidden border-sidebar-border bg-background shadow-2xl">
        {/* Wizard Header Bar */}
        <div className="border-b border-border bg-muted/30 px-6 py-4 flex items-center justify-between">
          <div>
            <DialogTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>Create New Workspace</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              Set up a collaborative space for your projects, research, or team.
            </DialogDescription>
          </div>

          {/* Step Progress Indicators */}
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                step === 1 ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
              }`}
            >
              1
            </span>
            <span className={step === 1 ? "text-foreground font-semibold" : ""}>Type</span>
            <span className="text-muted-foreground/40">/</span>
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                step === 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              2
            </span>
            <span className={step === 2 ? "text-foreground font-semibold" : ""}>Configure</span>
          </div>
        </div>

        {/* Wizard Main Content Body */}
        <div className="p-6">
          {errorMsg && (
            <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs font-medium text-destructive flex items-center gap-2">
              <span>⚠️</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STEP 1: Workspace Type Selection */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in-50 duration-200">
              <div className="text-center max-w-md mx-auto space-y-1">
                <h3 className="text-sm font-semibold text-foreground">Select Workspace Purpose</h3>
                <p className="text-xs text-muted-foreground">
                  Choose how you plan to use this workspace. You can invite team members later.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Personal Workspace Card */}
                <div
                  role="radio"
                  aria-checked={workspaceType === "PERSONAL"}
                  tabIndex={0}
                  onClick={() => setWorkspaceType("PERSONAL")}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setWorkspaceType("PERSONAL")}
                  className={`group relative flex flex-col justify-between rounded-xl border p-5 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary ${
                    workspaceType === "PERSONAL"
                      ? "border-primary bg-primary/5 shadow-md ring-1 ring-primary/30"
                      : "border-border bg-card hover:bg-muted/40 hover:border-border/80"
                  }`}
                >
                  {workspaceType === "PERSONAL" && (
                    <div className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="h-3 w-3" />
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                      <User className="h-5 w-5" />
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                        <span>Personal Workspace</span>
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        For individual work, research, freelancing, and private personal projects.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-border/50 space-y-1.5 text-[11px] text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span>Single owner member</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span>Private & isolated</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span>No team member overhead</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span>Fast & lightweight</span>
                    </div>
                  </div>
                </div>

                {/* Team Workspace Card */}
                <div
                  role="radio"
                  aria-checked={workspaceType === "TEAM"}
                  tabIndex={0}
                  onClick={() => setWorkspaceType("TEAM")}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setWorkspaceType("TEAM")}
                  className={`group relative flex flex-col justify-between rounded-xl border p-5 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary ${
                    workspaceType === "TEAM"
                      ? "border-primary bg-primary/5 shadow-md ring-1 ring-primary/30"
                      : "border-border bg-card hover:bg-muted/40 hover:border-border/80"
                  }`}
                >
                  {workspaceType === "TEAM" && (
                    <div className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="h-3 w-3" />
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      <Building2 className="h-5 w-5" />
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                        <span>Team Workspace</span>
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        For startups, agencies, companies, and collaborative open-source teams.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-border/50 space-y-1.5 text-[11px] text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span>Multiple members & roles</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span>Email invitations platform</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span>Realtime presence & socket rooms</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span>Granular RBAC security</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 1 Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenChange(false)}
                >
                  Cancel
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => setStep(2)}
                  className="gap-1.5"
                >
                  <span>Continue to Details</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: Workspace Details & Live Interactive Preview */}
          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in-50 duration-200">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Side (7 cols) — Form Inputs */}
                <div className="lg:col-span-7 space-y-4">
                  {/* Workspace Name Input */}
                  <div className="space-y-1.5">
                    <Label htmlFor="create-ws-name" className="text-xs font-semibold">
                      Workspace Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="create-ws-name"
                      placeholder={workspaceType === "PERSONAL" ? "e.g. Research & Ideas" : "e.g. Acme Engineering"}
                      value={name}
                      onChange={handleNameChange}
                      disabled={createMutation.isPending}
                      autoFocus
                      required
                      className="text-xs"
                    />
                  </div>

                  {/* URL Slug Input */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="create-ws-slug" className="text-xs font-semibold">
                        URL Slug
                      </Label>
                      {isSlugEdited && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsSlugEdited(false);
                            setSlug(generateSlug(name));
                          }}
                          className="text-[10px] text-primary hover:underline"
                        >
                          Reset Auto-slug
                        </button>
                      )}
                    </div>

                    <div className="relative flex items-center">
                      <span className="absolute left-2.5 text-xs text-muted-foreground font-mono select-none">
                        /w/
                      </span>
                      <Input
                        id="create-ws-slug"
                        placeholder="acme-engineering"
                        value={slug}
                        onChange={handleSlugChange}
                        disabled={createMutation.isPending}
                        className={`pl-9 text-xs font-mono ${!isSlugValid ? "border-destructive focus-visible:ring-destructive" : ""}`}
                      />
                    </div>
                    {!isSlugValid ? (
                      <p className="text-[11px] text-destructive">
                        Only lowercase letters, numbers, and single hyphens are allowed.
                      </p>
                    ) : (
                      <p className="text-[11px] text-muted-foreground">
                        Your workspace URL: <span className="font-mono text-foreground">/w/{slug || "your-slug"}</span>
                      </p>
                    )}
                  </div>

                  {/* Accent Color Swatches */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Accent Color</Label>
                    <div className="flex items-center gap-2 pt-1">
                      {ACCENT_COLORS.map((c) => {
                        const isSelected = selectedColor.id === c.id;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            title={c.name}
                            onClick={() => setSelectedColor(c)}
                            className={`group relative flex h-7 w-7 items-center justify-center rounded-full ${c.bgClass} transition-transform hover:scale-110 focus:outline-none ${
                              isSelected ? "ring-2 ring-offset-2 ring-offset-background " + c.ringClass : "opacity-80 hover:opacity-100"
                            }`}
                          >
                            {isSelected && <Check className="h-3.5 w-3.5 text-white" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Team Members Invitation Controls (Only for TEAM workspaces) */}
                  {workspaceType === "TEAM" && (
                    <div className="space-y-3 pt-2 border-t border-border">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-xs font-semibold">Invite Team Members</Label>
                          <p className="text-[11px] text-muted-foreground">
                            Optional. Email invitations will be dispatched upon creation.
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleAddInvite}
                          className="h-7 text-[11px] gap-1 px-2"
                        >
                          <Plus className="h-3 w-3" />
                          <span>Add Invite</span>
                        </Button>
                      </div>

                      {invites.length > 0 && (
                        <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                          {invites.map((inv, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <Input
                                type="email"
                                placeholder="colleague@company.com"
                                value={inv.email}
                                onChange={(e) => handleUpdateInviteEmail(idx, e.target.value)}
                                className="text-xs flex-1"
                              />

                              <select
                                value={inv.role}
                                onChange={(e) => handleUpdateInviteRole(idx, e.target.value as WorkspaceRole)}
                                className="h-8 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                              >
                                <option value="MEMBER">Member</option>
                                <option value="ADMIN">Admin</option>
                                <option value="VIEWER">Viewer</option>
                              </select>

                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveInvite(idx)}
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Right Side (5 cols) — Live Interactive Workspace Preview */}
                <div className="lg:col-span-5 flex flex-col justify-between rounded-xl border border-border bg-muted/20 p-4 space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                      <span>Live Preview</span>
                      <span className="rounded bg-background border px-1.5 py-0.5 font-mono text-[9px]">
                        {workspaceType}
                      </span>
                    </div>

                    {/* Preview Workspace Card Mock */}
                    <div className="rounded-lg border border-border bg-card p-4 shadow-sm space-y-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white font-bold text-sm shadow-md ${selectedColor.bgClass}`}
                        >
                          {workspaceType === "PERSONAL" ? (
                            <User className="h-5 w-5" />
                          ) : (
                            previewInitials
                          )}
                        </div>

                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-sm text-foreground truncate">
                            {name.trim() || "Untitled Workspace"}
                          </span>
                          <span className="text-xs text-muted-foreground font-mono truncate">
                            /w/{slug || "slug"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs">
                        <span className="text-muted-foreground text-[11px]">Members</span>
                        <span className="font-medium text-foreground text-xs">
                          {workspaceType === "PERSONAL"
                            ? "1 (You)"
                            : `${1 + invites.filter((i) => i.email.trim()).length} Members`}
                        </span>
                      </div>
                    </div>

                    {/* Context Explanation Note */}
                    <div className="rounded-lg border border-border/60 bg-background/50 p-3 text-[11px] text-muted-foreground space-y-1.5">
                      <div className="flex items-center gap-1.5 font-medium text-foreground text-xs">
                        <Shield className="h-3.5 w-3.5 text-emerald-500" />
                        <span>Tenant Isolation</span>
                      </div>
                      <p className="leading-relaxed">
                        Creating this workspace provisions an isolated tenant boundary. Projects, tasks, and search results will be restricted to authorized members.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground pt-2">
                    <Zap className="h-3 w-3 text-amber-500" />
                    <span>Instant workspace context switching enabled upon creation.</span>
                  </div>
                </div>
              </div>

              {/* Step 2 Actions Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setStep(1)}
                  disabled={createMutation.isPending}
                  className="gap-1"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Back</span>
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenChange(false)}
                    disabled={createMutation.isPending}
                  >
                    Cancel
                  </Button>

                  <Button
                    type="submit"
                    size="sm"
                    disabled={createMutation.isPending || !name.trim() || !isSlugValid}
                  >
                    {createMutation.isPending ? "Creating Workspace..." : "Create Workspace"}
                  </Button>
                </div>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

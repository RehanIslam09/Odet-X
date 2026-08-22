import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button.js";
import { Input } from "@/components/ui/input.js";
import { Label } from "@/components/ui/label.js";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.js";
import { Badge } from "@/components/ui/badge.js";
import { Check, User, Building2, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useActiveWorkspace } from "@/features/workspaces/context/WorkspaceContext.js";
import { useUpdateWorkspace } from "@/features/workspaces/hooks/useWorkspaces.js";
import { ACCENT_COLORS, generateSlug, type ColorOption } from "@/features/workspaces/components/CreateWorkspaceModal.js";

export function GeneralSettingsTab() {
  const { currentWorkspace } = useActiveWorkspace();
  const updateMutation = useUpdateWorkspace();

  const initialColor = useMemo(() => {
    const wsColor = currentWorkspace?.accentColor || currentWorkspace?.color;
    if (!wsColor) return ACCENT_COLORS[0];
    return ACCENT_COLORS.find((c) => c.id === wsColor || c.hex === wsColor) || ACCENT_COLORS[0];
  }, [currentWorkspace?.accentColor, currentWorkspace?.color]);

  const [name, setName] = useState(currentWorkspace?.name || "");
  const [slug, setSlug] = useState(currentWorkspace?.slug || "");
  const [isSlugEdited, setIsSlugEdited] = useState(false);
  const [isColorSelectedByUser, setIsColorSelectedByUser] = useState(false);
  const [selectedColor, setSelectedColor] = useState<ColorOption>(initialColor);
  const [prevWorkspaceId, setPrevWorkspaceId] = useState(currentWorkspace?.id);

  // Sync state when active workspace changes during render
  if (currentWorkspace && currentWorkspace.id !== prevWorkspaceId) {
    setPrevWorkspaceId(currentWorkspace.id);
    setName(currentWorkspace.name);
    setSlug(currentWorkspace.slug);
    setSelectedColor(initialColor);
    setIsSlugEdited(false);
    setIsColorSelectedByUser(false);
  }

  const isPersonal = currentWorkspace?.type === "PERSONAL" || currentWorkspace?.isPersonal === true;

  // Handle Name change
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    if (!isSlugEdited) {
      setSlug(generateSlug(val));
    }
  };

  // Handle Slug change
  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsSlugEdited(true);
    setSlug(generateSlug(e.target.value));
  };

  // Slug Regex Validation
  const isSlugValid = useMemo(() => {
    if (!slug) return false;
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
  }, [slug]);

  const currentColorValue = currentWorkspace?.accentColor || currentWorkspace?.color;
  const isColorChanged = useMemo(() => {
    if (isColorSelectedByUser) return true;
    if (!currentColorValue) return false;
    return selectedColor.id !== currentColorValue && selectedColor.hex !== currentColorValue;
  }, [isColorSelectedByUser, currentColorValue, selectedColor]);

  const hasChanges = useMemo(() => {
    if (!currentWorkspace) return false;
    return name.trim() !== currentWorkspace.name || slug.trim() !== currentWorkspace.slug || isColorChanged;
  }, [currentWorkspace, name, slug, isColorChanged]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace?.id || !name.trim() || !isSlugValid) return;

    const payload: { name: string; slug: string; accentColor?: string; color?: string } = {
      name: name.trim(),
      slug: slug.trim(),
    };

    if (isColorChanged) {
      payload.accentColor = selectedColor.id;
      payload.color = selectedColor.id;
    }

    updateMutation.mutate(
      {
        workspaceId: currentWorkspace.id,
        input: payload,
      },
      {
        onSuccess: () => {
          toast.success("Workspace settings updated successfully!");
        },
        onError: (err: unknown) => {
          const apiErr = err as { response?: { data?: { message?: string } }; message?: string };
          toast.error(apiErr.response?.data?.message || apiErr.message || "Failed to update workspace.");
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground">General Settings</h3>
        <p className="text-xs text-muted-foreground">
          Manage workspace identity, URL slug, and visual theme options.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form Column (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>Workspace Identity</span>
                  <Badge variant={isPersonal ? "secondary" : "default"} className="text-[10px]">
                    {isPersonal ? "Personal Workspace" : "Team Workspace"}
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs">
                  Update display name and public URL identifier.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="general-ws-name" className="text-xs font-semibold">
                    Workspace Name
                  </Label>
                  <Input
                    id="general-ws-name"
                    value={name}
                    onChange={handleNameChange}
                    disabled={updateMutation.isPending}
                    required
                    className="text-xs"
                  />
                </div>

                {/* Slug */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="general-ws-slug" className="text-xs font-semibold">
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
                      id="general-ws-slug"
                      value={slug}
                      onChange={handleSlugChange}
                      disabled={updateMutation.isPending}
                      className={`pl-9 text-xs font-mono ${!isSlugValid ? "border-destructive focus-visible:ring-destructive" : ""}`}
                    />
                  </div>
                  {!isSlugValid ? (
                    <p className="text-[11px] text-destructive">
                      Slug format invalid. Use lowercase letters, numbers, and single hyphens.
                    </p>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">
                      Public path: <span className="font-mono text-foreground">/w/{slug}</span>
                    </p>
                  )}
                </div>

                {/* Accent Color Swatches */}
                <div className="space-y-1.5 pt-2">
                  <Label className="text-xs font-semibold">Accent Color Theme</Label>
                  <div className="flex items-center gap-2 pt-1">
                    {ACCENT_COLORS.map((c) => {
                      const isSelected = selectedColor.id === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          title={c.name}
                          onClick={() => {
                            setSelectedColor(c);
                            setIsColorSelectedByUser(true);
                          }}
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
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button
                type="submit"
                size="sm"
                disabled={updateMutation.isPending || !hasChanges || !isSlugValid}
                className="gap-1.5 cursor-pointer"
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" />
                    <span>Save Changes</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>

        {/* Right Preview Column (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="bg-muted/20 border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <span>Identity Card Preview</span>
                <span className="font-mono text-[9px] lowercase">/{slug}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-border bg-card p-4 shadow-sm space-y-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white font-bold text-sm shadow-md ${selectedColor.bgClass}`}
                  >
                    {isPersonal ? <User className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
                  </div>

                  <div className="flex flex-col min-w-0">
                    <span className="font-semibold text-sm text-foreground truncate">
                      {name || "Workspace"}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono truncate">
                      /w/{slug || "slug"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs text-muted-foreground">
                  <span>Workspace Type</span>
                  <span className="font-medium text-foreground capitalize">
                    {isPersonal ? "Personal Workspace" : "Team Workspace"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

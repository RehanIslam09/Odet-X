import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Check,
  ChevronDown,
  Plus,
  Settings,
  Search,
  Building2,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { useActiveWorkspace } from "../context/WorkspaceContext.js";
import type { Workspace } from "../types/workspace.types.js";
import { CreateWorkspaceModal } from "./CreateWorkspaceModal.js";

export interface WorkspaceSwitcherProps {
  className?: string;
  onOpenCreateWorkspaceModal?: () => void;
}

export function WorkspaceSwitcher({ className = "", onOpenCreateWorkspaceModal }: WorkspaceSwitcherProps) {
  const { currentWorkspace, workspaces, switchWorkspace, isLoading } = useActiveWorkspace();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Toggle popover state
  const togglePopover = useCallback(() => {
    setIsOpen((prev) => !prev);
    setSearchQuery("");
    setSelectedIndex(0);
  }, []);

  // Global hotkey handler for Ctrl+Shift+W / Cmd+Shift+W
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "w") {
        e.preventDefault();
        togglePopover();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePopover]);

  // Focus search input when popover opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Close when clicking outside container
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Filter workspaces by query
  const filteredWorkspaces = useMemo(() => {
    if (!searchQuery.trim()) return workspaces;
    const q = searchQuery.toLowerCase().trim();
    return workspaces.filter((w) => {
      const nameMatch = w.name.toLowerCase().includes(q);
      const slugMatch = w.slug.toLowerCase().includes(q);
      const roleMatch = w.role ? w.role.toLowerCase().includes(q) : false;
      return nameMatch || slugMatch || roleMatch;
    });
  }, [workspaces, searchQuery]);

  // Separate into Personal and Team lists
  const personalWorkspaces = useMemo(() => {
    return filteredWorkspaces.filter((w) => w.isPersonal || w.type === "PERSONAL");
  }, [filteredWorkspaces]);

  const teamWorkspaces = useMemo(() => {
    return filteredWorkspaces.filter((w) => !w.isPersonal && w.type !== "PERSONAL");
  }, [filteredWorkspaces]);

  // Flattened list for keyboard navigation index calculation
  const flatNavigationList = useMemo(() => {
    return [...personalWorkspaces, ...teamWorkspaces];
  }, [personalWorkspaces, teamWorkspaces]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setSelectedIndex(0);
  };

  // Handle Workspace Selection
  const handleSelectWorkspace = useCallback(
    async (workspace: Workspace) => {
      setIsOpen(false);
      const success = await switchWorkspace(workspace.id);
      if (success) {
        toast.success(`Switched to ${workspace.name}`);
      }
    },
    [switchWorkspace]
  );

  // Keyboard navigation handler inside popover (with focus restoration)
  const handlePopoverKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      triggerRef.current?.focus();
      return;
    }

    if (flatNavigationList.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % flatNavigationList.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + flatNavigationList.length) % flatNavigationList.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = flatNavigationList[selectedIndex];
      if (target) {
        handleSelectWorkspace(target);
      }
    } else if (e.key === "Home") {
      e.preventDefault();
      setSelectedIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setSelectedIndex(flatNavigationList.length - 1);
    }
  };

  const handleCreateWorkspaceClick = () => {
    setIsOpen(false);
    if (onOpenCreateWorkspaceModal) {
      onOpenCreateWorkspaceModal();
    } else {
      setIsCreateModalOpen(true);
    }
  };

  const handleSettingsClick = () => {
    setIsOpen(false);
    if (currentWorkspace) {
      navigate(`/w/${currentWorkspace.slug}/settings`);
    }
  };

  const activeName = currentWorkspace?.name || "Select Workspace";
  const isPersonalActive = currentWorkspace?.isPersonal ?? true;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Switcher Trigger Card Button */}
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        onClick={togglePopover}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label="Select active workspace"
        className="group flex w-full items-center justify-between gap-2.5 rounded-lg border border-sidebar-border bg-sidebar-accent/30 px-3 py-2 text-left text-xs transition-all hover:bg-sidebar-accent hover:border-sidebar-border/80 focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary font-bold text-xs border border-primary/20 shadow-2xs">
            {isPersonalActive ? (
              <User className="h-3.5 w-3.5 text-primary" />
            ) : (
              <Building2 className="h-3.5 w-3.5 text-primary" />
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-semibold text-foreground truncate">{activeName}</span>
              {isPersonalActive ? (
                <span className="rounded bg-muted px-1 py-0.2 text-[9px] font-medium text-muted-foreground shrink-0">
                  Personal
                </span>
              ) : (
                <span className="rounded bg-primary/10 px-1 py-0.2 text-[9px] font-medium text-primary shrink-0">
                  Team
                </span>
              )}
            </div>
            <span className="text-[10px] text-muted-foreground truncate">
              {isLoading ? "Loading..." : `${workspaces.length} accessible workspace${workspaces.length === 1 ? "" : "s"}`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 text-muted-foreground group-hover:text-foreground">
          <kbd className="hidden sm:inline-block rounded border bg-background px-1 py-0.5 text-[9px] font-mono text-muted-foreground">
            ⌘⇧W
          </kbd>
          <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
        </div>
      </button>

      {/* Popover Dropdown Window — Responsive mobile positioning */}
      {isOpen && (
        <div
          onKeyDown={handlePopoverKeyDown}
          role="dialog"
          aria-label="Workspace Switcher"
          className="absolute left-0 top-full z-50 mt-1.5 w-[calc(100vw-2rem)] max-w-sm sm:w-80 rounded-xl border border-border bg-popover text-popover-foreground shadow-xl ring-1 ring-black/5 animate-in fade-in-0 zoom-in-95 duration-100 overflow-hidden"
        >
          {/* Quick Search Header */}
          <div className="border-b border-border p-2 bg-muted/20">
            <div className="relative flex items-center">
              <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Filter workspaces..."
                className="w-full rounded-md border border-input bg-background pl-8 pr-8 py-1.5 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <kbd className="absolute right-2.5 rounded border bg-muted px-1 text-[9px] font-mono text-muted-foreground pointer-events-none">
                Esc
              </kbd>
            </div>
          </div>

          {/* Workspaces Scrollable List */}
          <div className="max-h-72 overflow-y-auto p-1.5 space-y-3 divide-y divide-border/50">
            {/* Personal Workspaces Category */}
            {personalWorkspaces.length > 0 && (
              <div className="space-y-1 pt-1 first:pt-0">
                <div className="px-2 py-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase flex items-center justify-between">
                  <span>Personal Workspaces</span>
                  <span className="text-[9px] font-normal lowercase">({personalWorkspaces.length})</span>
                </div>

                {personalWorkspaces.map((w) => {
                  const globalIdx = flatNavigationList.findIndex((item) => item.id === w.id);
                  const isSelected = selectedIndex === globalIdx;
                  const isActive = currentWorkspace?.id === w.id;

                  return (
                    <div
                      key={w.id}
                      ref={(el) => {
                        optionRefs.current[globalIdx] = el;
                      }}
                      role="option"
                      aria-selected={isActive}
                      onClick={() => handleSelectWorkspace(w)}
                      className={`group flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium transition-colors cursor-pointer ${
                        isActive
                          ? "bg-primary/10 text-primary font-semibold"
                          : isSelected
                          ? "bg-accent text-accent-foreground"
                          : "text-popover-foreground hover:bg-accent/60"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold ${
                            isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                          }`}
                        >
                          <User className="h-3 w-3" />
                        </div>

                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="truncate">{w.name}</span>
                            {w.isPersonal && (
                              <span className="rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1 py-0.2 text-[9px] font-medium shrink-0">
                                Default
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground truncate">/{w.slug}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isActive && <Check className="h-4 w-4 text-primary shrink-0" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Team Workspaces Category */}
            {teamWorkspaces.length > 0 && (
              <div className="space-y-1 pt-2">
                <div className="px-2 py-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase flex items-center justify-between">
                  <span>Team Workspaces</span>
                  <span className="text-[9px] font-normal lowercase">({teamWorkspaces.length})</span>
                </div>

                {teamWorkspaces.map((w) => {
                  const globalIdx = flatNavigationList.findIndex((item) => item.id === w.id);
                  const isSelected = selectedIndex === globalIdx;
                  const isActive = currentWorkspace?.id === w.id;

                  return (
                    <div
                      key={w.id}
                      ref={(el) => {
                        optionRefs.current[globalIdx] = el;
                      }}
                      role="option"
                      aria-selected={isActive}
                      onClick={() => handleSelectWorkspace(w)}
                      className={`group flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium transition-colors cursor-pointer ${
                        isActive
                          ? "bg-primary/10 text-primary font-semibold"
                          : isSelected
                          ? "bg-accent text-accent-foreground"
                          : "text-popover-foreground hover:bg-accent/60"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold ${
                            isActive ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
                          }`}
                        >
                          <Building2 className="h-3 w-3" />
                        </div>

                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="truncate">{w.name}</span>
                            {w.role && (
                              <span className="rounded border border-border px-1 py-0.2 text-[9px] font-medium text-muted-foreground capitalize shrink-0">
                                {w.role.toLowerCase()}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground truncate">
                            {w.memberCount ? `${w.memberCount} Members` : "Team"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isActive && <Check className="h-4 w-4 text-primary shrink-0" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Empty State */}
            {filteredWorkspaces.length === 0 && (
              <div className="p-6 text-center text-xs text-muted-foreground">
                No workspaces match "{searchQuery}"
              </div>
            )}
          </div>

          {/* Switcher Footer Actions */}
          <div className="border-t border-border p-1.5 bg-muted/10 space-y-0.5">
            <button
              type="button"
              onClick={handleCreateWorkspaceClick}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium text-popover-foreground hover:bg-accent transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5 text-primary" />
              <span>Create Workspace</span>
            </button>

            <button
              type="button"
              onClick={handleSettingsClick}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium text-popover-foreground hover:bg-accent transition-colors cursor-pointer"
            >
              <Settings className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Workspace Settings</span>
            </button>
          </div>
        </div>
      )}

      {/* Built-in Create Workspace Wizard Modal */}
      {isCreateModalOpen && (
        <CreateWorkspaceModal open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen} />
      )}
    </div>
  );
}

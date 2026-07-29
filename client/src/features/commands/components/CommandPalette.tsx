/**
 * Foundational Command Palette Component
 * Phase 31 — Global Search & Command Palette
 * WP-06 — Global Search UX & Result Navigation
 */

import { useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Folder,
  CheckSquare,
  Activity,
  Bell,
  Settings,
  FolderPlus,
  PlusSquare,
  Command as CommandIcon,
  FolderKanban,
  Flag,
  Brain,
  Loader2,
} from "lucide-react";
import {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
} from "@/components/ui/command";
import { useCommandPalette } from "../hooks/useCommandPalette.js";
import type { CommandDefinition, CommandGroup as GroupName } from "../types/command.types.js";
import { CreateProjectDialog } from "@/features/projects/components/CreateProjectDialog";
import { CreateTaskDialog } from "@/features/tasks/components/CreateTaskDialog";
import { useGlobalSearch } from "@/features/search/hooks/useGlobalSearch.js";
import { isSafeInternalUrl } from "@/features/search/utils/url.utils.js";
import type { SearchResultDto, SearchEntityType } from "@/features/search/types/search.types.js";

function renderCommandIcon(iconKey?: string) {
  const props = { "aria-hidden": true as const, className: "mr-2 h-4 w-4 shrink-0 text-muted-foreground" };
  const primaryProps = { "aria-hidden": true as const, className: "mr-2 h-4 w-4 shrink-0 text-primary" };
  switch (iconKey) {
    case "LayoutDashboard":
      return <LayoutDashboard {...props} />;
    case "Folder":
      return <Folder {...props} />;
    case "CheckSquare":
      return <CheckSquare {...props} />;
    case "Activity":
      return <Activity {...props} />;
    case "Bell":
      return <Bell {...props} />;
    case "Settings":
      return <Settings {...props} />;
    case "FolderPlus":
      return <FolderPlus {...primaryProps} />;
    case "PlusSquare":
      return <PlusSquare {...primaryProps} />;
    default:
      return <CommandIcon {...props} />;
  }
}

function renderEntityIcon(type: SearchEntityType) {
  switch (type) {
    case "project":
      return <FolderKanban aria-hidden className="mr-2 h-4 w-4 shrink-0 text-indigo-500" />;
    case "task":
      return <CheckSquare aria-hidden className="mr-2 h-4 w-4 shrink-0 text-emerald-500" />;
    case "milestone":
      return <Flag aria-hidden className="mr-2 h-4 w-4 shrink-0 text-amber-500" />;
    case "memory":
      return <Brain aria-hidden className="mr-2 h-4 w-4 shrink-0 text-cyan-500" />;
  }
}

const ENTITY_GROUP_TITLES: Record<SearchEntityType, string> = {
  project: "Projects",
  task: "Tasks",
  milestone: "Milestones",
  memory: "Project Memories",
};

const ENTITY_TYPE_ORDER: SearchEntityType[] = ["project", "task", "milestone", "memory"];

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface CommandPaletteProps {
  onSelectEntity?: (item: SearchResultDto) => void;
}

export function CommandPalette({ onSelectEntity }: CommandPaletteProps = {}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    open,
    setOpen,
    query,
    setQuery,
    commands,
    executeCommand,
    createProjectOpen,
    setCreateProjectOpen,
    createTaskOpen,
    setCreateTaskOpen,
    createTaskProjectId,
  } = useCommandPalette();

  // Authenticated debounced global search hook
  const {
    data: searchData,
    isLoading: searchLoading,
    isError: searchError,
    isEligible: searchEligible,
  } = useGlobalSearch(query, open);

  // Group commands by category while preserving canonical insertion order
  const groupedCommands = useMemo(() => {
    const map = new Map<GroupName, CommandDefinition[]>();
    for (const cmd of commands) {
      const groupList = map.get(cmd.group) || [];
      groupList.push(cmd);
      map.set(cmd.group, groupList);
    }
    return Array.from(map.entries());
  }, [commands]);

  // Group search entity results by type while preserving backend relative ranking
  const groupedEntities = useMemo(() => {
    if (!searchData?.items || searchData.items.length === 0) {
      return [];
    }

    const map = new Map<SearchEntityType, SearchResultDto[]>();
    for (const item of searchData.items) {
      const list = map.get(item.type) || [];
      list.push(item);
      map.set(item.type, list);
    }

    // Return groups in canonical entity order
    const result: [string, SearchResultDto[]][] = [];
    for (const type of ENTITY_TYPE_ORDER) {
      const items = map.get(type);
      if (items && items.length > 0) {
        result.push([ENTITY_GROUP_TITLES[type], items]);
      }
    }
    return result;
  }, [searchData]);

  // Handle entity selection navigation & stale result safety
  const handleSelectEntity = useCallback(
    (targetUrl: string, item?: SearchResultDto) => {
      if (!isSafeInternalUrl(targetUrl)) {
        return;
      }
      if (item?.status === "DELETED" || item?.status === "GONE") {
        toast.error("Entity no longer exists");
        queryClient.invalidateQueries({ queryKey: ["global-search"] });
        setOpen(false);
        setQuery("");
        return;
      }
      if (onSelectEntity && item) {
        onSelectEntity(item);
      }
      navigate(targetUrl);
      setOpen(false);
      setQuery("");
    },
    [navigate, queryClient, setOpen, setQuery, onSelectEntity]
  );

  return (
    <>
      <CommandDialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) {
            setQuery("");
          }
        }}
        title="Command Palette & Global Search"
        description="Search commands, projects, tasks, milestones, and memories..."
      >
        <Command
          shouldFilter={false}
          data-testid="command-palette-shell"
        >
          <CommandInput
            placeholder="Type a command or search workspace..."
            aria-label="Search commands and workspace"
            value={query}
            onValueChange={setQuery}
            data-testid="command-palette-input"
          />

          <CommandList data-testid="command-palette-list">
            <CommandEmpty data-testid="command-palette-empty">
              No results found.
            </CommandEmpty>

            {/* Render Local WP-04 Commands */}
            {groupedCommands.map(([groupName, groupItems]) => (
              <CommandGroup
                key={groupName}
                heading={groupName}
                data-testid={`command-group-${groupName.toLowerCase()}`}
              >
                {groupItems.map((cmd) => (
                  <CommandItem
                    key={cmd.id}
                    value={cmd.id}
                    onSelect={() => executeCommand(cmd.id)}
                    data-testid={`command-item-${cmd.id}`}
                  >
                    {renderCommandIcon(cmd.iconKey)}
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="font-medium text-sm text-foreground truncate">
                        {cmd.label}
                      </span>
                      {cmd.description && (
                        <span className="text-xs text-muted-foreground truncate">
                          {cmd.description}
                        </span>
                      )}
                    </div>
                    {cmd.shortcut && (
                      <CommandShortcut>{cmd.shortcut}</CommandShortcut>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}

            {/* Search Loading Indicator */}
            {searchEligible && searchLoading && (
              <div
                role="status"
                aria-live="polite"
                aria-atomic="true"
                className="px-3 py-2 text-xs text-muted-foreground flex items-center gap-2"
                data-testid="search-loading-indicator"
              >
                <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                <span>Searching workspace...</span>
              </div>
            )}

            {/* Search Non-Destructive Error Note */}
            {searchEligible && searchError && (
              <div
                role="status"
                aria-live="polite"
                aria-atomic="true"
                className="px-3 py-2 text-xs text-muted-foreground italic"
                data-testid="search-error-indicator"
              >
                Search results could not be loaded.
              </div>
            )}

            {/* Render Server Entity Search Results */}
            {groupedEntities.map(([groupTitle, entityItems]) => (
              <CommandGroup
                key={groupTitle}
                heading={groupTitle}
                data-testid={`entity-group-${groupTitle.toLowerCase().replace(/\s+/g, "-")}`}
              >
                {entityItems.map((item) => {
                  const secondaryText =
                    item.type === "task"
                      ? [item.projectName, item.status || item.subtitle]
                          .filter(Boolean)
                          .join(" • ")
                      : item.projectName || item.subtitle;

                  return (
                    <CommandItem
                      key={`entity-${item.type}-${item.id}`}
                      value={`entity-${item.type}-${item.id}`}
                      onSelect={() => handleSelectEntity(item.url, item)}
                      data-testid={`entity-item-${item.type}-${item.id}`}
                    >
                      {renderEntityIcon(item.type)}
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="font-medium text-sm text-foreground truncate">
                          {item.title}
                        </span>
                        {secondaryText && (
                          <span className="text-xs text-muted-foreground truncate">
                            {secondaryText}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </CommandDialog>

      {/* Launcher Dialog Integrations */}
      <CreateProjectDialog
        open={createProjectOpen}
        onOpenChange={setCreateProjectOpen}
      />

      <CreateTaskDialog
        open={createTaskOpen}
        onOpenChange={setCreateTaskOpen}
        initialProjectId={createTaskProjectId}
      />
    </>
  );
}

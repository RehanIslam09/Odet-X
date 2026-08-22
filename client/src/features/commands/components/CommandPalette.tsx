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
  Sparkles,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
} from "@/components/ui/command.js";
import { useCommandPalette } from "../hooks/useCommandPalette.js";
import type { CommandDefinition, CommandGroup as GroupName } from "../types/command.types.js";
import { CreateProjectDialog } from "@/features/projects/components/CreateProjectDialog.js";
import { CreateTaskDialog } from "@/features/tasks/components/CreateTaskDialog.js";
import { useGlobalSearch } from "@/features/search/hooks/useGlobalSearch.js";
import { isSafeInternalUrl } from "@/features/search/utils/url.utils.js";
import type { SearchResultDto, SearchEntityType } from "@/features/search/types/search.types.js";
import { useGlobalCopilot } from "@/features/ai/context/GlobalCopilotContext.js";
import { useActiveWorkspace } from "@/features/workspaces/context/WorkspaceContext.js";

function renderCommandIcon(iconKey?: string) {
  switch (iconKey) {
    case "dashboard":
      return <LayoutDashboard className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />;
    case "projects":
      return <Folder className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />;
    case "tasks":
      return <CheckSquare className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />;
    case "activity":
      return <Activity className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />;
    case "notifications":
      return <Bell className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />;
    case "settings":
      return <Settings className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />;
    case "create-project":
      return <FolderPlus className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />;
    case "create-task":
      return <PlusSquare className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />;
    default:
      return <CommandIcon className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />;
  }
}

function renderEntityIcon(type: SearchEntityType) {
  switch (type) {
    case "project":
      return <FolderKanban className="mr-2 h-4 w-4 shrink-0 text-primary" />;
    case "task":
      return <CheckSquare className="mr-2 h-4 w-4 shrink-0 text-sky-500" />;
    case "milestone":
      return <Flag className="mr-2 h-4 w-4 shrink-0 text-amber-500" />;
    case "memory":
      return <Brain className="mr-2 h-4 w-4 shrink-0 text-purple-500" />;
  }
}

const ENTITY_GROUP_TITLES: Record<SearchEntityType, string> = {
  project: "Projects",
  task: "Tasks",
  milestone: "Milestones",
  memory: "Project Memories",
};

const ENTITY_TYPE_ORDER: SearchEntityType[] = ["project", "task", "milestone", "memory"];

export interface CommandPaletteProps {
  onSelectEntity?: (item: SearchResultDto) => void;
}

export function CommandPalette({ onSelectEntity }: CommandPaletteProps = {}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { openCopilot } = useGlobalCopilot();
  const { currentWorkspace } = useActiveWorkspace();

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

  const {
    data: searchData,
    isLoading: searchLoading,
    isError: searchError,
    isEligible: searchEligible,
  } = useGlobalSearch(query, open);

  const groupedCommands = useMemo(() => {
    const map = new Map<GroupName, CommandDefinition[]>();
    for (const cmd of commands) {
      const groupList = map.get(cmd.group) || [];
      groupList.push(cmd);
      map.set(cmd.group, groupList);
    }
    return Array.from(map.entries());
  }, [commands]);

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

    const result: [string, SearchResultDto[]][] = [];
    for (const type of ENTITY_TYPE_ORDER) {
      const items = map.get(type);
      if (items && items.length > 0) {
        result.push([ENTITY_GROUP_TITLES[type], items]);
      }
    }
    return result;
  }, [searchData]);

  const showAiGroup = query.length === 0 || query.startsWith("/ai");

  const handleLaunchAiMode = useCallback(
    (customQuestion?: string) => {
      const initialQuestion = customQuestion || (query.startsWith("/ai") ? query.replace(/^\/ai\s*/, "") : query);
      setOpen(false);
      setQuery("");
      openCopilot(undefined, initialQuestion || undefined);
    },
    [query, setOpen, setQuery, openCopilot],
  );

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
      let finalUrl = targetUrl;
      if (currentWorkspace?.slug && !targetUrl.startsWith("/w/")) {
        const cleanSubpath = targetUrl.startsWith("/") ? targetUrl : `/${targetUrl}`;
        finalUrl = `/w/${currentWorkspace.slug}${cleanSubpath}`;
      }
      navigate(finalUrl);
      setOpen(false);
      setQuery("");
    },
    [navigate, queryClient, setOpen, setQuery, onSelectEntity, currentWorkspace],
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

            {/* Top AI Copilot Mode Option */}
            {showAiGroup && (
              <CommandGroup heading="AI Intelligence" data-testid="command-group-ai">
                <CommandItem
                  value="launch-ai-copilot"
                  onSelect={() => handleLaunchAiMode()}
                  className="text-primary font-medium cursor-pointer"
                  data-testid="command-item-launch-ai"
                >
                  <Sparkles className="mr-2 h-4 w-4 text-primary animate-pulse" />
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="font-medium text-sm text-foreground truncate">
                      {query.startsWith("/ai") && query.trim().length > 3 ? `Ask AI: "${query.replace(/^\/ai\s*/, "")}"` : "Ask Global AI Copilot"}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">
                      Open AI Copilot with workspace intelligence
                    </span>
                  </div>
                  <CommandShortcut>Ctrl+J</CommandShortcut>
                </CommandItem>
              </CommandGroup>
            )}

            {/* Local WP-04 Commands */}
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

            {/* Search Error Indicator */}
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

            {/* Server Entity Search Results */}
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

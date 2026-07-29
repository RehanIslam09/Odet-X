import { useState } from "react";
import { Check, ChevronsUpDown, Plus, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useActiveWorkspace } from "../context/WorkspaceContext";
import { CreateWorkspaceModal } from "./CreateWorkspaceModal";

function getWorkspaceInitials(name: string): string {
  if (!name || name.trim().length === 0) return "WS";
  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function WorkspaceSwitcher() {
  const { workspaces, currentWorkspace, switchWorkspace, isLoading } = useActiveWorkspace();
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex h-11 w-full animate-pulse items-center justify-between rounded-xl bg-muted/60 px-3">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-muted"></div>
          <div className="space-y-1">
            <div className="h-3 w-24 rounded bg-muted"></div>
            <div className="h-2 w-14 rounded bg-muted/80"></div>
          </div>
        </div>
        <ChevronsUpDown className="h-4 w-4 text-muted-foreground opacity-40" />
      </div>
    );
  }

  if (!currentWorkspace || workspaces.length === 0) {
    return (
      <>
        <Button
          variant="outline"
          onClick={() => setIsModalOpen(true)}
          className="h-11 w-full justify-start gap-2.5 rounded-xl border-dashed border-border/80 px-3 text-xs font-semibold text-primary shadow-none hover:bg-accent/60 hover:text-primary"
        >
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Plus className="h-3.5 w-3.5" />
          </div>
          <span>Create Workspace</span>
        </Button>
        <CreateWorkspaceModal open={isModalOpen} onOpenChange={setIsModalOpen} />
      </>
    );
  }

  const currentInitials = getWorkspaceInitials(currentWorkspace.name);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            role="combobox"
            aria-label="Select active workspace"
            className="h-12 w-full justify-between gap-2 rounded-xl border border-border/40 bg-muted/30 px-2.5 text-left font-normal shadow-none hover:bg-accent/60 focus-visible:ring-1 focus-visible:ring-ring"
          >
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-semibold text-primary-foreground shadow-sm">
                {currentWorkspace.isPersonal ? (
                  <User className="h-4 w-4" />
                ) : (
                  <span>{currentInitials}</span>
                )}
              </div>

              <div className="flex min-w-0 flex-col">
                <span className="truncate text-xs font-medium leading-snug text-foreground">
                  {currentWorkspace.name}
                </span>
                <span className="truncate text-[10px] text-muted-foreground">
                  {currentWorkspace.isPersonal ? "Personal Workspace" : `${currentWorkspace.role || "Member"} • Workspace`}
                </span>
              </div>
            </div>

            <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground opacity-50" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-[260px] rounded-xl p-1.5 shadow-lg border border-border/60">
          <DropdownMenuLabel className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Workspaces
          </DropdownMenuLabel>

          <div className="max-h-[280px] overflow-y-auto space-y-0.5">
            {workspaces.map((ws) => {
              const isSelected = ws.id === currentWorkspace.id;
              const initials = getWorkspaceInitials(ws.name);

              return (
                <DropdownMenuItem
                  key={ws.id}
                  onSelect={() => switchWorkspace(ws.slug)}
                  className="flex items-center justify-between gap-2 rounded-lg px-2 py-2 text-xs transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted text-[10px] font-semibold text-foreground border border-border/40">
                      {ws.isPersonal ? <User className="h-3 w-3" /> : <span>{initials}</span>}
                    </div>
                    <span className="truncate font-medium text-foreground">{ws.name}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {ws.isPersonal ? (
                      <Badge variant="outline" className="px-1.5 py-0 text-[9px] font-medium border-border/60">
                        Personal
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="px-1.5 py-0 text-[9px] font-medium">
                        {ws.role}
                      </Badge>
                    )}
                    {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
                  </div>
                </DropdownMenuItem>
              );
            })}
          </div>

          <DropdownMenuSeparator className="my-1 border-border/40" />

          <DropdownMenuItem
            onSelect={() => setIsModalOpen(true)}
            className="flex items-center gap-2 rounded-lg px-2 py-2 text-xs font-semibold text-primary cursor-pointer hover:bg-primary/10 hover:text-primary"
          >
            <div className="flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-primary">
              <Plus className="h-3.5 w-3.5" />
            </div>
            <span>Create Workspace</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateWorkspaceModal open={isModalOpen} onOpenChange={setIsModalOpen} />
    </>
  );
}

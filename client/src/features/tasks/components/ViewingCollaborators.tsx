import { usePresenceAwareness } from "@/realtime/usePresenceAwareness.js";
import { Avatar, AvatarFallback } from "@/components/ui/avatar.js";
import type { PresenceUser } from "@/realtime/realtime-types.js";

function getInitials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/**
 * Component showing collaborators currently viewing active task or project.
 */
export function ViewingCollaborators() {
  const { activeViewingUsers } = usePresenceAwareness();

  if (!activeViewingUsers || activeViewingUsers.length === 0) {
    return null;
  }

  const maxVisible = 4;
  const visibleViewers = activeViewingUsers.slice(0, maxVisible);
  const overflowCount = Math.max(0, activeViewingUsers.length - maxVisible);

  const primaryName = visibleViewers[0]?.name || "A collaborator";

  const viewingText =
    activeViewingUsers.length === 1
      ? `${primaryName} is viewing`
      : activeViewingUsers.length === 2
      ? `${visibleViewers[0].name} and ${visibleViewers[1].name} are viewing`
      : `${primaryName} and ${activeViewingUsers.length - 1} others are viewing`;

  return (
    <div
      className="flex items-center gap-2 rounded-md border border-border/40 bg-accent/50 px-2.5 py-1.5 text-xs text-muted-foreground"
      data-testid="viewing-collaborators"
      aria-live="polite"
      role="status"
      aria-label={viewingText}
    >
      <div className="flex items-center -space-x-1.5 overflow-hidden">
        {visibleViewers.map((viewer: PresenceUser) => (
          <Avatar
            key={viewer.userId}
            className="h-5 w-5 border border-background"
            title={`${viewer.name} (@${viewer.username})`}
            aria-label={`${viewer.name} is viewing`}
          >
            <AvatarFallback className="bg-primary/10 text-[9px] font-medium text-primary">
              {getInitials(viewer.name)}
            </AvatarFallback>
          </Avatar>
        ))}

        {overflowCount > 0 && (
          <div
            className="flex h-5 w-5 items-center justify-center rounded-full border border-background bg-muted text-[9px] font-semibold"
            aria-label={`${overflowCount} more viewers`}
          >
            +{overflowCount}
          </div>
        )}
      </div>

      <span className="font-medium text-foreground/80">{viewingText}</span>
    </div>
  );
}

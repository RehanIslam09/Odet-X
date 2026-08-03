import { usePresenceAwareness } from "@/realtime/usePresenceAwareness";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

function getInitials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/**
 * Workspace Presence Avatar Stack.
 *
 * Renders avatars for online workspace collaborators with online status dots.
 * Maximum of 5 inline avatars + numeric overflow badge (+N).
 */
export function WorkspacePresenceStack() {
  const { presenceUsers } = usePresenceAwareness();

  if (!presenceUsers || presenceUsers.length === 0) {
    return null;
  }

  const maxVisible = 5;
  const visibleUsers = presenceUsers.slice(0, maxVisible);
  const overflowCount = Math.max(0, presenceUsers.length - maxVisible);

  return (
    <div
      className="flex items-center -space-x-2 overflow-hidden"
      data-testid="workspace-presence-stack"
      aria-label="Online workspace collaborators"
      aria-live="polite"
    >
      {visibleUsers.map((user) => (
        <div
          key={user.userId}
          className="relative inline-block rounded-full border-2 border-background"
          title={`${user.name} (@${user.username})`}
          aria-label={`${user.name} is online`}
        >
          <Avatar className="h-7 w-7">
            <AvatarFallback className="bg-primary/10 text-[10px] font-medium text-primary">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 ring-1 ring-background motion-reduce:animate-none" />
        </div>
      ))}

      {overflowCount > 0 && (
        <div
          className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px] font-semibold text-muted-foreground"
          aria-label={`${overflowCount} more online collaborators`}
        >
          +{overflowCount}
        </div>
      )}
    </div>
  );
}

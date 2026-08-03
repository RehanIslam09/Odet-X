import { memo } from "react";
import { Users, Eye } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar.js";
import { Badge } from "@/components/ui/badge.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.js";
import { usePresenceAwareness } from "@/realtime/usePresenceAwareness.js";
import { PresenceBadge } from "@/features/workspaces/components/PresenceBadge.js";
import { useAuthStore } from "@/store/auth.store.js";

export const TeamPresenceWidget = memo(function TeamPresenceWidget() {
  const { presenceUsers } = usePresenceAwareness();
  const currentUser = useAuthStore((state) => state.user);

  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card className="flex flex-col border-border/60 bg-card shadow-2xs">
      <CardHeader className="pb-2.5 pt-3.5 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-500">
              <Users className="h-3.5 w-3.5" />
            </div>
            <div>
              <CardTitle className="text-xs font-semibold text-foreground uppercase tracking-tight">
                Online Team ({Math.max(presenceUsers.length, 1)})
              </CardTitle>
            </div>
          </div>
          <Badge variant="outline" className="text-[9px] font-medium border-emerald-500/30 text-emerald-500 gap-1 px-1.5 py-0">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Realtime
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-0 flex-1">
        <div className="divide-y border-t border-border/40">
          {presenceUsers.length === 0 ? (
            <div className="flex items-center justify-between p-3 px-4 hover:bg-muted/10 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative shrink-0">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                      {getInitials(currentUser?.name || "You")}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute -bottom-0.5 -right-0.5">
                    <PresenceBadge status="online" />
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-foreground truncate">
                      {currentUser?.name || "You"}
                    </span>
                    <Badge variant="secondary" className="h-3.5 text-[8px] px-1 py-0">
                      You
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                    <Eye className="h-3 w-3 text-emerald-500 shrink-0" />
                    <span className="truncate">Viewing Dashboard</span>
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="text-[9px] text-emerald-500 border-emerald-500/30 shrink-0 capitalize px-1.5 py-0">
                Online
              </Badge>
            </div>
          ) : (
            presenceUsers.map((user) => {
              const isSelf = currentUser?.id === user.userId;
              const viewingText = user.viewing
                ? `Viewing ${user.viewing.resourceType} #${user.viewing.resourceId.slice(-4)}`
                : "Active in workspace";

              return (
                <div
                  key={user.userId}
                  className="flex items-center justify-between p-3 px-4 hover:bg-muted/10 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                          {getInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="absolute -bottom-0.5 -right-0.5">
                        <PresenceBadge status="online" />
                      </span>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-foreground truncate">
                          {user.name}
                        </span>
                        {isSelf && (
                          <Badge variant="secondary" className="h-3.5 text-[8px] px-1 py-0">
                            You
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                        <Eye className="h-3 w-3 text-emerald-500 shrink-0" />
                        <span className="truncate">{viewingText}</span>
                      </p>
                    </div>
                  </div>

                  <Badge variant="outline" className="text-[9px] text-emerald-500 border-emerald-500/30 shrink-0 capitalize px-1.5 py-0">
                    Online
                  </Badge>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
});

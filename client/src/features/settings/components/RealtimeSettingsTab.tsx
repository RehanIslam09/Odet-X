import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.js";
import { Badge } from "@/components/ui/badge.js";
import { Wifi, Activity, Users, Radio, ShieldCheck } from "lucide-react";
import { useActiveWorkspace } from "@/features/workspaces/context/WorkspaceContext.js";
import { useRealtime } from "@/realtime/RealtimeContext.js";
import { usePresenceAwareness } from "@/realtime/usePresenceAwareness.js";
import { ConnectionStatusBadge } from "@/features/workspaces/components/ConnectionStatusBadge.js";
import { WorkspacePresenceStack } from "@/features/workspaces/components/WorkspacePresenceStack.js";

export function RealtimeSettingsTab() {
  const { currentWorkspace } = useActiveWorkspace();
  const { status } = useRealtime();
  const { presenceUsers, activeViewingUsers } = usePresenceAwareness();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Realtime & Socket Transport</h3>
        <p className="text-xs text-muted-foreground">
          Monitor active socket room subscriptions, real-time presence, and live event routing.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Transport Status</span>
              <Wifi className="h-4 w-4 text-primary" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="flex items-center gap-2">
              <ConnectionStatusBadge />
              <span className="text-xs font-mono capitalize">{status}</span>
            </div>
            <p className="text-[11px] text-muted-foreground pt-1">
              Socket.io WebSockets active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Active Room</span>
              <Radio className="h-4 w-4 text-emerald-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <Badge variant="outline" className="font-mono text-xs">
              workspace:{currentWorkspace?.id || "none"}
            </Badge>
            <p className="text-[11px] text-muted-foreground pt-1">
              Isolated workspace tenant room
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Online Collaborators</span>
              <Users className="h-4 w-4 text-indigo-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold">{presenceUsers.length}</span>
              <WorkspacePresenceStack />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Connected to current workspace
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <span>Active Resource Viewing Awareness</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Live presence awareness tracking active task/project document sessions across team members.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeViewingUsers.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground border rounded-lg bg-muted/10">
              No team members are currently viewing shared workspace resources.
            </div>
          ) : (
            <div className="divide-y border rounded-lg">
              {activeViewingUsers.map((v, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">{v.name}</span>
                    <span className="text-muted-foreground">is viewing</span>
                    <Badge variant="secondary" className="font-mono text-[10px]">
                      {v.viewing?.resourceType}:{v.viewing?.resourceId}
                    </Badge>
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                    Live Session
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-emerald-500/5 border-emerald-500/20">
        <CardContent className="p-4 flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Socket rooms are strictly isolated by workspace ID. Cross-tenant event leaking is automatically prevented at transport handshake.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

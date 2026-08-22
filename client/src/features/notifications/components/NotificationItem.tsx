import { Link, useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { Building2, Circle, Loader2, Sparkles, XCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button.js";
import { Badge } from "@/components/ui/badge.js";
import type { Notification } from "../types/notification.types";
import { getNotificationUrl } from "../utils/notification.utils";
import { useMarkNotificationRead } from "../hooks/useMarkNotificationRead";
import {
  useAcceptInvitation,
  useDeclineInvitation,
} from "@/features/workspaces/hooks/useWorkspaces.js";
import { useActiveWorkspace } from "@/features/workspaces/context/WorkspaceContext.js";

interface NotificationItemProps {
  notification: Notification;
  onSelect?: () => void;
}

export function NotificationItem({
  notification,
  onSelect,
}: NotificationItemProps) {
  const navigate = useNavigate();
  const markRead = useMarkNotificationRead();
  const acceptMutation = useAcceptInvitation();
  const declineMutation = useDeclineInvitation();
  const { currentWorkspace, workspaces, switchWorkspace } = useActiveWorkspace();

  const isUnread = notification.readAt === null;
  const isWorkspaceInvite =
    notification.type === "workspace.invitation" ||
    Boolean(notification.metadata?.token);
  const token = typeof notification.metadata?.token === "string" ? notification.metadata.token : null;
  const inviteStatus = (notification.metadata?.status as string) || "PENDING";
  const isWorkspaceUnavailable = Boolean(notification.metadata?.workspaceUnavailable);

  const url = getNotificationUrl(notification);

  const handleClick = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
    }

    if (isUnread) {
      markRead.mutate(notification.id);
    }
    if (onSelect) {
      onSelect();
    }

    const targetWsId = notification.workspaceId || (notification.metadata?.workspaceId as string | undefined);
    const targetWsSlug = notification.workspaceSlug || (notification.metadata?.workspaceSlug as string | undefined);

    let targetWs = targetWsId ? workspaces.find((w) => w.id === targetWsId) : undefined;
    if (!targetWs && targetWsSlug) {
      targetWs = workspaces.find((w) => w.slug === targetWsSlug);
    }

    const effectiveSlug = targetWs?.slug || targetWsSlug || currentWorkspace?.slug;
    const targetEntityUrl = getNotificationUrl({
      ...notification,
      workspaceSlug: effectiveSlug || undefined,
    }) || url;

    if (targetWs && currentWorkspace?.id !== targetWs.id) {
      await switchWorkspace(targetWs.id);
    }

    if (targetEntityUrl) {
      navigate(targetEntityUrl);
    }
  };

  const handleAcceptInvite = (inviteToken: string) => {
    if (isUnread) {
      markRead.mutate(notification.id);
    }
    acceptMutation.mutate(inviteToken, {
      onSuccess: (data) => {
        toast.success(
          `Joined workspace "${(notification.metadata?.workspaceName as string) || "Workspace"}"!`,
        );
        if (onSelect) onSelect();
        navigate(`/w/${data.workspaceSlug}/dashboard`);
      },
      onError: (err: unknown) => {
        const msg =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          "Failed to accept invitation.";
        toast.error(msg);
      },
    });
  };

  const handleDeclineInvite = (inviteToken: string) => {
    if (isUnread) {
      markRead.mutate(notification.id);
    }
    declineMutation.mutate(inviteToken, {
      onSuccess: () => {
        toast.success("Invitation declined.");
        if (onSelect) onSelect();
      },
      onError: (err: unknown) => {
        const msg =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          "Failed to decline invitation.";
        toast.error(msg);
      },
    });
  };

  // Render Actionable Workspace Invitation Card
  if (isWorkspaceInvite) {
    const workspaceNameStr = (notification.metadata?.workspaceName as string) || "Workspace";
    const inviterNameStr = (notification.metadata?.inviterName as string) || "";
    const roleStr = (notification.metadata?.role as string) || "";

    const isActionRequired =
      token &&
      !isWorkspaceUnavailable &&
      inviteStatus === "PENDING";

    return (
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-3.5 text-card-foreground shadow-sm transition-all hover:border-primary/30">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary shrink-0">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-foreground">Workspace Invitation</h4>
              <p className="text-[10px] text-muted-foreground">
                {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {inviteStatus === "ACCEPTED" && <Badge variant="secondary" className="text-[10px]">Accepted</Badge>}
            {inviteStatus === "DECLINED" && <Badge variant="outline" className="text-[10px]">Declined</Badge>}
            {inviteStatus === "EXPIRED" && <Badge variant="destructive" className="text-[10px]">Expired</Badge>}
            {isUnread && <Circle className="h-2 w-2 fill-primary text-primary shrink-0 mt-0.5" />}
          </div>
        </div>

        <div className="rounded-md bg-muted/40 p-2.5 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Workspace:</span>
            <span className="font-semibold text-foreground">{workspaceNameStr}</span>
          </div>
          {inviterNameStr && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Invited By:</span>
              <span className="font-medium text-foreground">{inviterNameStr}</span>
            </div>
          )}
          {roleStr && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Role:</span>
              <span className="font-medium capitalize text-primary">{roleStr.toLowerCase()}</span>
            </div>
          )}
        </div>

        {isWorkspaceUnavailable ? (
          <div className="text-[11px] text-muted-foreground italic">
            This workspace is no longer available.
          </div>
        ) : isActionRequired ? (
          <div className="flex gap-2 pt-0.5">
            <Button
              size="sm"
              className="h-7 text-xs flex-1 gap-1"
              onClick={() => handleAcceptInvite(token!)}
              disabled={acceptMutation.isPending || declineMutation.isPending}
            >
              {acceptMutation.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="h-3 w-3" />
              )}
              Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs flex-1 gap-1 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => handleDeclineInvite(token!)}
              disabled={acceptMutation.isPending || declineMutation.isPending}
            >
              {declineMutation.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <XCircle className="h-3 w-3" />
              )}
              Decline
            </Button>
          </div>
        ) : (
          <div className="text-[11px] text-muted-foreground italic">
            {inviteStatus === "ACCEPTED" && "You joined this workspace."}
            {inviteStatus === "DECLINED" && "Invitation declined."}
            {inviteStatus === "EXPIRED" && "This invitation has expired."}
            {inviteStatus === "REVOKED" && "Invitation revoked by workspace admin."}
          </div>
        )}
      </div>
    );
  }

  const content = (
    <div className="flex w-full gap-3 p-4 transition-colors hover:bg-muted/50">
      <div className="mt-1 flex h-2 w-2 shrink-0 items-center justify-center">
        {isUnread && <Circle className="h-2 w-2 fill-primary text-primary" />}
      </div>
      <div className="flex flex-col gap-1">
        <p
          className={cn(
            "text-sm",
            isUnread
              ? "font-medium text-foreground"
              : "font-normal text-muted-foreground",
          )}
        >
          {notification.title}
        </p>
        <p
          className={cn(
            "text-sm line-clamp-2",
            isUnread ? "text-muted-foreground" : "text-muted-foreground/80",
          )}
        >
          {notification.message}
        </p>
        <span className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(notification.createdAt), {
            addSuffix: true,
          })}
        </span>
      </div>
    </div>
  );

  if (url) {
    return (
      <Link to={url} onClick={(e) => handleClick(e)} className="block w-full">
        {content}
      </Link>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      className="block w-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {content}
    </div>
  );
}

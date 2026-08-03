import { useState } from "react";
import {
  AlertCircle,
  Crown,
  Loader2,
  Mail,
  Search,
  Trash2,
  UserPlus,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar.js";
import { Badge } from "@/components/ui/badge.js";
import { Button } from "@/components/ui/button.js";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.js";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog.js";
import { Input } from "@/components/ui/input.js";
import { Label } from "@/components/ui/label.js";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.js";
import { useAuthStore } from "@/store/auth.store.js";
import { useActiveWorkspace } from "@/features/workspaces/context/WorkspaceContext.js";
import {
  useCreateInvitation,
  usePendingInvitations,
  useRemoveWorkspaceMember,
  useRevokeInvitation,
  useTransferWorkspaceOwnership,
  useUpdateMemberRole,
  useWorkspaceDetails,
  useWorkspaceMembers,
} from "@/features/workspaces/hooks/useWorkspaces.js";
import { usePresenceAwareness } from "@/realtime/usePresenceAwareness.js";
import { PresenceBadge } from "@/features/workspaces/components/PresenceBadge.js";
import type { WorkspaceRole } from "@/features/workspaces/types/workspace.types.js";

type ApiErr = { response?: { data?: { message?: string } } };

export function WorkspaceMembersTab() {
  const currentUser = useAuthStore((state) => state.user);
  const { currentWorkspace } = useActiveWorkspace();
  const workspaceId = currentWorkspace?.id;

  const { data: workspaceDetails } = useWorkspaceDetails(workspaceId);
  const { data: members = [], isLoading, isError } = useWorkspaceMembers(workspaceId);
  const { data: pendingInvitations = [] } = usePendingInvitations(workspaceId);

  const createInvitationMutation = useCreateInvitation();
  const revokeInvitationMutation = useRevokeInvitation();
  const removeMemberMutation = useRemoveWorkspaceMember();
  const updateRoleMutation = useUpdateMemberRole();
  const transferOwnershipMutation = useTransferWorkspaceOwnership();

  const { presenceUsers } = usePresenceAwareness();
  const onlineUserIds = new Set(presenceUsers.map((u) => u.userId));

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>("MEMBER");

  const [searchQuery, setSearchQuery] = useState("");
  const [transferTargetId, setTransferTargetId] = useState<string | null>(null);

  const primaryOwnerId = workspaceDetails?.workspace?.ownerId || currentWorkspace?.ownerId;
  const isOwner = primaryOwnerId === currentUser?.id;

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId || !inviteEmail.trim()) return;

    createInvitationMutation.mutate(
      {
        workspaceId,
        input: {
          email: inviteEmail.trim(),
          role: inviteRole,
        },
      },
      {
        onSuccess: () => {
          toast.success(`Invitation sent to ${inviteEmail}!`);
          setInviteEmail("");
          setInviteOpen(false);
        },
        onError: (err: unknown) => {
          toast.error((err as ApiErr)?.response?.data?.message || "Failed to send invitation.");
        },
      },
    );
  };

  const handleRevokeInvitation = (invitationId: string) => {
    if (!workspaceId) return;

    revokeInvitationMutation.mutate(
      { workspaceId, invitationId },
      {
        onSuccess: () => {
          toast.success("Invitation revoked successfully.");
        },
        onError: (err: unknown) => {
          toast.error((err as ApiErr)?.response?.data?.message || "Failed to revoke invitation.");
        },
      },
    );
  };

  const handleRoleChange = (targetUserId: string, newRole: WorkspaceRole) => {
    if (!workspaceId) return;

    updateRoleMutation.mutate(
      { workspaceId, userId: targetUserId, role: newRole },
      {
        onSuccess: () => {
          toast.success("Member role updated.");
        },
        onError: (err: unknown) => {
          toast.error((err as ApiErr)?.response?.data?.message || "Failed to update member role.");
        },
      },
    );
  };

  const handleRemoveMember = (targetUserId: string, memberName: string) => {
    if (!workspaceId) return;
    if (!confirm(`Are you sure you want to remove ${memberName} from this workspace?`)) return;

    removeMemberMutation.mutate(
      { workspaceId, userId: targetUserId },
      {
        onSuccess: () => {
          toast.success(`Removed ${memberName} from workspace.`);
        },
        onError: (err: unknown) => {
          toast.error((err as ApiErr)?.response?.data?.message || "Failed to remove member.");
        },
      },
    );
  };

  const handleTransferOwnership = (newOwnerUserId: string) => {
    if (!workspaceId) return;

    transferOwnershipMutation.mutate(
      { workspaceId, newOwnerUserId },
      {
        onSuccess: () => {
          toast.success("Workspace ownership transferred successfully.");
          setTransferTargetId(null);
        },
        onError: (err: unknown) => {
          toast.error((err as ApiErr)?.response?.data?.message || "Failed to transfer ownership.");
        },
      },
    );
  };

  const filteredMembers = members.filter((member) => {
    const query = searchQuery.toLowerCase();
    const name = member.user?.name || "";
    const email = member.user?.email || "";
    const username = member.user?.username || "";

    return (
      name.toLowerCase().includes(query) ||
      email.toLowerCase().includes(query) ||
      username.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      {/* Tab Header Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Workspace Members</h3>
          <p className="text-xs text-muted-foreground">
            Manage collaborators, access controls, and pending invitations.
          </p>
        </div>

        {isOwner && (
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5 cursor-pointer">
                <UserPlus className="h-4 w-4" />
                Invite Member
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Invite Member to Workspace</DialogTitle>
                <DialogDescription>
                  Send an email invitation token to join this workspace.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleInviteSubmit} className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label htmlFor="invite-email">Email Address</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="colleague@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="invite-role">Workspace Role</Label>
                  <Select
                    value={inviteRole}
                    onValueChange={(val) => setInviteRole(val as WorkspaceRole)}
                  >
                    <SelectTrigger id="invite-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MEMBER">Member (Full collaborate access)</SelectItem>
                      <SelectItem value="OWNER">Owner (Workspace administration)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <DialogFooter className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setInviteOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createInvitationMutation.isPending}>
                    {createInvitationMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      "Send Invitation"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search Input */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Filter members by name or email..."
          className="pl-9 h-9 text-xs"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Active Members Roster */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Active Collaborators ({members.length})</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Users with active access to this workspace.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center p-8 text-muted-foreground text-xs">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading members...
            </div>
          ) : isError ? (
            <div className="p-6 text-center text-xs text-destructive flex items-center justify-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Failed to load workspace members.
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              No members match your search criteria.
            </div>
          ) : (
            <div className="divide-y border-t">
              {filteredMembers.map((member) => {
                const isMemberOwner = primaryOwnerId === member.userId;
                const isSelf = currentUser?.id === member.userId;
                const isOnline = onlineUserIds.has(member.userId);
                const displayName = member.user?.name || "Member";
                const displayEmail = member.user?.email || "";

                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 hover:bg-muted/10 transition-colors"
                  >
                    {/* User Info */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                            {displayName.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {isOnline && (
                          <span className="absolute -bottom-0.5 -right-0.5">
                            <PresenceBadge status="online" />
                          </span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-foreground truncate">
                            {displayName}
                          </span>
                          {isSelf && (
                            <Badge variant="secondary" className="h-4 text-[9px] px-1">
                              You
                            </Badge>
                          )}
                          {isMemberOwner && (
                            <Badge variant="default" className="h-4 text-[9px] px-1 gap-0.5 bg-amber-500 hover:bg-amber-600">
                              <Crown className="h-2.5 w-2.5" />
                              Primary Owner
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {displayEmail}
                        </p>
                      </div>
                    </div>

                    {/* Actions & Role Selector */}
                    <div className="flex items-center gap-3 shrink-0">
                      {isOwner && !isMemberOwner ? (
                        <Select
                          value={member.role}
                          onValueChange={(val) => handleRoleChange(member.userId, val as WorkspaceRole)}
                        >
                          <SelectTrigger className="h-8 w-28 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="MEMBER">Member</SelectItem>
                            <SelectItem value="OWNER">Owner</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="outline" className="h-7 px-2 text-xs capitalize font-medium">
                          {member.role.toLowerCase()}
                        </Badge>
                      )}

                      {/* Transfer Ownership / Remove Actions */}
                      {isOwner && !isMemberOwner && (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30 cursor-pointer"
                            title="Transfer Primary Ownership"
                            onClick={() => setTransferTargetId(member.userId)}
                          >
                            <Crown className="h-4 w-4" />
                          </Button>

                          {!isSelf && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:bg-destructive/10 cursor-pointer"
                              title="Remove Member"
                              onClick={() => handleRemoveMember(member.userId, displayName)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Invitations Section */}
      {isOwner && pendingInvitations.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />
              <span>Pending Invitations ({pendingInvitations.length})</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Invitations sent but not yet accepted.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y border-t">
              {pendingInvitations.map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center justify-between p-4 hover:bg-muted/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                      <Mail className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-foreground">{invite.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Role: <span className="capitalize">{invite.role.toLowerCase()}</span> • Invited by {invite.invitedBy.name}
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-destructive hover:bg-destructive/10 cursor-pointer"
                    onClick={() => handleRevokeInvitation(invite.id)}
                    disabled={revokeInvitationMutation.isPending}
                  >
                    <XCircle className="mr-1.5 h-3.5 w-3.5" />
                    Revoke
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transfer Ownership Confirmation Dialog */}
      <Dialog open={Boolean(transferTargetId)} onOpenChange={(open) => !open && setTransferTargetId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <Crown className="h-5 w-5" />
              Transfer Workspace Ownership
            </DialogTitle>
            <DialogDescription>
              Transferring primary ownership will elevate the target member to Primary Owner. You will remain an Owner of this workspace.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setTransferTargetId(null)}>
              Cancel
            </Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={() => transferTargetId && handleTransferOwnership(transferTargetId)}
              disabled={transferOwnershipMutation.isPending}
            >
              {transferOwnershipMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Transferring...
                </>
              ) : (
                "Confirm Transfer"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

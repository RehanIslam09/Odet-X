export type WorkspaceRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";

export interface WorkspaceMemberUser {
  id: string;
  name: string;
  username: string;
  email: string;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  user?: WorkspaceMemberUser;
  role: WorkspaceRole;
  joinedAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  isPersonal: boolean;
  type?: "PERSONAL" | "TEAM";
  accentColor?: string;
  color?: string;
  aiSettings?: {
    model?: string;
    proactiveEnabled?: boolean;
    memoryRetentionDays?: number;
  };
  role?: WorkspaceRole;
  memberCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceDetails {
  workspace: Workspace;
  members: WorkspaceMember[];
}

export interface InitialInviteInput {
  email: string;
  role: WorkspaceRole;
}

export interface CreateWorkspaceInput {
  name: string;
  slug?: string;
  type?: "PERSONAL" | "TEAM";
  accentColor?: string;
  color?: string;
  initialInvites?: InitialInviteInput[];
}

export interface UpdateWorkspaceInput {
  name?: string;
  slug?: string;
  type?: "PERSONAL" | "TEAM";
  accentColor?: string;
  color?: string;
  aiSettings?: {
    model?: string;
    proactiveEnabled?: boolean;
    memoryRetentionDays?: number;
  };
}

export interface WorkspaceInvitation {
  id: string;
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
  invitedBy: {
    id: string;
    name: string;
    email: string;
  };
  token: string;
  expiresAt: string;
  status: string;
  createdAt: string;
}

export interface CreateInvitationInput {
  email: string;
  role: WorkspaceRole;
}

export interface InvitationValidationDetails {
  invitation: WorkspaceInvitation;
  workspaceName: string;
  workspaceSlug: string;
}

export interface AcceptInvitationResult {
  workspaceId: string;
  workspaceSlug: string;
  role: WorkspaceRole;
}

export type WorkspaceRole = "OWNER" | "MEMBER";

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
  role?: WorkspaceRole;
  memberCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceDetails {
  workspace: Workspace;
  members: WorkspaceMember[];
}

export interface CreateWorkspaceInput {
  name: string;
  slug?: string;
}

export interface UpdateWorkspaceInput {
  name?: string;
  slug?: string;
}

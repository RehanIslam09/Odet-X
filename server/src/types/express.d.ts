import { IUserDocument } from "@/models/user.model.js";
import { IWorkspaceDocument } from "@/models/workspace.model.js";
import { IWorkspaceMemberDocument } from "@/models/workspace-member.model.js";

declare global {
  namespace Express {
    interface Request {
      /**
       * Set by the `authenticate` middleware after verifying the access token
       * and confirming the user exists and is active.
       */
      user?: IUserDocument;

      /**
       * Set by query validation middleware after parsing and coercing `req.query`.
       */
      validatedQuery?: unknown;

      /**
       * Set by the `resolveWorkspace` middleware after locating the target Workspace.
       */
      workspace?: IWorkspaceDocument;

      /**
       * Set by the `requireWorkspaceMember` middleware after verifying active membership.
       */
      workspaceMember?: IWorkspaceMemberDocument;
    }
  }
}

export {};

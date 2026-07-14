import { IUserDocument } from "@/models/user.model.js";

declare global {
  namespace Express {
    interface Request {
      /**
       * Set by the `authenticate` middleware after verifying the access token
       * and confirming the user exists and is active.
       *
       * Typed as optional so TypeScript enforces that routes accessing this
       * property are guarded by the `authenticate` middleware. Use a
       * non-null assertion (`req.user!`) only in handlers where the middleware
       * is guaranteed to have run.
       */
      user?: IUserDocument;
    }
  }
}

export {};
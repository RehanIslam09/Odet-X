import { motion } from "framer-motion";
import { ShieldOff, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";

/**
 * Unauthorized (403) page.
 *
 * Shown when an authenticated user attempts to access a resource they do
 * not have permission to view (e.g. another user's workspace in a future
 * multi-tenant setup).
 *
 * Distinct from `NotFoundPage` — the resource exists, the user simply
 * lacks permission. This avoids confirming or denying the existence of
 * the resource to unauthorized users.
 */
export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex max-w-md flex-col items-center gap-6 text-center"
      >
        {/* Icon */}
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
          <ShieldOff className="h-6 w-6 text-muted-foreground" />
        </div>

        {/* Copy */}
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            403 — Unauthorized
          </p>
          <h1 className="text-xl font-semibold tracking-tight">
            Access denied
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            You don&apos;t have permission to view this page. If you think
            this is a mistake, contact your workspace administrator.
          </p>
        </div>

        {/* Action */}
        <Button variant="outline" asChild>
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to dashboard
          </Link>
        </Button>
      </motion.div>
    </div>
  );
}

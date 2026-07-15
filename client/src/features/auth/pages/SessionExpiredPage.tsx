import { motion } from "framer-motion";
import { Clock, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";

/**
 * Session Expired page.
 *
 * Shown when the Axios interceptor cannot refresh the access token,
 * meaning the 7-day refresh token has also expired (or was invalidated).
 * The user is redirected here via the interceptor's `window.location.replace`.
 *
 * This page is intentionally not behind a route guard — it must be
 * reachable when the user is unauthenticated.
 */
export default function SessionExpiredPage() {
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
          <Clock className="h-6 w-6 text-muted-foreground" />
        </div>

        {/* Copy */}
        <div className="space-y-2">
          <h1 className="text-xl font-semibold tracking-tight">
            Your session has expired
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            For your security, sessions expire after 7 days of inactivity.
            Please sign in again to continue.
          </p>
        </div>

        {/* Action */}
        <Button asChild>
          <Link to="/auth/login">
            Sign in again
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </motion.div>
    </div>
  );
}

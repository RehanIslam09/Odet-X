import { motion } from "framer-motion";

/**
 * Full-screen loading screen displayed during the application bootstrap phase.
 *
 * Shown by `ProtectedRoute` and `PublicRoute` while `useCurrentUser` is
 * resolving. This prevents route guards from making a redirect decision
 * before the session state is known.
 *
 * Design: Centered logo mark with a subtle pulse animation.
 * Intentionally minimal — this disappears in under 300ms on most connections.
 */
export function AppLoader() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="flex flex-col items-center gap-4"
      >
        {/* Logo mark */}
        <motion.div
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary font-bold text-primary-foreground shadow-lg text-lg"
        >
          AI
        </motion.div>

        {/* Loading dots */}
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-muted-foreground"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: i * 0.2,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}

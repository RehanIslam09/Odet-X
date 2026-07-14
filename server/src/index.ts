import app from "./app.js";
import { connectDatabase } from "./config/database.js";
import { env } from "./config/env.js";

/**
 * Handles fatal errors that occur during or after startup.
 * Logs the error and exits with a non-zero code so the process manager
 * (PM2, Docker, Kubernetes) knows to restart the process.
 */
function handleFatalError(reason: string, error: unknown): never {
  console.error(`[FATAL] ${reason}:`, error);
  process.exit(1);
}

// Catch asynchronous errors that were not caught by any async handler.
// This is a safety net — in production these should never fire if every
// async path is correctly wrapped with asyncHandler.
process.on("unhandledRejection", (reason) => {
  handleFatalError("Unhandled promise rejection", reason);
});

// Catch synchronous errors that bubble all the way to the event loop.
process.on("uncaughtException", (error) => {
  handleFatalError("Uncaught exception", error);
});

async function bootstrap() {
  await connectDatabase();

  app.listen(env.PORT, () => {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🚀 AI Project Manager API");
    console.log(`🌍 Environment: ${env.NODE_ENV}`);
    console.log(`📡 Server: http://localhost:${env.PORT}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  });
}

bootstrap().catch((error) => {
  handleFatalError("Bootstrap failed", error);
});
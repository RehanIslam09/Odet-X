import { Server as HttpServer, createServer } from "http";

import app from "./app.js";
import { connectDatabase, disconnectDatabase } from "./config/database.js";
import { env } from "./config/env.js";
import { createRealtimeServer, type RealtimeServerInstance } from "./realtime/index.js";

let httpServer: HttpServer | null = null;
let realtimeServer: RealtimeServerInstance | null = null;
let isShuttingDown = false;

/**
 * Handles fatal errors that occur during or after startup.
 * Logs the error and exits with a non-zero code so the process manager
 * (PM2, Docker, Kubernetes) knows to restart the process.
 */
function handleFatalError(reason: string, error: unknown): never {
  console.error(`[FATAL] ${reason}:`, error);
  process.exit(1);
}

async function gracefulShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`\n[Server] Received ${signal}. Starting graceful shutdown...`);
  try {
    if (realtimeServer) {
      console.log("[Server] Closing Real-Time Transport Server...");
      await realtimeServer.close();
      realtimeServer = null;
    }

    if (httpServer) {
      console.log("[Server] Closing HTTP Server...");
      await new Promise<void>((resolve) => httpServer!.close(() => resolve()));
      httpServer = null;
    }

    console.log("[Server] Closing Database connection...");
    await disconnectDatabase();

    console.log("[Server] Graceful shutdown completed successfully.");
    process.exit(0);
  } catch (error) {
    console.error("[Server] Error during graceful shutdown:", error);
    process.exit(1);
  }
}

// Catch asynchronous errors that were not caught by any async handler.
process.on("unhandledRejection", (reason) => {
  handleFatalError("Unhandled promise rejection", reason);
});

// Catch synchronous errors that bubble all the way to the event loop.
process.on("uncaughtException", (error) => {
  handleFatalError("Uncaught exception", error);
});

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

async function bootstrap() {
  await connectDatabase();

  httpServer = createServer(app);

  // Initialize Real-Time Transport Server (Socket.IO) attached to HTTP Server
  realtimeServer = createRealtimeServer(httpServer);

  httpServer.listen(env.PORT, () => {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🚀 AI Project Manager API");
    console.log(`🌍 Environment: ${env.NODE_ENV}`);
    console.log(`📡 Server: http://localhost:${env.PORT}`);
    console.log("⚡ Real-Time Transport: Initialized (Socket.IO)");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  });
}

bootstrap().catch((error) => {
  handleFatalError("Bootstrap failed", error);
});
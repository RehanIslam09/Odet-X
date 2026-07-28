import cron from "node-cron";
import mongoose from "mongoose";
import { connectDatabase } from "./config/database.js";
import { processTaskReminders } from "./jobs/notification.jobs.js";
import { processProactiveIntelligenceJob } from "./jobs/proactive-intelligence.jobs.js";

let isShuttingDown = false;
let isJobRunning = false;

// Global error handlers
process.on("unhandledRejection", (reason) => {
  console.error("[FATAL Worker] Unhandled promise rejection:", reason);
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  console.error("[FATAL Worker] Uncaught exception:", error);
  process.exit(1);
});

const gracefulShutdown = async (signal: string) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`\n[Worker] Received ${signal}. Shutting down gracefully...`);

  try {
    await mongoose.connection.close();
    console.log("[Worker] MongoDB connection closed.");
    process.exit(0);
  } catch (error) {
    console.error("[Worker] Error during shutdown:", error);
    process.exit(1);
  }
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

const runJobs = async () => {
  if (isShuttingDown) return;

  // Prevent overlapping scheduler executions if one run takes unusually long
  if (isJobRunning) {
    console.warn("[Worker] Skipping schedule: Previous job run is still executing.");
    return;
  }

  isJobRunning = true;
  console.log(`[Worker] Started processing jobs at ${new Date().toISOString()}`);

  try {
    await processTaskReminders();
    await processProactiveIntelligenceJob();
    console.log(`[Worker] Successfully finished processing jobs.`);
  } catch (error) {
    console.error("[Worker] Error during job execution:", error);
  } finally {
    isJobRunning = false;
  }
};

async function bootstrapWorker() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("⚙️ AI Project Manager Worker");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  await connectDatabase();

  // Run on startup immediately
  await runJobs();

  // Schedule to run every hour at minute 0
  cron.schedule("0 * * * *", () => {
    runJobs();
  });
  
  console.log("[Worker] Hourly cron scheduler registered (0 * * * *).");
}

bootstrapWorker().catch((error) => {
  console.error("[Worker] Bootstrap failed:", error);
  process.exit(1);
});

import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

let mongoServer: MongoMemoryServer | null = null;

/**
 * Safely connects to the test database and clears existing collections.
 * Enforces strict safety requirements to prevent accidental destruction of development data.
 * Falls back to MongoMemoryServer if standalone MongoDB is unavailable.
 */
export async function setupTestDatabase(): Promise<void> {
  const env = process.env.NODE_ENV;
  if (env !== "test") {
    console.error(`? FATAL: Test suite must be run with NODE_ENV="test". Current NODE_ENV is "${env}". Aborting.`);
    process.exit(1);
  }

  let uri = process.env.MONGODB_TEST_URI || "mongodb://127.0.0.1:27017/ai-project-manager-test";

  try {
    console.log(`?? Connecting to test database: ${uri}`);
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 2000 });
  } catch {
    console.log("?? Standalone MongoDB not reachable. Launching MongoMemoryServer fallback...");
    mongoServer = await MongoMemoryServer.create();
    uri = mongoServer.getUri() + "test";
    await mongoose.connect(uri);
  }

  process.env.MONGODB_URI = uri;

  // Clear all collections to ensure a clean slate before each test run
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection?.deleteMany({});
  }

  console.log("?? Test database cleared and ready.");
}

/**
 * Closes the database connection and stops the in-memory server if running.
 */
export async function teardownTestDatabase(): Promise<void> {
  await mongoose.connection.close();
  if (mongoServer) {
    await mongoServer.stop();
    mongoServer = null;
  }
  console.log("?? Database connection closed.");
}

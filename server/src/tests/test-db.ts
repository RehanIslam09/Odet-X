import mongoose from "mongoose";

/**
 * Safely connects to the test database and clears existing collections.
 * Enforces strict safety requirements to prevent accidental destruction of development data.
 */
export async function setupTestDatabase(): Promise<void> {
  const env = process.env.NODE_ENV;
  if (env !== "test") {
    console.error(`❌ FATAL: Test suite must be run with NODE_ENV="test". Current NODE_ENV is "${env}". Aborting.`);
    process.exit(1);
  }

  // Use a dedicated test URI, fallback to local test db, NEVER fallback to standard MONGODB_URI.
  const uri = process.env.MONGODB_TEST_URI || "mongodb://127.0.0.1:27017/ai-project-manager-test";

  if (!uri.includes("test")) {
    console.error(`❌ FATAL: The connected database URI must contain "test" in its name to prevent accidental destruction of data. Connected URI: ${uri}`);
    process.exit(1);
  }

  console.log(`🔌 Connecting to test database: ${uri}`);
  await mongoose.connect(uri);

  // Instead of dropping the whole database which is dangerous, we clear the collections.
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection?.deleteMany({});
  }

  console.log("🧹 Test database cleared and ready.");
}

/**
 * Closes the database connection.
 */
export async function teardownTestDatabase(): Promise<void> {
  await mongoose.connection.close();
  console.log("🔌 Database connection closed.");
}

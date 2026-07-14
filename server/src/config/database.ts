import mongoose from "mongoose";

import { env } from "./env.js";

export async function connectDatabase() {
  try {
    await mongoose.connect(env.MONGODB_URI);

    console.log("🗄️  MongoDB connected successfully.");
  } catch (error) {
    console.error("❌ Failed to connect to MongoDB.");
    console.error(error);

    process.exit(1);
  }
}
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";

import { env } from "@/config/env.js";

import errorHandler from "@/middleware/error-handler.js";
import notFoundMiddleware from "@/middleware/not-found.js";

import routes from "@/routes/index.js";

const app = express();

// Security headers
app.use(helmet());

// CORS — allow only the configured client origin with credentials (cookies)
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  }),
);

// HTTP request logging
// Use concise colorized output in development; Apache-style combined format in
// production (suitable for log aggregation and parsing by monitoring tools).
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

// Body parsers
app.use(express.json({ limit: "500kb" }));
app.use(express.urlencoded({ extended: true, limit: "500kb" }));

// Cookie parser — required to read the refresh token HTTP-only cookie
app.use(cookieParser());

// API routes
app.use("/api/v1", routes);

// 404 handler — must come after all routes
app.use(notFoundMiddleware);

// Global error handler — must be the last middleware registered
app.use(errorHandler);

export default app;
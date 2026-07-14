import { NextFunction, Request, Response } from "express";
import { Error as MongooseError } from "mongoose";

import { AppError, BadRequestError } from "@/utils/app-error.js";

/**
 * Global error handling middleware.
 *
 * Handles three categories:
 * 1. Operational AppErrors — expected failures (auth, validation, not-found).
 *    These are NOT logged since they are anticipated and non-actionable.
 * 2. Mongoose errors — translated to user-friendly 400/404 responses.
 * 3. Unexpected errors — true programmer errors, logged at ERROR level with
 *    the full stack trace. These need developer attention.
 */
export default function errorHandler(
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  // --- Operational errors ---
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
    });
  }

  // --- Mongoose: duplicate key (e.g. unique email) ---
  if (isMongooseDuplicateKeyError(error)) {
    return res.status(409).json({
      success: false,
      message: "A resource with that value already exists.",
    });
  }

  // --- Mongoose: document validation failure ---
  if (error instanceof MongooseError.ValidationError) {
    const message = Object.values(error.errors)
      .map((e) => e.message)
      .join(", ");

    const appError = new BadRequestError(message);
    return res.status(appError.statusCode).json({
      success: false,
      message: appError.message,
    });
  }

  // --- Mongoose: invalid ObjectId cast (e.g. /users/not-an-id) ---
  if (error instanceof MongooseError.CastError) {
    return res.status(400).json({
      success: false,
      message: `Invalid value for field: ${error.path}`,
    });
  }

  // --- Unknown / programmer errors ---
  // Log the full error only for non-operational failures. In production this
  // should route to an observability service (Sentry, Datadog, etc.).
  console.error("[UNHANDLED ERROR]", error);

  return res.status(500).json({
    success: false,
    message: "An unexpected error occurred. Please try again later.",
  });
}

/**
 * MongoDB driver throws a plain Error with code 11000 for duplicate key
 * violations. Mongoose does not wrap these in a MongooseError subclass, so
 * we identify them by inspecting the error shape.
 */
function isMongooseDuplicateKeyError(
  error: unknown,
): error is Error & { code: number } {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as { code: number }).code === 11000
  );
}
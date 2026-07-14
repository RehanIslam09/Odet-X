/**
 * Base class for all operational application errors.
 *
 * `isOperational` distinguishes expected errors (wrong password, not found,
 * validation failure) from true programmer errors (uncaught exceptions, DB
 * driver crashes). The error handler uses this flag to decide whether to log
 * at ERROR level and whether to include stack traces.
 */
export class AppError extends Error {
  public readonly isOperational = true;

  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class BadRequestError extends AppError {
  constructor(message: string) {
    super(400, message);
    this.name = "BadRequestError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string) {
    super(401, message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string) {
    super(403, message);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(404, message);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message);
    this.name = "ConflictError";
  }
}
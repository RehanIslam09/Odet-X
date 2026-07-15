import { NextFunction, Request, RequestHandler, Response } from "express";
import { ZodError, ZodSchema } from "zod";

/**
 * Express middleware factory that validates `req.query` against a Zod schema.
 *
 * Mirrors the `validate()` body middleware, except it operates on query string
 * parameters. On success, the schema's parsed output is stored on
 * `req.validatedQuery` so controllers receive typed, coerced values without
 * mutating Express 5's read-only `req.query`.
 *
 * On failure, returns a structured 400 with field-level errors — the same
 * format as the body validation middleware for consistency.
 *
 * Usage:
 * ```ts
 * router.get("/projects", validateQuery(projectQuerySchema), list);
 * ```
 */
export function validateQuery(schema: ZodSchema): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      const errors = formatZodErrors(result.error);

      res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors,
      });

      return;
    }

    req.validatedQuery = result.data;

    next();
  };
}

function formatZodErrors(error: ZodError): Record<string, string> {
  return error.issues.reduce<Record<string, string>>((acc, issue) => {
    const field = issue.path.join(".");
    if (!acc[field]) {
      acc[field] = issue.message;
    }
    return acc;
  }, {});
}

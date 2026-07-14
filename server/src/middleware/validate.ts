import { NextFunction, Request, RequestHandler, Response } from "express";
import { ZodError, ZodSchema } from "zod";

import { BadRequestError } from "@/utils/app-error.js";

/**
 * Express middleware factory that validates `req.body` against a Zod schema.
 *
 * On success: `req.body` is replaced with the schema's parsed output (type-safe
 * coercion, default values, etc.) and the next middleware is called.
 *
 * On failure: returns a structured 400 response with field-level error messages
 * so clients can display inline validation feedback without any guesswork.
 *
 * Usage:
 * ```ts
 * router.post("/register", validate(registerSchema), register);
 * ```
 */
export function validate(schema: ZodSchema): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const errors = formatZodErrors(result.error);

      res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors,
      });

      return;
    }

    // Replace req.body with the parsed result so downstream middleware and
    // controllers receive the typed, coerced value rather than raw input.
    req.body = result.data;

    next();
  };
}

/**
 * Formats a ZodError into a flat record of field → first error message.
 *
 * Zod errors are nested; this collapses them to a flat object that maps
 * each field path (e.g. "email", "password") to its first error message.
 * This format is easy to consume from any frontend form library.
 */
function formatZodErrors(error: ZodError): Record<string, string> {
  return error.issues.reduce<Record<string, string>>((acc, issue) => {
    const field = issue.path.join(".");
    if (!acc[field]) {
      acc[field] = issue.message;
    }
    return acc;
  }, {});
}

export { BadRequestError };

import { Request, Response } from "express";

export default function notFoundMiddleware(
  req: Request,
  res: Response,
) {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found.`,
  });
}
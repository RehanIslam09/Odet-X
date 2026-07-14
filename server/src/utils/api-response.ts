import { Response } from "express";

interface SuccessResponse<T> {
  statusCode?: number;
  message: string;
  data?: T;
}

export function sendSuccessResponse<T>(
  res: Response,
  {
    statusCode = 200,
    message,
    data,
  }: SuccessResponse<T>,
) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}
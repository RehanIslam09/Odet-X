import { Request, Response } from "express";

import {
  loginUser,
  registerUser,
} from "@/services/auth.service.js";

import { asyncHandler } from "@/utils/async-handler.js";
import { sendSuccessResponse } from "@/utils/api-response.js";

export const register = asyncHandler(
  async (req: Request, res: Response) => {
    const user = await registerUser(req.body);

    sendSuccessResponse(res, {
      statusCode: 201,
      message: "User registered successfully.",
      data: user,
    });
  },
);

export const login = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await loginUser(req.body);

    sendSuccessResponse(res, {
      message: "Login successful.",
      data: result,
    });
  },
);

export const me = asyncHandler(
  async (req: Request, res: Response) => {
    sendSuccessResponse(res, {
      message: "User retrieved successfully.",
      data: req.user,
    });
  },
);
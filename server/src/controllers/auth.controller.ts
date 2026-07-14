import { Request, Response } from "express";

import { registerUser } from "../services/auth.service";

import { sendSuccessResponse } from "../utils/api-response";
import { asyncHandler } from "../utils/async-handler";

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
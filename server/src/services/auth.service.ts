import User from "@/models/user.model.js";

import { ConflictError, UnauthorizedError } from "@/utils/app-error.js";

import {
  generateAccessToken,
  generateRefreshToken,
} from "@/utils/jwt.js";

import {
  LoginUserDto,
  RegisterUserDto,
} from "@/types/auth.js";

export async function registerUser(data: RegisterUserDto) {
  const existingUser = await User.findOne({
    email: data.email,
  });

  if (existingUser) {
    throw new ConflictError(
      "Email is already registered.",
    );
  }

  const user = await User.create(data);

  return user;
}

export async function loginUser(data: LoginUserDto) {
  const user = await User.findOne({
    email: data.email,
  }).select("+password +refreshToken");

  if (!user) {
    throw new UnauthorizedError(
      "Invalid email or password.",
    );
  }

  const isPasswordValid =
    await user.comparePassword(data.password);

  if (!isPasswordValid) {
    throw new UnauthorizedError(
      "Invalid email or password.",
    );
  }

  const accessToken = generateAccessToken(
    user.id,
  );

  const refreshToken = generateRefreshToken(
    user.id,
  );

  user.refreshToken = refreshToken;

  await user.save();

  return {
    user,
    accessToken,
    refreshToken,
  };
}
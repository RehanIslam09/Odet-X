import User from "@/models/user.model";
import { RegisterUserDto } from "../types/auth";

export async function registerUser(data: RegisterUserDto) {
  const existingUser = await User.findOne({
    email: data.email,
  });

  if (existingUser) {
    throw new Error("Email is already registered.");
  }

  const user = await User.create(data);

  return user;
}
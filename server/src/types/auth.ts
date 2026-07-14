/**
 * Auth DTOs are inferred from Zod schemas to ensure validators and type
 * definitions never go out of sync. Import from here rather than from the
 * validator file directly.
 */
export type {
  LoginUserDto,
  RegisterUserDto,
} from "@/validators/auth.validator.js";
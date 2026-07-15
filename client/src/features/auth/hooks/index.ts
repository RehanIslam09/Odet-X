/**
 * Auth feature hooks — public barrel export.
 *
 * All auth-related hooks are re-exported from this single entry point.
 * Consumers import from `@/features/auth/hooks` rather than individual files.
 *
 * @example
 * import { useLogin, useCurrentUser } from '@/features/auth/hooks';
 */

export { authKeys, useCurrentUser } from "./useCurrentUser";
export { useLogin } from "./useLogin";
export { useRegister } from "./useRegister";
export { useLogout } from "./useLogout";

import { RegisterForm } from "@/features/auth/components/RegisterForm";

/**
 * Register page.
 *
 * A deliberately thin page component — all form logic lives in `RegisterForm`.
 *
 * Rendered inside `AuthLayout` via the router's `Outlet`.
 * Protected by `PublicRoute` — authenticated users are redirected away.
 */
export default function RegisterPage() {
  return <RegisterForm />;
}

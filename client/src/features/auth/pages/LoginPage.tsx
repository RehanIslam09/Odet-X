import { LoginForm } from "@/features/auth/components/LoginForm";

/**
 * Login page.
 *
 * A deliberately thin page component — all form logic lives in `LoginForm`.
 * This separation makes it trivial to add page-level elements (banners,
 * social login buttons, terms notice) without modifying the form.
 *
 * Rendered inside `AuthLayout` via the router's `Outlet`.
 * Protected by `PublicRoute` — authenticated users are redirected away.
 */
export default function LoginPage() {
  return <LoginForm />;
}

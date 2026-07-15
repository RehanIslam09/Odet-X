import { zodResolver } from "@hookform/resolvers/zod";
import { type Variants, motion } from "framer-motion";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLogin } from "@/features/auth/hooks";
import {
  loginSchema,
  type LoginFormValues,
} from "@/features/auth/validators/auth.schemas";
import { applyServerErrors } from "@/utils/form-errors";
import { getApiError } from "@/utils/api-error";

// ---------------------------------------------------------------------------
// Animation — typed as Variants for Framer Motion v12 compatibility
// ---------------------------------------------------------------------------

const formVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.05 },
  },
};

const fieldVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: "easeOut" },
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Login form component.
 *
 * Integrates React Hook Form with Zod validation and the `useLogin` mutation.
 * Server-side field errors are applied inline via `applyServerErrors`.
 * Password visibility can be toggled via the eye button.
 *
 * Navigation after login happens here — the form reads the `from` destination
 * from router location state and redirects to it after a successful login.
 * The `useLogin` hook intentionally does not own navigation so it stays
 * generic and reusable.
 */
export function LoginForm() {
  const location = useLocation();
  const navigate = useNavigate();
  const from = (location.state as { from?: string } | null)?.from ?? "/";

  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const login = useLogin();

  const onSubmit = async (values: LoginFormValues) => {
    try {
      await login.mutateAsync(values);
      // Navigate to intended destination after successful login.
      // The hook has already populated Zustand and the query cache.
      navigate(from, { replace: true });
    } catch (error) {
      const { errors: serverErrors } = getApiError(error);
      if (serverErrors) {
        applyServerErrors(setError, serverErrors);
      }
    }
  };

  const isPending = isSubmitting || login.isPending;

  return (
    <motion.div
      variants={formVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={fieldVariants} className="space-y-1.5">
        <h2 className="text-2xl font-semibold tracking-tight">Sign in</h2>
        <p className="text-sm text-muted-foreground">
          Welcome back. Enter your credentials to continue.
        </p>
      </motion.div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {/* Email */}
        <motion.div variants={fieldVariants} className="space-y-1.5">
          <Label htmlFor="login-email">Email</Label>
          <Input
            id="login-email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            autoFocus
            disabled={isPending}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "login-email-error" : undefined}
            {...register("email")}
          />
          {errors.email && (
            <p
              id="login-email-error"
              role="alert"
              className="text-xs text-destructive"
            >
              {errors.email.message}
            </p>
          )}
        </motion.div>

        {/* Password */}
        <motion.div variants={fieldVariants} className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="login-password">Password</Label>
          </div>

          <div className="relative">
            <Input
              id="login-password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              autoComplete="current-password"
              disabled={isPending}
              className="pr-10"
              aria-invalid={!!errors.password}
              aria-describedby={
                errors.password ? "login-password-error" : undefined
              }
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>

          {errors.password && (
            <p
              id="login-password-error"
              role="alert"
              className="text-xs text-destructive"
            >
              {errors.password.message}
            </p>
          )}
        </motion.div>

        {/* Submit */}
        <motion.div variants={fieldVariants} className="pt-1">
          <Button
            type="submit"
            className="w-full"
            disabled={isPending}
            id="login-submit"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in…
              </>
            ) : (
              "Sign in"
            )}
          </Button>
        </motion.div>
      </form>

      {/* Footer */}
      <motion.p
        variants={fieldVariants}
        className="text-center text-sm text-muted-foreground"
      >
        Don&apos;t have an account?{" "}
        <Link
          to="/auth/register"
          className="font-medium text-foreground underline-offset-4 transition-colors hover:underline"
        >
          Create one
        </Link>
      </motion.p>
    </motion.div>
  );
}

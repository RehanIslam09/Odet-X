import { zodResolver } from "@hookform/resolvers/zod";
import { type Variants, motion } from "framer-motion";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRegister } from "@/features/auth/hooks";
import {
  registerSchema,
  type RegisterFormValues,
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
 * Registration form component.
 *
 * Integrates React Hook Form with Zod validation and the `useRegister` mutation.
 * Server-side field errors (e.g. duplicate email) are applied inline.
 * On success, the mutation navigates to `/auth/login` — registration
 * intentionally does not auto-login (matches backend design).
 */
export function RegisterForm() {
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const registerMutation = useRegister();

  const onSubmit = async (values: RegisterFormValues) => {
    try {
      await registerMutation.mutateAsync(values);
    } catch (error) {
      const { errors: serverErrors } = getApiError(error);
      if (serverErrors) {
        applyServerErrors(setError, serverErrors);
      }
    }
  };

  const isPending = isSubmitting || registerMutation.isPending;

  return (
    <motion.div
      variants={formVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={fieldVariants} className="space-y-1.5">
        <h2 className="text-2xl font-semibold tracking-tight">
          Create an account
        </h2>
        <p className="text-sm text-muted-foreground">
          Get started — it only takes a moment.
        </p>
      </motion.div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {/* Name */}
        <motion.div variants={fieldVariants} className="space-y-1.5">
          <Label htmlFor="register-name">Full name</Label>
          <Input
            id="register-name"
            type="text"
            placeholder="Jane Smith"
            autoComplete="name"
            autoFocus
            disabled={isPending}
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "register-name-error" : undefined}
            {...register("name")}
          />
          {errors.name && (
            <p
              id="register-name-error"
              role="alert"
              className="text-xs text-destructive"
            >
              {errors.name.message}
            </p>
          )}
        </motion.div>

        {/* Email */}
        <motion.div variants={fieldVariants} className="space-y-1.5">
          <Label htmlFor="register-email">Email</Label>
          <Input
            id="register-email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            disabled={isPending}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "register-email-error" : undefined}
            {...register("email")}
          />
          {errors.email && (
            <p
              id="register-email-error"
              role="alert"
              className="text-xs text-destructive"
            >
              {errors.email.message}
            </p>
          )}
        </motion.div>

        {/* Password */}
        <motion.div variants={fieldVariants} className="space-y-1.5">
          <Label htmlFor="register-password">Password</Label>
          <div className="relative">
            <Input
              id="register-password"
              type={showPassword ? "text" : "password"}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              disabled={isPending}
              className="pr-10"
              aria-invalid={!!errors.password}
              aria-describedby={
                errors.password ? "register-password-error" : undefined
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
              id="register-password-error"
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
            id="register-submit"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating account…
              </>
            ) : (
              "Create account"
            )}
          </Button>
        </motion.div>
      </form>

      {/* Footer */}
      <motion.p
        variants={fieldVariants}
        className="text-center text-sm text-muted-foreground"
      >
        Already have an account?{" "}
        <Link
          to="/auth/login"
          className="font-medium text-foreground underline-offset-4 transition-colors hover:underline"
        >
          Sign in
        </Link>
      </motion.p>
    </motion.div>
  );
}

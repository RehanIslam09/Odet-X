import type { FieldValues, Path, UseFormSetError } from "react-hook-form";

/**
 * Applies server-side validation errors to a React Hook Form instance.
 *
 * The backend returns a flat `errors` object from validation failures:
 * ```json
 * { "email": "Please enter a valid email address.", "password": "Required." }
 * ```
 *
 * This utility maps that shape to RHF's `setError` so field-level errors
 * appear inline without any duplicated error-mapping logic in each form.
 *
 * This function is generic over the form values type so TypeScript can
 * verify that the field paths match the form schema.
 *
 * @example
 * const { setError } = useForm<LoginFormValues>();
 * // In mutation onError:
 * if (errors) applyServerErrors(setError, errors);
 */
export function applyServerErrors<T extends FieldValues>(
  setError: UseFormSetError<T>,
  errors: Record<string, string>,
): void {
  for (const [field, message] of Object.entries(errors)) {
    setError(field as Path<T>, { type: "server", message });
  }
}

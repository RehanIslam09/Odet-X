import { useState, useEffect } from "react";

/**
 * Debounces a value by the specified delay.
 *
 * Returns the debounced value, which only updates after the user has
 * stopped changing the original value for `delay` milliseconds.
 *
 * Used to delay API calls triggered by rapid input changes (e.g. search).
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

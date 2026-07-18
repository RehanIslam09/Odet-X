import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { useUpdatePreferences } from "@/features/settings/hooks/useSettings";
import { useAuthStore } from "@/store/auth.store";

type ThemePreference = "light" | "dark" | "system";

export default function ThemeToggle() {
  const user = useAuthStore((s) => s.user);
  const { theme, resolvedTheme, setTheme } = useTheme();
  const updatePreferences = useUpdatePreferences();

  const handleToggle = () => {
    const nextTheme: ThemePreference = resolvedTheme === "dark" ? "light" : "dark";
    const previousTheme = (theme ?? "system") as ThemePreference;

    setTheme(nextTheme);

    if (!user) {
      return;
    }

    updatePreferences.mutate(
      {
        appearance: {
          ...user.preferences.appearance,
          theme: nextTheme,
        },
      },
      {
        onError: () => {
          setTheme(previousTheme);
        },
      },
    );
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleToggle}
      disabled={updatePreferences.isPending}
    >
      {resolvedTheme === "dark" ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </Button>
  );
}

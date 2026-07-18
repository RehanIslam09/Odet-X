import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTheme } from "next-themes";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";
import { useUpdatePreferences } from "../hooks/useSettings";
import { appearanceSchema, type AppearanceFormValues } from "../types/settings.types";
import { SettingsSection } from "./SettingsSection";

export function AppearanceSettings() {
  const user = useAuthStore((s) => s.user);
  const { theme, setTheme } = useTheme();
  const updatePreferences = useUpdatePreferences();

  const {
    control,
    handleSubmit,
    setValue,
    formState: { isDirty },
  } = useForm<AppearanceFormValues>({
    resolver: zodResolver(appearanceSchema),
    values: {
      theme: (user?.preferences?.appearance?.theme as "light" | "dark" | "system") || "system",
      density: user?.preferences?.appearance?.density || "comfortable",
    },
  });

  const watchedDensity = useWatch({ control, name: "density" });
  const selectedTheme = (theme || "system") as "light" | "dark" | "system";

  const onSubmit = (values: AppearanceFormValues) => {
    updatePreferences.mutate({
      appearance: {
        theme: selectedTheme,
        density: values.density,
      },
    });
  };

  const handleThemeChange = (newTheme: "light" | "dark" | "system") => {
    const previousTheme = selectedTheme;

    setTheme(newTheme);

    if (!user) {
      setValue("theme", newTheme, { shouldDirty: false });
      return;
    }

    updatePreferences.mutate(
      {
        appearance: {
          ...user.preferences.appearance,
          theme: newTheme,
          density: watchedDensity,
        },
      },
      {
        onError: () => {
          setTheme(previousTheme);
        },
      },
    );
  };

  const isPending = updatePreferences.isPending;

  return (
    <SettingsSection
      id="appearance"
      title="Appearance"
      description="Customize the look and feel of the project manager interface."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-xl">
        {/* Theme Selector */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Interface Theme</Label>
          <div className="grid grid-cols-3 gap-4">
            {/* Light Theme Card */}
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleThemeChange("light")}
              className={cn(
                "flex flex-col items-center gap-2 rounded-lg border-2 p-2 hover:bg-accent/40 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                selectedTheme === "light"
                  ? "border-primary bg-accent/20"
                  : "border-border/40 bg-background"
              )}
            >
              {/* Preview Window Graphic */}
              <div className="w-full aspect-[4/3] rounded-md bg-zinc-100 border p-1.5 space-y-1.5 overflow-hidden">
                <div className="flex items-center gap-1 border-b pb-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-zinc-300" />
                  <div className="h-1.5 w-8 rounded bg-zinc-200" />
                </div>
                <div className="flex gap-1.5 h-full">
                  <div className="w-1/4 rounded bg-zinc-200/80 h-3/4" />
                  <div className="flex-1 space-y-1">
                    <div className="h-2 w-3/4 rounded bg-zinc-200" />
                    <div className="h-1.5 w-full rounded bg-zinc-150" />
                  </div>
                </div>
              </div>
              <span className="text-xs font-medium">Light</span>
            </button>

            {/* Dark Theme Card */}
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleThemeChange("dark")}
              className={cn(
                "flex flex-col items-center gap-2 rounded-lg border-2 p-2 hover:bg-accent/40 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                selectedTheme === "dark"
                  ? "border-primary bg-accent/20"
                  : "border-border/40 bg-background"
              )}
            >
              {/* Preview Window Graphic */}
              <div className="w-full aspect-[4/3] rounded-md bg-zinc-950 border border-zinc-800 p-1.5 space-y-1.5 overflow-hidden">
                <div className="flex items-center gap-1 border-b border-zinc-800 pb-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-zinc-800" />
                  <div className="h-1.5 w-8 rounded bg-zinc-800" />
                </div>
                <div className="flex gap-1.5 h-full">
                  <div className="w-1/4 rounded bg-zinc-900 h-3/4" />
                  <div className="flex-1 space-y-1">
                    <div className="h-2 w-3/4 rounded bg-zinc-800" />
                    <div className="h-1.5 w-full rounded bg-zinc-900" />
                  </div>
                </div>
              </div>
              <span className="text-xs font-medium">Dark</span>
            </button>

            {/* System Theme Card */}
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleThemeChange("system")}
              className={cn(
                "flex flex-col items-center gap-2 rounded-lg border-2 p-2 hover:bg-accent/40 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                selectedTheme === "system"
                  ? "border-primary bg-accent/20"
                  : "border-border/40 bg-background"
              )}
            >
              {/* Preview Window Graphic */}
              <div className="w-full aspect-[4/3] rounded-md bg-zinc-100 border p-1.5 space-y-1.5 overflow-hidden relative">
                {/* Dark side clip */}
                <div className="absolute inset-0 left-1/2 bg-zinc-950 border-l border-zinc-850 p-1.5 pt-1.5 pl-[6px] space-y-1.5 overflow-hidden">
                  <div className="flex items-center gap-1 border-b border-zinc-800 pb-1 opacity-0">
                    <div className="h-1.5 w-1.5 rounded-full bg-zinc-800" />
                  </div>
                  <div className="flex gap-1.5 h-full">
                    <div className="flex-1 space-y-1">
                      <div className="h-2 w-full rounded bg-zinc-800" />
                      <div className="h-1.5 w-full rounded bg-zinc-900" />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 border-b pb-1 relative z-10">
                  <div className="h-1.5 w-1.5 rounded-full bg-zinc-300" />
                  <div className="h-1.5 w-8 rounded bg-zinc-200" />
                </div>
                <div className="flex gap-1.5 h-full relative z-10">
                  <div className="w-1/4 rounded bg-zinc-200/80 h-3/4" />
                  <div className="flex-1 space-y-1">
                    <div className="h-2 w-1/2 rounded bg-zinc-200" />
                    <div className="h-1.5 w-full rounded bg-zinc-150" />
                  </div>
                </div>
              </div>
              <span className="text-xs font-medium">System</span>
            </button>
          </div>
        </div>

        {/* Density Selector (Disabled) */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Label htmlFor="appearance-density">Display Density</Label>
            <Badge variant="secondary" className="text-[10px] uppercase tracking-wider font-semibold py-0.5">
              Coming Soon
            </Badge>
          </div>
          <Controller
            name="density"
            control={control}
            render={({ field }) => (
              <Select
                onValueChange={field.onChange}
                value={field.value}
                disabled
              >
                <SelectTrigger id="appearance-density" className="w-full opacity-60">
                  <SelectValue placeholder="Select density" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="comfortable">Comfortable (Default)</SelectItem>
                  <SelectItem value="compact">Compact</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          <p className="text-xs text-muted-foreground">
            Compact mode reduces padding and font sizes to fit more information.
          </p>
        </div>

        {/* Submit */}
        <div className="pt-2">
          <Button type="submit" disabled={isPending || !isDirty} className="w-full sm:w-auto">
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving settings...
              </>
            ) : (
              "Save Settings"
            )}
          </Button>
        </div>
      </form>
    </SettingsSection>
  );
}

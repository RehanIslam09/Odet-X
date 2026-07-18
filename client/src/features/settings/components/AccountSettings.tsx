import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuthStore } from "@/store/auth.store";
import { useUpdatePreferences } from "../hooks/useSettings";
import { accountSchema, type AccountFormValues } from "../types/settings.types";
import { SettingsSection } from "./SettingsSection";

export function AccountSettings() {
  const user = useAuthStore((s) => s.user);
  const updatePreferences = useUpdatePreferences();

  const {
    control,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    values: {
      timezone: user?.preferences?.locale?.timezone || "Asia/Kolkata",
      language: user?.preferences?.locale?.language || "en",
      dateFormat: user?.preferences?.locale?.dateFormat || "DD/MM/YYYY",
    },
  });

  const onSubmit = (values: AccountFormValues) => {
    updatePreferences.mutate({
      locale: {
        timezone: values.timezone,
        language: values.language,
        dateFormat: values.dateFormat,
      },
    });
  };

  const isPending = updatePreferences.isPending;

  return (
    <SettingsSection
      id="account"
      title="Account Settings"
      description="Update your locale, timezone, and date format preferences."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-xl">
        {/* Email Address (Read-only) */}
        <div className="space-y-1.5">
          <Label htmlFor="account-email">Email Address</Label>
          <Input
            id="account-email"
            type="email"
            value={user?.email || ""}
            disabled
            className="bg-muted text-muted-foreground cursor-not-allowed"
          />
          <p className="text-xs text-muted-foreground">
            Contact support to change your email address.
          </p>
        </div>

        {/* Timezone Select */}
        <div className="space-y-1.5">
          <Label htmlFor="account-timezone">Timezone</Label>
          <Controller
            name="timezone"
            control={control}
            render={({ field }) => (
              <Select
                onValueChange={field.onChange}
                value={field.value}
                disabled={isPending}
              >
                <SelectTrigger id="account-timezone" className="w-full">
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UTC">UTC (Coordinated Universal Time)</SelectItem>
                  <SelectItem value="America/New_York">America/New_York (EST/EDT)</SelectItem>
                  <SelectItem value="Europe/London">Europe/London (GMT/BST)</SelectItem>
                  <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST)</SelectItem>
                  <SelectItem value="Asia/Tokyo">Asia/Tokyo (JST)</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {errors.timezone && (
            <p className="text-xs text-destructive">{errors.timezone.message}</p>
          )}
        </div>

        {/* Language Select */}
        <div className="space-y-1.5">
          <Label htmlFor="account-language">Language</Label>
          <Controller
            name="language"
            control={control}
            render={({ field }) => (
              <Select
                onValueChange={field.onChange}
                value={field.value}
                disabled={isPending}
              >
                <SelectTrigger id="account-language" className="w-full">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English (US)</SelectItem>
                  <SelectItem value="es">Español (Spanish)</SelectItem>
                  <SelectItem value="fr">Français (French)</SelectItem>
                  <SelectItem value="de">Deutsch (German)</SelectItem>
                  <SelectItem value="ja">日本語 (Japanese)</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {errors.language && (
            <p className="text-xs text-destructive">{errors.language.message}</p>
          )}
        </div>

        {/* Date Format Select */}
        <div className="space-y-1.5">
          <Label htmlFor="account-date-format">Date Format</Label>
          <Controller
            name="dateFormat"
            control={control}
            render={({ field }) => (
              <Select
                onValueChange={field.onChange}
                value={field.value}
                disabled={isPending}
              >
                <SelectTrigger id="account-date-format" className="w-full">
                  <SelectValue placeholder="Select date format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MM/DD/YYYY">MM/DD/YYYY (12/31/2026)</SelectItem>
                  <SelectItem value="DD/MM/YYYY">DD/MM/YYYY (31/12/2026)</SelectItem>
                  <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (2026-12-31)</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {errors.dateFormat && (
            <p className="text-xs text-destructive">{errors.dateFormat.message}</p>
          )}
        </div>

        {/* Submit */}
        <div className="pt-2">
          <Button type="submit" disabled={isPending || !isDirty} className="w-full sm:w-auto">
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving preferences...
              </>
            ) : (
              "Save Preferences"
            )}
          </Button>
        </div>
      </form>
    </SettingsSection>
  );
}

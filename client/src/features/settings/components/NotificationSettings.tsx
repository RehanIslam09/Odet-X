import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/store/auth.store";
import { useUpdatePreferences } from "../hooks/useSettings";
import { notificationsSchema, type NotificationsFormValues } from "../types/settings.types";
import { SettingsSection } from "./SettingsSection";

export function NotificationSettings() {
  const user = useAuthStore((s) => s.user);
  const updatePreferences = useUpdatePreferences();

  const {
    control,
    handleSubmit,
    formState: { isDirty },
  } = useForm<NotificationsFormValues>({
    resolver: zodResolver(notificationsSchema),
    values: {
      emailNotifications: user?.preferences?.notifications?.emailNotifications ?? true,
      desktopNotifications: user?.preferences?.notifications?.desktopNotifications ?? false,
      weeklyAiSummary: user?.preferences?.notifications?.weeklyAiSummary ?? true,
      projectActivity: user?.preferences?.notifications?.projectActivity ?? true,
      taskReminders: user?.preferences?.notifications?.taskReminders ?? true,
    },
  });

  const onSubmit = (values: NotificationsFormValues) => {
    updatePreferences.mutate({
      notifications: values,
    });
  };

  const isPending = updatePreferences.isPending;

  return (
    <SettingsSection
      id="notifications"
      title="Notifications"
      description="Select how and when you want to receive project and task notifications."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-xl">
        <div className="space-y-4">
          {/* Email Notifications */}
          <div className="flex items-start justify-between rounded-lg border p-4 bg-background shadow-sm">
            <div className="space-y-0.5 max-w-[80%]">
              <Label htmlFor="notif-email" className="text-sm font-medium">
                Email Notifications
              </Label>
              <p className="text-xs text-muted-foreground leading-normal">
                Receive emails for important actions, mentions, and updates.
              </p>
            </div>
            <Controller
              name="emailNotifications"
              control={control}
              render={({ field }) => (
                <Switch
                  id="notif-email"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isPending}
                />
              )}
            />
          </div>

          {/* Desktop Notifications */}
          <div className="flex items-start justify-between rounded-lg border p-4 bg-background shadow-sm">
            <div className="space-y-0.5 max-w-[80%]">
              <Label htmlFor="notif-desktop" className="text-sm font-medium">
                Desktop Notifications
              </Label>
              <p className="text-xs text-muted-foreground leading-normal">
                Receive browser push notifications when you are actively using the application.
              </p>
            </div>
            <Controller
              name="desktopNotifications"
              control={control}
              render={({ field }) => (
                <Switch
                  id="notif-desktop"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isPending}
                />
              )}
            />
          </div>

          {/* Weekly AI Summary */}
          <div className="flex items-start justify-between rounded-lg border p-4 bg-background shadow-sm">
            <div className="space-y-0.5 max-w-[80%]">
              <Label htmlFor="notif-ai-summary" className="text-sm font-medium">
                Weekly AI Summary
              </Label>
              <p className="text-xs text-muted-foreground leading-normal">
                Receive an AI-generated weekly email summarizing project progress, completed milestones, and roadblocks.
              </p>
            </div>
            <Controller
              name="weeklyAiSummary"
              control={control}
              render={({ field }) => (
                <Switch
                  id="notif-ai-summary"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isPending}
                />
              )}
            />
          </div>

          {/* Project Activity */}
          <div className="flex items-start justify-between rounded-lg border p-4 bg-background shadow-sm">
            <div className="space-y-0.5 max-w-[80%]">
              <Label htmlFor="notif-project" className="text-sm font-medium">
                Project Activity
              </Label>
              <p className="text-xs text-muted-foreground leading-normal">
                Get notified when projects are created, updated, completed, or archived.
              </p>
            </div>
            <Controller
              name="projectActivity"
              control={control}
              render={({ field }) => (
                <Switch
                  id="notif-project"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isPending}
                />
              )}
            />
          </div>

          {/* Task Reminders */}
          <div className="flex items-start justify-between rounded-lg border p-4 bg-background shadow-sm">
            <div className="space-y-0.5 max-w-[80%]">
              <Label htmlFor="notif-tasks" className="text-sm font-medium">
                Task Reminders
              </Label>
              <p className="text-xs text-muted-foreground leading-normal">
                Receive notifications when tasks are assigned to you, updated, or reaching their due dates.
              </p>
            </div>
            <Controller
              name="taskReminders"
              control={control}
              render={({ field }) => (
                <Switch
                  id="notif-tasks"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isPending}
                />
              )}
            />
          </div>
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

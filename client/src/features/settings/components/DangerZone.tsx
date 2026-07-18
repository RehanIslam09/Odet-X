import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SettingsSection } from "./SettingsSection";

export function DangerZone() {
  return (
    <SettingsSection
      id="danger-zone"
      title="Danger Zone"
      description="Permanently delete your account and all associated workspace data."
      destructive
    >
      <div className="space-y-4 max-w-xl">
        <div className="flex items-start gap-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-3.5">
          <AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-medium">Permanency warning</p>
            <p className="text-xs text-destructive/90 leading-normal">
              Once you delete your account, there is no going back. All of your personal profile, projects, tasks, comments, and workspace preferences will be deleted immediately.
            </p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground leading-normal">
          Account deletion is currently unavailable in the frontend mockup version. This feature will be connected to the destructive backend endpoint in a future deployment.
        </p>

        <div className="pt-2">
          <Button variant="destructive" disabled className="w-full sm:w-auto">
            Delete Account
          </Button>
        </div>
      </div>
    </SettingsSection>
  );
}

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2, ShieldAlert, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { changePasswordSchema, type ChangePasswordFormValues } from "../types/settings.types";
import { useChangePassword } from "../hooks/useSettings";
import { SettingsSection } from "./SettingsSection";

export function SecuritySettings() {
  const [isOpen, setIsOpen] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const changePassword = useChangePassword();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = (values: ChangePasswordFormValues) => {
    changePassword.mutate(values, {
      onSuccess: () => {
        setIsOpen(false);
        reset();
      },
    });
  };

  const isPending = changePassword.isPending;

  return (
    <SettingsSection
      id="security"
      title="Security"
      description="Manage your account password, authentication settings, and active sessions."
    >
      <div className="space-y-6 max-w-xl">
        {/* Password Reset Section */}
        <div className="flex flex-col gap-2 rounded-lg border p-4 bg-background shadow-sm">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold">Password</Label>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-1">
            <div className="space-y-1">
              <p className="text-sm font-mono tracking-widest text-muted-foreground">
                ••••••••
              </p>
              <p className="text-xs text-muted-foreground">
                Update your account password regularly to keep it secure.
              </p>
            </div>
            
            <Dialog open={isOpen} onOpenChange={(open) => {
              setIsOpen(open);
              if (!open) reset();
            }}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  Change Password
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <DialogHeader>
                    <DialogTitle>Change Password</DialogTitle>
                    <DialogDescription>
                      Update your account password. Changing your password will log you out from all other devices.
                    </DialogDescription>
                  </DialogHeader>

                  {/* Current Password */}
                  <div className="space-y-1.5">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        type={showCurrentPassword ? "text" : "password"}
                        placeholder="••••••••"
                        disabled={isPending}
                        className="pr-10"
                        aria-invalid={!!errors.currentPassword}
                        {...register("currentPassword")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                      >
                        {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.currentPassword && (
                      <p className="text-xs text-destructive">{errors.currentPassword.message}</p>
                    )}
                  </div>

                  {/* New Password */}
                  <div className="space-y-1.5">
                    <Label htmlFor="newPassword">New Password</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        placeholder="••••••••"
                        disabled={isPending}
                        className="pr-10"
                        aria-invalid={!!errors.newPassword}
                        {...register("newPassword")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.newPassword && (
                      <p className="text-xs text-destructive">{errors.newPassword.message}</p>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-1.5">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="••••••••"
                        disabled={isPending}
                        className="pr-10"
                        aria-invalid={!!errors.confirmPassword}
                        {...register("confirmPassword")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
                    )}
                  </div>

                  <DialogFooter className="pt-4">
                    <Button type="button" variant="ghost" onClick={() => setIsOpen(false)} disabled={isPending}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isPending}>
                      {isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        "Update Password"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* 2FA Section */}
        <div className="flex flex-col gap-2 rounded-lg border p-4 bg-background shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-semibold">Two-Factor Authentication (2FA)</Label>
            </div>
            <Badge variant="secondary" className="text-[10px] uppercase tracking-wider font-semibold py-0.5">
              Coming Soon
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground leading-normal mt-1">
            Add an extra layer of security to your account by requiring more than just a password to log in.
          </p>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex h-7 items-center justify-center rounded-full bg-muted px-2.5 text-xs text-muted-foreground gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>Not Configured</span>
            </div>
            <Button variant="outline" size="sm" disabled className="ml-auto">
              Enable 2FA
            </Button>
          </div>
        </div>

        {/* Active Sessions Section */}
        <div className="flex flex-col gap-2 rounded-lg border p-4 bg-background shadow-sm">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold">Active Sessions</Label>
            <Badge variant="secondary" className="text-[10px] uppercase tracking-wider font-semibold py-0.5">
              Coming Soon
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground leading-normal mt-1">
            View and manage active browser sessions on other devices.
          </p>
          <div className="mt-2 space-y-3">
            <div className="flex items-center gap-3 text-xs border-t pt-3">
              <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-foreground">
                  Chrome on Windows (Current Session)
                </p>
                <p className="text-muted-foreground">
                  Mumbai, India • IP: 192.168.1.1
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" disabled className="w-full text-xs hover:bg-muted text-muted-foreground mt-1">
              Sign Out of All Other Devices
            </Button>
          </div>
        </div>
      </div>
    </SettingsSection>
  );
}

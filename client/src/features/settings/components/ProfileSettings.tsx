import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/auth.store";
import { useUpdateProfile } from "../hooks/useSettings";
import { profileSchema, type ProfileFormValues } from "../types/settings.types";
import { SettingsSection } from "./SettingsSection";

export function ProfileSettings() {
  const user = useAuthStore((s) => s.user);
  const updateProfile = useUpdateProfile();

  // Derive default initials for avatar
  const initials = user?.name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() ?? "?";

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    values: {
      name: user?.name || "",
      username: user?.username || "",
      bio: user?.bio || "",
    },
  });

  const onSubmit = (values: ProfileFormValues) => {
    updateProfile.mutate(values);
  };

  const isPending = updateProfile.isPending;

  return (
    <SettingsSection
      id="profile"
      title="Profile"
      description="Manage your public profile settings and how other members see you."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-xl">
        {/* Avatar Area */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Avatar className="h-16 w-16 border">
            {user?.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
            <AvatarFallback className="text-lg font-semibold bg-muted text-muted-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col items-start gap-1">
            <span className="text-sm font-medium">Profile Photo</span>
            <span className="text-xs text-muted-foreground mb-1.5">
              PNG, JPG or GIF. Max 2MB.
            </span>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" disabled>
                Change Photo
              </Button>
              <Badge variant="secondary" className="text-[10px] uppercase tracking-wider font-semibold py-0.5">
                Coming Soon
              </Badge>
            </div>
          </div>
        </div>

        {/* Full Name */}
        <div className="space-y-1.5">
          <Label htmlFor="profile-name">Full Name</Label>
          <Input
            id="profile-name"
            placeholder="John Doe"
            disabled={isPending}
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "profile-name-error" : undefined}
            {...register("name")}
          />
          {errors.name && (
            <p id="profile-name-error" role="alert" className="text-xs text-destructive">
              {errors.name.message}
            </p>
          )}
        </div>

        {/* Username */}
        <div className="space-y-1.5">
          <Label htmlFor="profile-username">Username</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground select-none">
              @
            </span>
            <Input
              id="profile-username"
              className="pl-7"
              placeholder="username"
              disabled={isPending}
              aria-invalid={!!errors.username}
              aria-describedby={errors.username ? "profile-username-error" : undefined}
              {...register("username")}
            />
          </div>
          {errors.username && (
            <p id="profile-username-error" role="alert" className="text-xs text-destructive">
              {errors.username.message}
            </p>
          )}
        </div>

        {/* Bio */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <Label htmlFor="profile-bio">Bio</Label>
            <span className="text-xs text-muted-foreground">Max 160 characters</span>
          </div>
          <Textarea
            id="profile-bio"
            placeholder="Write a short bio about yourself..."
            className="resize-none min-h-[90px]"
            disabled={isPending}
            aria-invalid={!!errors.bio}
            aria-describedby={errors.bio ? "profile-bio-error" : undefined}
            {...register("bio")}
          />
          {errors.bio && (
            <p id="profile-bio-error" role="alert" className="text-xs text-destructive">
              {errors.bio.message}
            </p>
          )}
        </div>

        {/* Submit */}
        <div className="pt-2">
          <Button type="submit" disabled={isPending || !isDirty} className="w-full sm:w-auto">
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving changes...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </form>
    </SettingsSection>
  );
}

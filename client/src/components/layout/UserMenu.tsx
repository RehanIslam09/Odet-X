import { ChevronDown, LogOut, Settings, User } from "lucide-react";
import { Loader2 } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLogout } from "@/features/auth/hooks";
import { useAuthStore } from "@/store/auth.store";

/**
 * User dropdown menu in the dashboard navbar.
 *
 * Reads the current user from Zustand (synchronous, no network call).
 * The user is guaranteed to be non-null here because `UserMenu` is only
 * rendered inside `DashboardLayout`, which is wrapped by `ProtectedRoute`.
 *
 * The logout button calls `useLogout` which:
 * - Calls POST /auth/logout (server clears the refresh token cookie)
 * - Clears the in-memory access token
 * - Clears Zustand
 * - Clears the React Query cache
 * - Navigates to /auth/login
 */
export default function UserMenu() {
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();

  // Derive initials for the avatar fallback
  const initials = user?.name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() ?? "?";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-10 gap-2 px-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col gap-0.5">
            <span className="font-medium">{user?.name ?? "—"}</span>
            <span className="text-xs font-normal text-muted-foreground">
              {user?.email ?? "—"}
            </span>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem>
          <User className="mr-2 h-4 w-4" />
          Profile
        </DropdownMenuItem>

        <DropdownMenuItem>
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
          className="text-destructive focus:text-destructive"
        >
          {logout.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="mr-2 h-4 w-4" />
          )}
          {logout.isPending ? "Signing out…" : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
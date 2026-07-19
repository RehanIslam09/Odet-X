import {
  MobileSidebar,
  ThemeToggle,
  UserMenu,
} from "@/components/layout";
import { NotificationBell } from "@/features/notifications/components/NotificationBell";

export default function DashboardNavbar() {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-6">
      <div className="flex items-center gap-3">
        <MobileSidebar />

        <h1 className="text-xl font-semibold">
          AI Project Manager
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <NotificationBell />
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
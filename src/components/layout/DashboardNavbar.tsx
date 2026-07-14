import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import { ThemeToggle } from "@/components/layout";

export default function DashboardNavbar() {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-6">
      <h1 className="text-xl font-semibold">
        AI Project Manager
      </h1>

      <div className="flex items-center gap-3">
        <ThemeToggle />

        <Avatar>
          <AvatarFallback>R</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
import { SidebarItem } from "@/components/layout";

import { navigation } from "@/config/navigation";

export default function DashboardSidebar() {
  return (
    <>
      <div className="border-b px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary font-bold text-primary-foreground shadow-sm">
            AI
          </div>

          <div className="flex flex-col">
            <h2 className="text-sm font-semibold tracking-tight">
              AI Project Manager
            </h2>

            <p className="text-xs text-muted-foreground">
              Workspace
            </p>
          </div>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-4">
        {navigation.map((item) => (
          <SidebarItem
            key={item.href}
            item={item}
          />
        ))}
      </nav>
    </>
  );
}
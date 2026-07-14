import SidebarItem from "@/components/layout/SidebarItem";

import { navigation } from "@/config/navigation";

export default function DashboardSidebar() {
  return (
    <aside className="w-64 border-r">
      <nav className="flex flex-col gap-2 p-4">
        {navigation.map((item) => (
          <SidebarItem
            key={item.href}
            item={item}
          />
        ))}
      </nav>
    </aside>
  );
}
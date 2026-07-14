import { SidebarItem } from "@/components/layout";
import { navigation } from "@/config/navigation";

export default function DashboardSidebar() {
  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-background">
      <div className="border-b px-6 py-5">
        <h2 className="text-lg font-bold">AI PM</h2>
      </div>

      <nav className="flex flex-1 flex-col gap-2 p-4">
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
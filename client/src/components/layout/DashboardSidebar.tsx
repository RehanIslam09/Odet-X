import { SidebarItem } from "@/components/layout";
import { navigation } from "@/config/navigation";
import { WorkspaceSwitcher } from "@/features/workspaces/components/WorkspaceSwitcher";
import { useActiveWorkspace } from "@/features/workspaces/context/WorkspaceContext";

export default function DashboardSidebar() {
  const { currentWorkspace } = useActiveWorkspace();
  const slug = currentWorkspace?.slug || "personal";

  return (
    <>
      <div className="border-b px-4 py-4">
        <div className="mb-3 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground shadow-sm">
            AI
          </div>
          <div className="flex flex-col">
            <h2 className="text-xs font-semibold tracking-tight">
              AI Project Manager
            </h2>
          </div>
        </div>

        <WorkspaceSwitcher />
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-4">
        {navigation.map((item) => {
          // Resolve workspace-slug aware navigation href
          const href =
            item.href === "/"
              ? `/w/${slug}/dashboard`
              : `/w/${slug}${item.href}`;

          return (
            <SidebarItem
              key={item.href}
              item={{ ...item, href }}
            />
          );
        })}
      </nav>
    </>
  );
}
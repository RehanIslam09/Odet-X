import { NavLink } from "react-router-dom";

import type { NavigationItem } from "@/types/navigation";

import { Button } from "@/components/ui/button"

interface SidebarItemProps {
  item: NavigationItem;
}

export default function SidebarItem({ item }: SidebarItemProps) {
  const Icon = item.icon;

  return (
    <NavLink to={item.href}>
      {({ isActive }) => (
        <Button
          variant={isActive ? "secondary" : "ghost"}
          className="w-full justify-start gap-3"
          disabled={item.disabled}
        >
          <Icon className="h-5 w-5" />

          <span>{item.title}</span>
        </Button>
      )}
    </NavLink>
  );
}
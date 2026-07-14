import {
  FolderKanban,
  Home,
  Settings,
  SquareCheckBig,
} from "lucide-react";

import type { NavigationItem } from "@/types/navigation";

export const navigation: NavigationItem[] = [
  {
    title: "Dashboard",
    href: "/",
    icon: Home,
  },
  {
    title: "Projects",
    href: "/projects",
    icon: FolderKanban,
  },
  {
    title: "Tasks",
    href: "/tasks",
    icon: SquareCheckBig,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
  },
];
/**
 * Canonical Default Command Catalog
 * Phase 31 — Global Search & Command Palette
 * WP-04 — Command Registry & Execution Architecture
 */

import type { CommandDefinition } from "../types/command.types.js";

export const defaultCommands: readonly CommandDefinition[] = [
  // Navigation Commands (CLASS A)
  {
    id: "navigation.dashboard",
    label: "Go to Dashboard",
    description: "Navigate to your main AI workspace dashboard",
    keywords: ["home", "dashboard", "main", "overview"],
    group: "Navigation",
    safetyClass: "navigation",
    targetRoute: "/",
    iconKey: "LayoutDashboard",
  },
  {
    id: "navigation.projects",
    label: "Go to Projects",
    description: "View and manage all active workspace projects",
    keywords: ["projects", "workspaces", "list"],
    group: "Navigation",
    safetyClass: "navigation",
    targetRoute: "/projects",
    iconKey: "Folder",
  },
  {
    id: "navigation.tasks",
    label: "Go to Tasks",
    description: "View and manage all tasks across projects",
    keywords: ["tasks", "todo", "board", "list"],
    group: "Navigation",
    safetyClass: "navigation",
    targetRoute: "/tasks",
    iconKey: "CheckSquare",
  },
  {
    id: "navigation.activities",
    label: "Go to Activity Log",
    description: "Review recent workspace activities and system logs",
    keywords: ["activity", "log", "audit", "history"],
    group: "Navigation",
    safetyClass: "navigation",
    targetRoute: "/activities",
    iconKey: "Activity",
  },
  {
    id: "navigation.notifications",
    label: "Go to Notifications",
    description: "Check your workspace notifications and alerts",
    keywords: ["notifications", "alerts", "inbox", "unread"],
    group: "Navigation",
    safetyClass: "navigation",
    targetRoute: "/notifications",
    iconKey: "Bell",
  },
  {
    id: "navigation.settings",
    label: "Go to Settings",
    description: "Manage profile, account, appearance, and security settings",
    keywords: ["settings", "profile", "account", "preferences", "appearance"],
    group: "Navigation",
    safetyClass: "navigation",
    targetRoute: "/settings/profile",
    iconKey: "Settings",
  },

  // UI Launcher Commands (CLASS B)
  {
    id: "launcher.create-project",
    label: "Create Project",
    description: "Open the dialog to create a new project",
    keywords: ["create", "new", "project", "add"],
    group: "Actions",
    safetyClass: "ui-launcher",
    launcherKey: "create-project",
    shortcut: "c p",
    iconKey: "FolderPlus",
  },
  {
    id: "launcher.create-task",
    label: "Create Task",
    description: "Open the dialog to create a new task",
    keywords: ["create", "new", "task", "add", "todo"],
    group: "Actions",
    safetyClass: "ui-launcher",
    launcherKey: "create-task",
    shortcut: "c t",
    iconKey: "PlusSquare",
  },
];

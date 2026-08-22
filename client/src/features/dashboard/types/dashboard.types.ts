import type { LucideIcon } from "lucide-react";

export interface BriefInsight {
  id: string;
  icon: LucideIcon;
  label: string;
  description: string;
}

import type { TaskPriority, TaskStatus } from "@/features/tasks/types/tasks.types";

export interface DashboardProjectSummary {
  active: number;
  archived: number;
}

export interface DashboardTaskSummary {
  totalActive: number;
  completed: number;
  inProgress: number;
  cancelled: number;
  overdue: number;
  dueSoon: number;
  completionPercentage: number;
}

export interface DashboardHealthSummary {
  score: number;
  status: string;
  overdueCount: number;
  completionRate: number;
}

export interface DashboardAnalyticsSummary {
  momentum: "INCREASING" | "STABLE" | "DECLINING";
  activeStreak: number;
  thisWeekActivityCount: number;
  lastWeekActivityCount: number;
  dailyTrend: Array<{ date: string; label: string; count: number }>;
}

export interface DashboardSummary {
  projects: DashboardProjectSummary;
  tasks: DashboardTaskSummary;
  health?: DashboardHealthSummary;
  analytics?: DashboardAnalyticsSummary;
}

export interface DashboardRecentProject {
  project: {
    id: string;
    name: string;
    emoji: string;
    color: string;
    updatedAt: string;
  };
  progress: {
    total: number;
    completed: number;
    completionPercentage: number;
  };
}

export interface DashboardAttentionTask {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  projectId: string | null;
}

export interface DashboardOverview {
  summary: DashboardSummary;
  recentProjects: DashboardRecentProject[];
  attentionTasks: DashboardAttentionTask[];
}
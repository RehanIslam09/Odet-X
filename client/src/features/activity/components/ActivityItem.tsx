import { formatDistanceToNow } from "date-fns";
import {
  Archive,
  CheckCircle2,
  Clock,
  Edit2,
  FolderGit2,
  FolderPlus,
  History,
  Plus,
  RefreshCcw,
  Trash2,
} from "lucide-react";
import type { Activity } from "../types/activity.types";
import { getActivityDescription } from "../utils/activity.utils";

interface ActivityItemProps {
  activity: Activity;
  isLast?: boolean;
}

function getActivityIcon(type: string) {
  switch (type) {
    case "project.created":
      return <FolderPlus className="h-4 w-4" />;
    case "project.updated":
      return <Edit2 className="h-4 w-4" />;
    case "project.archived":
      return <Archive className="h-4 w-4" />;
    case "project.restored":
      return <RefreshCcw className="h-4 w-4" />;
    case "project.deleted":
      return <Trash2 className="h-4 w-4" />;

    case "task.created":
      return <Plus className="h-4 w-4" />;
    case "task.updated":
      return <Edit2 className="h-4 w-4" />;
    case "task.status_changed":
      return <CheckCircle2 className="h-4 w-4" />;
    case "task.priority_changed":
      return <Clock className="h-4 w-4" />;
    case "task.project_changed":
      return <FolderGit2 className="h-4 w-4" />;
    case "task.archived":
      return <Archive className="h-4 w-4" />;
    case "task.restored":
      return <RefreshCcw className="h-4 w-4" />;
    case "task.deleted":
      return <Trash2 className="h-4 w-4" />;
    default:
      return <History className="h-4 w-4" />;
  }
}

export function ActivityItem({ activity, isLast }: ActivityItemProps) {
  const description = getActivityDescription(activity);
  const icon = getActivityIcon(activity.type);
  const timestamp = formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true });
  const fullDate = new Date(activity.createdAt).toLocaleString();

  return (
    <div className="flex gap-4">
      <div className="relative flex flex-col items-center">
        <div className="z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-sm">
          {icon}
        </div>
        {!isLast && <div className="absolute top-8 bottom-0 w-px -mb-6 bg-border" />}
      </div>
      <div className="flex flex-1 flex-col gap-1 pt-1.5 pb-2">
        <p className="text-sm text-foreground">
          {description}
        </p>
        <span className="text-xs text-muted-foreground" title={fullDate}>
          {timestamp}
        </span>
      </div>
    </div>
  );
}

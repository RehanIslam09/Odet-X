import { formatDistanceToNow } from "date-fns";
import {
  Archive,
  CheckCircle2,
  Clock,
  Crown,
  Edit2,
  FolderGit2,
  FolderPlus,
  History,
  Plus,
  RefreshCcw,
  Sparkles,
  Trash2,
  UserCheck,
  UserCog,
  UserMinus,
  UserPlus,
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

    case "member.invited":
      return <UserPlus className="h-4 w-4 text-sky-500" />;
    case "member.added":
    case "member.joined":
      return <UserCheck className="h-4 w-4 text-emerald-500" />;
    case "member.removed":
      return <UserMinus className="h-4 w-4 text-rose-500" />;
    case "member.role_changed":
      return <UserCog className="h-4 w-4 text-amber-500" />;
    case "workspace.owner_transferred":
    case "workspace.ownerTransferred":
      return <Crown className="h-4 w-4 text-amber-500" />;

    case "ai.plan_committed":
    case "plan.committed":
    case "ai.tasks_generated":
    case "ai.summary_generated":
    case "ai.labels_generated":
      return <Sparkles className="h-4 w-4 text-purple-500" />;

    default:
      return <History className="h-4 w-4" />;
  }
}

export function ActivityItem({ activity, isLast }: ActivityItemProps) {
  const description = getActivityDescription(activity);
  const icon = getActivityIcon(activity.type);
  const timestamp = formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true });
  const fullDate = new Date(activity.createdAt).toLocaleString();
  const actorName =
    typeof activity.actorId === "object" && activity.actorId !== null
      ? (activity.actorId as { name?: string }).name
      : undefined;

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
          {actorName && <span className="font-semibold text-foreground mr-1">{actorName}</span>}
          {description}
        </p>
        <span className="text-xs text-muted-foreground" title={fullDate}>
          {timestamp}
        </span>
      </div>
    </div>
  );
}

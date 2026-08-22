import type { Activity } from "../types/activity.types";

export function getActivityDescription(activity: Activity): string {
  const { type, metadata } = activity;

  const projectName = typeof metadata.projectName === "string" ? metadata.projectName : "a project";
  const taskTitle = typeof metadata.taskTitle === "string" ? metadata.taskTitle : "a task";

  switch (type) {
    // Project Events
    case "project.created":
      return `Created project ${projectName}`;
    case "project.updated":
      return `Updated project ${projectName}`;
    case "project.archived":
      return `Archived project ${projectName}`;
    case "project.restored":
      return `Restored project ${projectName}`;
    case "project.deleted":
      return `Deleted project ${projectName}`;

    // Task Events
    case "task.created":
      return `Created task ${taskTitle}`;
    case "task.updated":
      return `Updated task ${taskTitle}`;
    case "task.status_changed": {
      const fromStatus = formatStatus(metadata.fromStatus);
      const toStatus = formatStatus(metadata.toStatus);
      if (fromStatus && toStatus) {
        return `Moved ${taskTitle} from ${fromStatus} to ${toStatus}`;
      }
      return `Updated status for ${taskTitle}`;
    }
    case "task.priority_changed": {
      const fromPriority = formatPriority(metadata.fromPriority);
      const toPriority = formatPriority(metadata.toPriority);
      if (fromPriority && toPriority) {
        return `Changed ${taskTitle} priority from ${fromPriority} to ${toPriority}`;
      }
      return `Updated priority for ${taskTitle}`;
    }
    case "task.project_changed": {
      const fromProject = typeof metadata.fromProjectName === "string" ? metadata.fromProjectName : null;
      const toProject = typeof metadata.toProjectName === "string" ? metadata.toProjectName : null;

      if (fromProject && toProject) {
        return `Moved ${taskTitle} from ${fromProject} to ${toProject}`;
      } else if (toProject) {
        return `Added ${taskTitle} to ${toProject}`;
      } else if (fromProject) {
        return `Removed ${taskTitle} from ${fromProject}`;
      }
      return `Moved ${taskTitle}`;
    }
    case "task.archived":
      return `Archived task ${taskTitle}`;
    case "task.restored":
      return `Restored task ${taskTitle}`;
    case "task.deleted":
      return `Deleted task ${taskTitle}`;

    // Member & Workspace Events
    case "member.invited":
      return typeof metadata.email === "string" ? `Invited ${metadata.email}` : "Invited a workspace member";
    case "member.added":
    case "member.joined":
      return "Joined the workspace";
    case "member.removed":
      return typeof metadata.email === "string" ? `Removed ${metadata.email}` : "Left the workspace";
    case "member.role_changed":
      return typeof metadata.newRole === "string" ? `Changed member role to ${metadata.newRole.toLowerCase()}` : "Updated member role";
    case "workspace.owner_transferred":
    case "workspace.ownerTransferred":
      return "Transferred primary workspace ownership";
    case "workspace.updated":
      return "Updated workspace settings";

    // AI Events
    case "ai.plan_committed":
    case "plan.committed":
      return `Committed AI plan for ${projectName}`;
    case "ai.tasks_generated":
      return `Generated tasks using AI for ${projectName}`;
    case "ai.summary_generated":
      return `Generated AI summary for ${projectName}`;
    case "ai.labels_generated":
      return `Generated AI labels for ${projectName}`;

    default: {
      const entityLabel = activity.entityType ? activity.entityType.replace(/([A-Z])/g, " $1").toLowerCase() : "item";
      return `Updated ${entityLabel}`;
    }
  }
}

function formatStatus(status: unknown): string | null {
  if (typeof status !== "string") return null;
  const labels: Record<string, string> = {
    backlog: "Backlog",
    todo: "Todo",
    in_progress: "In Progress",
    in_review: "In Review",
    done: "Done",
    cancelled: "Cancelled",
  };
  return labels[status] || status;
}

function formatPriority(priority: unknown): string | null {
  if (typeof priority !== "string") return null;
  const labels: Record<string, string> = {
    none: "None",
    low: "Low",
    medium: "Medium",
    high: "High",
    urgent: "Urgent",
  };
  return labels[priority] || priority;
}

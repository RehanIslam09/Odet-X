import { Types } from "mongoose";
import Project from "@/models/project.model.js";
import Task from "@/models/task.model.js";
import User from "@/models/user.model.js";
import { provisionPersonalWorkspace } from "@/services/workspace.service.js";

/**
 * Retrieves the complete Dashboard Analytics Overview for the authenticated user scoped to the active workspace.
 */
export async function getDashboardOverview(userId: string, explicitWorkspaceId?: string) {
  const owner = new Types.ObjectId(userId);

  let targetWorkspaceId: Types.ObjectId;
  if (explicitWorkspaceId) {
    targetWorkspaceId = new Types.ObjectId(explicitWorkspaceId);
  } else {
    const userDoc = await User.findById(userId);
    const personal = await provisionPersonalWorkspace({
      _id: userId,
      name: userDoc?.name || "User",
      username: userDoc?.username || "user",
    });
    targetWorkspaceId = personal.workspace._id as Types.ObjectId;
  }
  
  // Use a single captured 'now' to prevent timing inconsistencies across queries
  const now = new Date();
  const dueSoonCutoff = new Date(now);
  dueSoonCutoff.setDate(dueSoonCutoff.getDate() + 7);

  // Execute independent queries concurrently
  const [
    activeProjects,
    archivedProjects,
    taskSummaryResult,
    attentionTasksDocs,
    recentProjectsDocs
  ] = await Promise.all([
    // Active Projects Count
    Project.countDocuments({ owner, workspaceId: targetWorkspaceId, isDeleted: false, archived: false }),
    
    // Archived Projects Count
    Project.countDocuments({ owner, workspaceId: targetWorkspaceId, isDeleted: false, archived: true }),
    
    // Task Summary Aggregation
    Task.aggregate([
      {
        $match: {
          owner,
          workspaceId: targetWorkspaceId,
          isDeleted: false,
          archived: false
        }
      },
      {
        $group: {
          _id: null,
          totalActive: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] } },
          inProgress: { $sum: { $cond: [{ $eq: ["$status", "in_progress"] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } },
          overdue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ["$dueDate", null] },
                    { $lt: ["$dueDate", now] },
                    { $ne: ["$status", "done"] },
                    { $ne: ["$status", "cancelled"] }
                  ]
                },
                1,
                0
              ]
            }
          },
          dueSoon: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ["$dueDate", null] },
                    { $gte: ["$dueDate", now] },
                    { $lte: ["$dueDate", dueSoonCutoff] },
                    { $ne: ["$status", "done"] },
                    { $ne: ["$status", "cancelled"] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]),

    // Attention Tasks (Overdue + Due Soon), limit 5
    Task.find({
      owner,
      workspaceId: targetWorkspaceId,
      isDeleted: false,
      archived: false,
      status: { $nin: ["done", "cancelled"] },
      $or: [
        { dueDate: { $ne: null, $lt: now } }, // Overdue
        { dueDate: { $gte: now, $lte: dueSoonCutoff } } // Due Soon
      ]
    })
      .select("-notes")
      .sort({ dueDate: 1 })
      .limit(5)
      .populate("projectId", "name emoji color")
      .exec(),

    // Recent Projects (ordered by updatedAt desc), limit 4
    Project.find({ owner, workspaceId: targetWorkspaceId, isDeleted: false, archived: false })
      .select("name emoji color updatedAt")
      .sort({ updatedAt: -1 })
      .limit(4)
      .exec()
  ]);

  // 1. Process Task Summary
  let taskSummary = {
    totalActive: 0,
    completed: 0,
    inProgress: 0,
    cancelled: 0,
    overdue: 0,
    dueSoon: 0,
    completionPercentage: 0
  };

  if (taskSummaryResult.length > 0) {
    const s = taskSummaryResult[0];
    const actionableTotal = s.totalActive - s.cancelled;
    const completionPercentage = actionableTotal > 0 ? (s.completed / actionableTotal) * 100 : 0;
    
    taskSummary = {
      totalActive: s.totalActive,
      completed: s.completed,
      inProgress: s.inProgress,
      cancelled: s.cancelled,
      overdue: s.overdue,
      dueSoon: s.dueSoon,
      completionPercentage: Math.round(completionPercentage)
    };
  }

  // 2. Process Attention Tasks (Lightweight Projection)
  const attentionTasks = attentionTasksDocs.map(doc => {
    const json = doc.toJSON() as any;
    return {
      id: json.id,
      title: json.title,
      status: json.status,
      priority: json.priority,
      dueDate: json.dueDate,
      projectId: json.projectId
    };
  });

  // 3. Process Recent Projects and batch calculate their progress
  let recentProjects: any[] = [];
  if (recentProjectsDocs.length > 0) {
    const recentProjectIds = recentProjectsDocs.map(p => p._id);
    
    // Batch aggregation for only the 4 recent projects
    const progressResult = await Task.aggregate([
      {
        $match: {
          projectId: { $in: recentProjectIds },
          owner,
          workspaceId: targetWorkspaceId,
          isDeleted: false,
          archived: false // Use Dashboard semantics: non-deleted, non-archived tasks
        }
      },
      {
        $group: {
          _id: "$projectId",
          totalActive: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } },
        }
      }
    ]);

    const progressMap = new Map();
    progressResult.forEach(res => {
      const actionableTotal = res.totalActive - res.cancelled;
      const completionPercentage = actionableTotal > 0 ? (res.completed / actionableTotal) * 100 : 0;
      
      progressMap.set(res._id.toString(), {
        total: res.totalActive,
        completed: res.completed,
        completionPercentage: Math.round(completionPercentage)
      });
    });

    // Map metrics back to the ordered recent projects
    recentProjects = recentProjectsDocs.map(doc => {
      const json = doc.toJSON() as any;
      const progress = progressMap.get(doc._id.toString()) || { total: 0, completed: 0, completionPercentage: 0 };
      
      return {
        project: {
          id: json.id,
          name: json.name,
          emoji: json.emoji,
          color: json.color,
          updatedAt: json.updatedAt
        },
        progress
      };
    });
  }

  return {
    summary: {
      projects: {
        active: activeProjects,
        archived: archivedProjects
      },
      tasks: taskSummary
    },
    recentProjects,
    attentionTasks
  };
}

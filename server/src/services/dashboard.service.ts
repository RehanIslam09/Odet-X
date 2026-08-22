import { Types } from "mongoose";
import Project from "@/models/project.model.js";
import Task from "@/models/task.model.js";
import User from "@/models/user.model.js";
import Activity from "@/models/activity.model.js";
import { provisionPersonalWorkspace } from "@/services/workspace.service.js";

/**
 * Retrieves the complete Dashboard Analytics Overview for the authenticated user scoped to the active workspace.
 */
export async function getDashboardOverview(userId: string, explicitWorkspaceId?: string) {
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

  const fourteenDaysAgo = new Date(now);
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 13);
  fourteenDaysAgo.setHours(0, 0, 0, 0);

  // Execute independent queries concurrently
  const [
    activeProjects,
    archivedProjects,
    taskSummaryResult,
    attentionTasksDocs,
    recentProjectsDocs,
    activityTrendDocs
  ] = await Promise.all([
    // Active Projects Count
    Project.countDocuments({ workspaceId: targetWorkspaceId, isDeleted: false, archived: false }),
    
    // Archived Projects Count
    Project.countDocuments({ workspaceId: targetWorkspaceId, isDeleted: false, archived: true }),
    
    // Task Summary Aggregation
    Task.aggregate([
      {
        $match: {
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
    Project.find({ workspaceId: targetWorkspaceId, isDeleted: false, archived: false })
      .select("name emoji color updatedAt")
      .sort({ updatedAt: -1 })
      .limit(4)
      .exec(),

    // 14-day Activity Trend & Momentum Aggregation
    Activity.aggregate([
      {
        $match: {
          workspaceId: targetWorkspaceId,
          createdAt: { $gte: fourteenDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ])
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

  // 1.5 Calculate Deterministic Workspace Health Telemetry
  let healthScore = 100;
  let healthStatus = "Optimal";

  const totalTasksEvaluated = taskSummary.totalActive + taskSummary.completed;
  if (totalTasksEvaluated > 0) {
    const overdueRatio = taskSummary.totalActive > 0 ? taskSummary.overdue / taskSummary.totalActive : 0;
    const uncompletedRatio =
      taskSummary.totalActive > 0 ? (taskSummary.totalActive - taskSummary.inProgress) / taskSummary.totalActive : 0;

    healthScore = Math.max(
      0,
      Math.round(100 - overdueRatio * 50 - uncompletedRatio * 20 - (100 - taskSummary.completionPercentage) * 0.15),
    );

    if (healthScore >= 85) {
      healthStatus = "Optimal";
    } else if (healthScore >= 70) {
      healthStatus = "Good";
    } else if (healthScore >= 50) {
      healthStatus = "Needs Attention";
    } else {
      healthStatus = "At Risk";
    }
  }

  const health = {
    score: healthScore,
    status: healthStatus,
    overdueCount: taskSummary.overdue,
    completionRate: taskSummary.completionPercentage,
  };

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

  // 4. Process 14-day Activity Trend & Analytics
  const trendMap = new Map<string, number>();
  activityTrendDocs.forEach((doc: { _id: string; count: number }) => {
    trendMap.set(doc._id, doc.count);
  });

  const dailyTrend: Array<{ date: string; label: string; count: number }> = [];
  let thisWeekCount = 0;
  let lastWeekCount = 0;

  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0] ?? "";
    const label = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    const count = trendMap.get(dateStr) ?? 0;

    dailyTrend.push({ date: dateStr, label, count });

    if (i < 7) {
      thisWeekCount += count;
    } else {
      lastWeekCount += count;
    }
  }

  let activeStreak = 0;
  let currentStreakActive = true;
  for (let i = dailyTrend.length - 1; i >= 0; i--) {
    const dayItem = dailyTrend[i];
    if (dayItem && dayItem.count > 0) {
      if (currentStreakActive) activeStreak++;
    } else if (i === dailyTrend.length - 1) {
      continue;
    } else {
      currentStreakActive = false;
    }
  }

  let momentum: "INCREASING" | "STABLE" | "DECLINING" = "STABLE";
  if (thisWeekCount > lastWeekCount * 1.15) {
    momentum = "INCREASING";
  } else if (thisWeekCount < lastWeekCount * 0.85) {
    momentum = "DECLINING";
  }

  const analytics = {
    momentum,
    activeStreak,
    thisWeekActivityCount: thisWeekCount,
    lastWeekActivityCount: lastWeekCount,
    dailyTrend,
  };

  return {
    summary: {
      projects: {
        active: activeProjects,
        archived: archivedProjects
      },
      tasks: taskSummary,
      health,
      analytics
    },
    recentProjects,
    attentionTasks
  };
}

import Task from "../models/task.model.js";
import { NOTIFICATION_TYPES } from "../constants/notification.js";
import { createNotificationStrict } from "../services/notification.service.js";

// Helper for generating dedupeKeys
const generateDedupeKey = (taskId: string, type: string, dueDate: Date) => {
  return `task:${taskId}:${type}:${dueDate.getTime()}`;
};

/**
 * Generates due-soon and overdue notifications.
 *
 * @param now Evaluated reference time (pass fixed Date for tests, defaults to Date.now())
 */
export const processTaskReminders = async (now: Date = new Date()): Promise<void> => {
  // We process in a memory-safe manner by streaming or batching if necessary.
  // Because mongoose `.cursor()` handles memory safely for large datasets:
  const threshold24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const activeTaskFilter: any = {
    isDeleted: false,
    archived: false,
    status: { $nin: ["done", "cancelled"] },
    dueDate: { $ne: null },
  };

  // 1. Process Due Soon
  // dueDate is strictly greater than `now` AND less than or equal to `now + 24 hours`
  const dueSoonCursor = Task.find({
    ...activeTaskFilter,
    dueDate: { $gt: now, $lte: threshold24h },
  }).cursor();

  for await (const task of dueSoonCursor) {
    if (!task.dueDate) continue;
    const taskIdStr = task._id.toString();

    const dedupeKey = generateDedupeKey(taskIdStr, "due_soon", task.dueDate);

    try {
      await createNotificationStrict({
        recipientId: task.owner.toString(),
        type: NOTIFICATION_TYPES.TASK_DUE_SOON as any, // Typecast since it's mapped to string union
        entityType: "task",
        entityId: taskIdStr,
        title: "Task due soon",
        message: `The task "${task.title}" is due within 24 hours.`,
        dedupeKey,
        metadata: {
          taskId: taskIdStr,
          taskTitle: task.title,
          dueDate: task.dueDate.toISOString(),
        },
      });
    } catch (err) {
      console.error(`Error processing due_soon for task ${taskIdStr}:`, err);
      // We log but DO NOT crash the worker loop, allowing subsequent tasks to process.
    }
  }

  // 2. Process Overdue
  // dueDate is strictly less than `now`
  const overdueCursor = Task.find({
    ...activeTaskFilter,
    dueDate: { $lt: now },
  }).cursor();

  for await (const task of overdueCursor) {
    if (!task.dueDate) continue;
    const taskIdStr = task._id.toString();

    const dedupeKey = generateDedupeKey(taskIdStr, "overdue", task.dueDate);

    try {
      await createNotificationStrict({
        recipientId: task.owner.toString(),
        type: NOTIFICATION_TYPES.TASK_OVERDUE as any,
        entityType: "task",
        entityId: taskIdStr,
        title: "Task overdue",
        message: `The task "${task.title}" is now overdue.`,
        dedupeKey,
        metadata: {
          taskId: taskIdStr,
          taskTitle: task.title,
          dueDate: task.dueDate.toISOString(),
        },
      });
    } catch (err) {
      console.error(`Error processing overdue for task ${taskIdStr}:`, err);
      // Log and continue
    }
  }
};

import { motion, AnimatePresence } from "framer-motion";
import type { Variants } from "framer-motion";
import { TaskCard } from "./TaskCard.js";
import { TaskEmptyState } from "./TaskEmptyState.js";
import { TaskSkeleton } from "./TaskSkeleton.js";
import type { Task } from "../types/tasks.types.js";

interface TaskListProps {
  tasks: Task[];
  isLoading: boolean;
  onCreateTaskClick?: () => void;
  onEditTask: (task: Task) => void;
  onArchiveTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03,
      delayChildren: 0.05,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 5 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.25,
      ease: "easeOut" as const,
    },
  },
  exit: {
    opacity: 0,
    y: -5,
    transition: {
      duration: 0.15,
    },
  },
};

export function TaskList({
  tasks,
  isLoading,
  onCreateTaskClick,
  onEditTask,
  onArchiveTask,
  onDeleteTask,
}: TaskListProps) {
  if (isLoading) {
    return <TaskSkeleton count={6} />;
  }

  if (tasks.length === 0) {
    return <TaskEmptyState onCreateClick={onCreateTaskClick} />;
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-2"
    >
      <AnimatePresence mode="popLayout">
        {tasks.map((task) => (
          <motion.div
            key={task.id}
            variants={itemVariants}
            layout="position"
            exit="exit"
          >
            <TaskCard
              task={task}
              onEdit={onEditTask}
              onArchive={onArchiveTask}
              onDelete={onDeleteTask}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}

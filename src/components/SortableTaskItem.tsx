"use client";

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
// import { GripVertical } from 'lucide-react'; // Removed
import { cn } from '@/lib/utils';
import TaskItem from './TaskItem';
import { Task } from '@/hooks/useTasks';
import { UniqueIdentifier } from '@dnd-kit/core';
// import { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities'; // Removed
import { Appointment } from '@/hooks/useAppointments';

interface SortableTaskItemProps {
  id: UniqueIdentifier;
  task: Task;
  allTasks: Task[];
  onDelete: (taskId: string) => void;
  onUpdate: (taskId: string, updates: Partial<Task>) => Promise<string | null>;
  sections: { id: string; name: string }[];
  onOpenOverview: (task: Task) => void;
  currentDate: Date;
  onMoveUp: (taskId: string) => Promise<void>;
  onMoveDown: (taskId: string) => Promise<void>;
  level: number;
  isOverlay?: boolean;
  hasSubtasks?: boolean;
  isExpanded?: boolean;
  toggleTask?: (taskId: string) => void;
  setFocusTask: (taskId: string | null) => Promise<void>;
  isDoToday: boolean;
  toggleDoToday: (task: Task) => void;
  scheduledTasksMap: Map<string, Appointment>;
  isDemo?: boolean;
  expandedTasks?: Record<string, boolean>; // Added for TaskList error
}

const SortableTaskItem: React.FC<SortableTaskItemProps> = ({
  id,
  task,
  allTasks,
  onDelete,
  onUpdate,
  sections,
  onOpenOverview,
  currentDate,
  onMoveUp,
  onMoveDown,
  level,
  isOverlay = false,
  hasSubtasks = false,
  isExpanded = true,
  toggleTask,
  setFocusTask,
  isDoToday,
  toggleDoToday,
  scheduledTasksMap,
  isDemo = false,
  expandedTasks, // Destructure here
}) => {
  const {
    // attributes, // Removed
    // listeners, // Removed
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 0,
    // position: 'relative', // Removed, handled by className
  };

  return (
    <div ref={setNodeRef} style={style} className={cn("relative", isDragging && "shadow-lg rounded-xl")}>
      <TaskItem
        task={task}
        allTasks={allTasks}
        onDelete={onDelete}
        onUpdate={onUpdate}
        sections={sections}
        onOpenOverview={onOpenOverview}
        currentDate={currentDate}
        onMoveUp={() => Promise.resolve()} // Placeholder
        onMoveDown={() => Promise.resolve()} // Placeholder
        level={level}
        isOverlay={isOverlay}
        hasSubtasks={hasSubtasks}
        isExpanded={isExpanded}
        toggleTask={toggleTask}
        setFocusTask={setFocusTask}
        isDoToday={isDoToday}
        toggleDoToday={toggleDoToday}
        scheduledTasksMap={scheduledTasksMap}
        isDemo={isDemo}
        expandedTasks={expandedTasks} // Pass it down
      />
    </div>
  );
};

export default SortableTaskItem;
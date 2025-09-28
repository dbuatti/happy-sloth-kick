"use client";

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
// import { GripVertical } from 'lucide-react'; // Removed unused import
import { cn } from '@/lib/utils';
import TaskItem from './TaskItem';
import { Task } from '@/hooks/useTasks';
import { UniqueIdentifier } from '@dnd-kit/core';
// import { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities'; // Removed unused import
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
  // onMoveUp: (taskId: string) => Promise<void>; // Removed unused prop
  // onMoveDown: (taskId: string) => Promise<void>; // Removed unused prop
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
  expandedTasks?: Record<string, boolean>;
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
  // onMoveUp, // Removed unused variable
  // onMoveDown, // Removed unused variable
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
  expandedTasks,
}) => {
  const {
    // attributes, // Removed unused variable
    // listeners, // Removed unused variable
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
    // position: 'relative', // Removed, as 'relative' is already applied via Tailwind className
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
        onMoveUp={() => Promise.resolve()} // Placeholder, but not passed as prop
        onMoveDown={() => Promise.resolve()} // Placeholder, but not passed as prop
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
        expandedTasks={expandedTasks}
      />
    </div>
  );
};

export default SortableTaskItem;
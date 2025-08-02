"use client";

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task } from '@/hooks/useTasks';
import TaskItem from './TaskItem';
import { cn } from '@/lib/utils';

interface SortableTaskItemProps {
  task: Task;
  onStatusChange: (task: Task, newStatus: Task['status']) => Promise<void>; // Changed from taskId: string
  onDelete: (taskId: string) => void;
  onUpdate: (task: Task, updates: Partial<Task>) => void; // Changed from taskId: string
  isSelected: boolean;
  onToggleSelect: (taskId: string, checked: boolean) => void;
  sections: { id: string; name: string }[];
  onOpenOverview: (task: Task) => void;
  currentDate: Date;
  onMoveUp: (taskId: string) => Promise<void>;
  onMoveDown: (taskId: string) => Promise<void>;
  level: number; // New prop for indentation level
  allTasks: Task[]; // Pass all tasks to filter subtasks
  isOverlay?: boolean; // New prop for drag overlay
}

const SortableTaskItem: React.FC<SortableTaskItemProps> = ({
  task,
  level,
  allTasks,
  isOverlay = false, // Default to false
  ...rest
}) => {
  // Conditionally use useSortable
  const sortable = !isOverlay ? useSortable({ id: task.id, data: { type: 'task', task } }) : null;

  const attributes = sortable?.attributes;
  const listeners = sortable?.listeners; // Get listeners here
  const setNodeRef = sortable?.setNodeRef || null; // Use null if not sortable
  const transform = sortable?.transform;
  const transition = sortable?.transition;
  const isDragging = sortable?.isDragging || false; // Default to false if not sortable

  const style: React.CSSProperties = { // Explicitly type as React.CSSProperties
    transform: CSS.Transform.toString(transform || null), // Ensure transform is Transform | null
    transition,
    zIndex: isDragging ? 10 : 'auto', // Original item should be behind overlay
    // If it's the original item being dragged, make it invisible
    opacity: isDragging && !isOverlay ? 0 : 1,
    visibility: isDragging && !isOverlay ? 'hidden' : 'visible',
    paddingLeft: `${level * 12}px`,
  };

  const directSubtasks = allTasks.filter(t => t.parent_task_id === task.id)
                                 .sort((a, b) => (a.order || Infinity) - (b.order || Infinity));

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative last:border-b-0 transition-all duration-200 ease-in-out group",
        isDragging && !isOverlay ? "" : "rounded-lg", // Only apply border/rounded-lg if not the invisible original
        isOverlay ? "shadow-xl ring-2 ring-primary bg-card" : "", // Apply distinct styles for the overlay
        level > 0 ? "border-l border-l-primary/50" : "",
        "flex items-center",
        isOverlay ? "cursor-grabbing" : ""
      )}
      {...(attributes || {})} // Apply attributes to the li
      {...(listeners || {})} // Apply listeners to the li for dragging the whole item
    >
      <div className="flex-1"> {/* This div now contains the TaskItem and subtasks */}
        <TaskItem
          task={task}
          {...rest}
          isOverlay={isOverlay}
          // Removed dragHandleProps
        />
        {directSubtasks.length > 0 && (
          <ul className="list-none mt-1.5 space-y-1.5">
            {directSubtasks.map(subtask => (
              <SortableTaskItem
                key={subtask.id}
                task={subtask}
                level={level + 1}
                allTasks={allTasks}
                {...rest}
                isOverlay={isOverlay}
              />
            ))}
          </ul>
        )}
      </div>
    </li>
  );
};

export default SortableTaskItem;
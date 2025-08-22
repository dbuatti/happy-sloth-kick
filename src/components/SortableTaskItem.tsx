"use client";

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task, TaskCategory } from '@/types'; // Import Task and TaskCategory from @/types
import TaskItem from './TaskItem'; // Import the new TaskItem component

interface SortableTaskItemProps {
  task: Task;
  categories: TaskCategory[];
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onUpdate: (taskId: string, updates: Partial<Task>) => void;
  allTasks?: Task[]; // For subtasks
  onStatusChange?: (taskId: string, newStatus: Task['status']) => void;
  onOpenOverview?: (task: Task) => void;
}

const SortableTaskItem: React.FC<SortableTaskItemProps> = ({
  task,
  categories,
  onEdit,
  onDelete,
  onUpdate,
  allTasks,
  onStatusChange,
  onOpenOverview,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { type: 'task', task } });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 'auto',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskItem
        task={task}
        categories={categories}
        onEdit={onEdit}
        onDelete={onDelete}
        onUpdate={onUpdate}
        allTasks={allTasks}
        onStatusChange={onStatusChange}
        onOpenOverview={onOpenOverview}
      />
    </div>
  );
};

export default SortableTaskItem;
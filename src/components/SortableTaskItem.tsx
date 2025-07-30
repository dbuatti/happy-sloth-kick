import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task } from '@/hooks/useTasks';
import TaskItem from './TaskItem';
import { cn } from '@/lib/utils';

interface SortableTaskItemProps {
  task: Task;
  userId: string | null;
  onStatusChange: (taskId: string, newStatus: Task['status']) => Promise<void>;
  onDelete: (taskId: string) => void;
  onUpdate: (taskId: string, updates: Partial<Task>) => void;
  isSelected: boolean;
  onToggleSelect: (taskId: string, checked: boolean) => void;
  sections: { id: string; name: string }[];
  onEditTask: (task: Task) => void;
  currentDate: Date;
  onMoveUp: (taskId: string) => Promise<void>; // Added
  onMoveDown: (taskId: string) => Promise<void>; // Added
  onSetAsFocusTask: (taskId: string) => void; // New prop
  manualFocusTaskId: string | null; // New prop
  onClearManualFocus: () => void; // New prop
  onOpenFocusOverlay: () => void; // New prop
}

const SortableTaskItem: React.FC<SortableTaskItemProps> = ({
  task,
  manualFocusTaskId, // Destructure new prop
  onClearManualFocus, // Destructure new prop
  onOpenFocusOverlay, // Destructure new prop
  ...rest
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { type: 'task', task } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 'auto',
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "relative border rounded-lg p-2 transition-all duration-200 ease-in-out group",
        isDragging ? "ring-2 ring-primary shadow-lg" : "hover:shadow-md",
        task.id === manualFocusTaskId ? "ring-2 ring-purple-500 dark:ring-purple-400 bg-purple-50/10 dark:bg-purple-900/10" : "" // Visual highlight
      )}
    >
      <TaskItem 
        task={task} 
        manualFocusTaskId={manualFocusTaskId} // Pass new prop
        onClearManualFocus={onClearManualFocus} // Pass new prop
        onOpenFocusOverlay={onOpenFocusOverlay} // Pass new prop
        {...rest} 
      />
    </li>
  );
};

export default SortableTaskItem;
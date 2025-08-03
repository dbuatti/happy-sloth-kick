import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task } from '@/hooks/useTasks';
import TaskItem from './TaskItem';
import { cn } from '@/lib/utils';

interface SortableTaskItemProps {
  task: Task;
  onStatusChange: (taskId: string, newStatus: Task['status']) => Promise<void>;
  onDelete: (taskId: string) => void;
  onUpdate: (taskId: string, updates: Partial<Task>) => void;
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
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { type: 'task', task } });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform || null), // Correctly handle null transform
    transition,
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
        isOverlay ? "cursor-grabbing" : "cursor-grab"
      )}
      {...attributes}
      {...listeners}
    >
      <div className="flex-1"> {/* This div now contains the TaskItem and subtasks */}
        <TaskItem
          task={task}
          {...rest}
          isOverlay={isOverlay}
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
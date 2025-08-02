import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task } from '@/hooks/useTasks';
import TaskItem from './TaskItem';
import { cn } from '@/lib/utils';
import { GripVertical } from 'lucide-react'; // Import GripVertical icon

interface SortableTaskItemProps {
  task: Task;
  userId: string | null;
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
  // Conditionally use useSortable
  const sortable = !isOverlay ? useSortable({ id: task.id, data: { type: 'task', task } }) : null;

  const attributes = sortable?.attributes;
  const setNodeRef = sortable?.setNodeRef || null; // Use null if not sortable
  const transform = sortable?.transform;
  const transition = sortable?.transition;
  const isDragging = sortable?.isDragging || false; // Default to false if not sortable

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 'auto',
    opacity: isDragging ? 0.5 : 1,
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
        isDragging ? "ring-2 ring-primary shadow-lg" : "hover:shadow-md",
        level > 0 ? "bg-background border-l border-l-primary/50" : "",
        "flex items-center",
        isOverlay ? "cursor-grabbing" : ""
      )}
      {...(attributes || {})} // Keep attributes here
    >
      <button
        className={cn(
          "flex-shrink-0 py-2 px-1.5 text-muted-foreground opacity-100 group-hover:opacity-100 transition-opacity duration-200",
          isOverlay ? "cursor-grabbing" : "cursor-grab active:cursor-grabbing"
        )}
        aria-label="Drag to reorder task"
        {...(sortable?.listeners || {})} // ADD listeners here
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1">
        <TaskItem 
          task={task} 
          {...rest} 
          isOverlay={isOverlay} // Pass isOverlay prop
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
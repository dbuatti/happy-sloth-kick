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
}

const SortableTaskItem: React.FC<SortableTaskItemProps> = ({
  task,
  level,
  allTasks,
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
    // Apply indentation based on level
    paddingLeft: `${level * 20}px`, // 20px per level of indentation
  };

  const directSubtasks = allTasks.filter(t => t.parent_task_id === task.id)
                                 .sort((a, b) => (a.order || Infinity) - (b.order || Infinity));

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative border rounded-lg transition-all duration-200 ease-in-out group",
        isDragging ? "ring-2 ring-primary shadow-lg" : "hover:shadow-md",
        level > 0 ? "bg-muted/50 dark:bg-gray-800/50 border-l-4 border-l-primary/50" : "", // Visual cue for subtasks
        "cursor-grab active:cursor-grabbing",
        "hover:bg-accent/5 dark:hover:bg-accent/10",
        "flex items-center" // Ensure vertical alignment of drag handle and TaskItem content
      )}
      {...attributes} // Keep attributes on the main element
      {...listeners} // Keep listeners on the main element for whole-item drag
    >
      <button
        className="flex-shrink-0 py-1 px-0.5 text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity duration-200 cursor-grab active:cursor-grabbing"
        aria-label="Drag to reorder task"
        data-no-dnd="true" // Ensure this button is the only drag handle
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <div className="flex-1"> {/* Wrap TaskItem to allow it to take remaining space */}
        <TaskItem 
          task={task} 
          {...rest} 
        />
        {directSubtasks.length > 0 && (
          <ul className="list-none mt-1.5 space-y-1.5">
            {directSubtasks.map(subtask => (
              <SortableTaskItem
                key={subtask.id}
                task={subtask}
                level={level + 1}
                allTasks={allTasks} // Pass all tasks down
                {...rest}
              />
            ))}
          </ul>
        )}
      </div>
    </li>
  );
};

export default SortableTaskItem;
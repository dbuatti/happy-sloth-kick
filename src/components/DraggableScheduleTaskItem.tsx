import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Task, TaskSection, TaskCategory, TaskPriority } from '@/types/task';
import { cn } from '@/lib/utils';
import { format, isToday, isTomorrow, isPast, parseISO } from 'date-fns';
import { getCategoryColorProps } from '@/utils/categoryColors';

interface DraggableScheduleTaskItemProps {
  task: Task;
  sections: TaskSection[];
  categories: TaskCategory[];
  onClick: (task: Task) => void;
  className?: string;
}

const DraggableScheduleTaskItem: React.FC<DraggableScheduleTaskItemProps> = ({
  task,
  sections,
  categories,
  onClick,
  className,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useDraggable({
    id: `task-${task.id}`,
    data: { type: 'Task', task },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 'auto',
    opacity: isDragging ? 0.5 : 1,
  };

  const category = categories.find((cat) => cat.id === task.category);
  const section = sections.find((sec) => sec.id === task.section_id);
  const categoryProps = category ? getCategoryColorProps(category.color) : null;

  const getDueDateText = (dueDate: string | null) => {
    if (!dueDate) return null;
    const date = parseISO(dueDate);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    if (isPast(date) && !isToday(date)) return 'Overdue';
    return format(date, 'MMM d');
  };

  const getPriorityClasses = () => {
    switch (task.priority) {
      case 'urgent':
        return 'text-red-500';
      case 'high':
        return 'text-orange-500';
      case 'medium':
        return 'text-yellow-500';
      case 'low':
        return 'text-green-500';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => onClick(task)}
      className={cn(
        'flex flex-col p-2 rounded-md shadow-sm text-sm cursor-grab active:cursor-grabbing',
        'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600',
        className
      )}
    >
      <div className="font-medium truncate">{task.description}</div>
      <div className="flex flex-wrap gap-1 text-xs text-gray-500">
        {section && <span className="truncate">{section.name}</span>}
        {category && categoryProps && (
          <span className={cn("px-1.5 py-0.5 rounded-full text-white", categoryProps.backgroundClass)}>
            {category.name}
          </span>
        )}
        {task.priority && task.priority !== null && ( // Changed from 'none' to null
          <span className={cn("flex items-center gap-1", getPriorityClasses())}>
            {task.priority}
          </span>
        )}
        {task.due_date && (
          <span className={cn(isPast(parseISO(task.due_date)) && !isToday(parseISO(task.due_date)) ? 'text-red-500' : '')}>
            {getDueDateText(task.due_date)}
          </span>
        )}
      </div>
    </div>
  );
};

export default DraggableScheduleTaskItem;
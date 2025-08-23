import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task, TaskSection, TaskCategory, DraggableScheduleTaskItemProps } from '@/types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { getCategoryColorProps, CategoryColorKey } from '@/lib/categoryColors';
import { format, parseISO, isPast, isToday } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';

const DraggableScheduleTaskItem: React.FC<DraggableScheduleTaskItemProps> = ({
  id,
  task,
  categories,
  sections,
  onUpdateTask,
  onDeleteTask,
  onAddSubtask,
  onToggleFocusMode,
  onLogDoTodayOff,
  isDragging: propIsDragging,
  doTodayOffLog,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  const categoryProps = task.category
    ? getCategoryColorProps(categories.find(cat => cat.id === task.category)?.color as CategoryColorKey)
    : { backgroundClass: 'bg-gray-100', textColor: 'text-gray-800' };

  const isOverdue = task.due_date && isPast(parseISO(task.due_date)) && !isToday(parseISO(task.due_date));
  const isDueToday = task.due_date && isToday(parseISO(task.due_date));

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "flex items-center p-2 rounded-md border bg-card text-card-foreground shadow-sm cursor-grab",
        (propIsDragging || isDragging) && "ring-2 ring-primary"
      )}
    >
      <div className="flex-1 grid gap-1">
        <p className="text-sm font-medium leading-none">{task.description}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {task.category && (
            <span className={cn("px-2 py-0.5 rounded-full", categoryProps.backgroundClass, categoryProps.textColor)}>
              {categories.find(cat => cat.id === task.category)?.name || 'Uncategorized'}
            </span>
          )}
          {task.priority && task.priority !== 'medium' && (
            <span className={cn(
              "px-2 py-0.5 rounded-full",
              task.priority === 'urgent' && "bg-red-100 text-red-800",
              task.priority === 'high' && "bg-orange-100 text-orange-800",
              task.priority === 'low' && "bg-blue-100 text-blue-800"
            )}>
              {task.priority}
            </span>
          )}
          {task.due_date && (
            <span className={cn(
              "flex items-center gap-1",
              isOverdue ? "text-red-500" : isDueToday ? "text-orange-500" : "text-muted-foreground"
            )}>
              <CalendarIcon className="h-3 w-3" />
              {format(parseISO(task.due_date), 'MMM d, yyyy')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default DraggableScheduleTaskItem;
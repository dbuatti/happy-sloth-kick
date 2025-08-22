"use client";

import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Task, TaskSection } from '@/types/task'; // Corrected import
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { Calendar as CalendarIcon, Flag } from 'lucide-react';
import { getCategoryColorProps } from '@/lib/categoryColors';

interface DraggableScheduleTaskItemProps {
  task: Task;
  sections: TaskSection[];
  onClick?: (task: Task) => void;
}

const DraggableScheduleTaskItem: React.FC<DraggableScheduleTaskItemProps> = ({ task, sections, onClick }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `task-${task.id}`,
    data: { type: 'task', task },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: isDragging ? 10 : 'auto',
  } : undefined;

  const section = sections.find(s => s.id === task.section_id);
  const categoryProps = task.category_color ? getCategoryColorProps(task.category_color) : null;

  const getPriorityClasses = () => {
    switch (task.priority) {
      case 'urgent': return "text-red-600";
      case 'high': return "text-orange-500";
      case 'medium': return "text-yellow-500";
      case 'low': return "text-green-500";
      default: return "text-muted-foreground";
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "relative p-2 rounded-md border bg-card text-sm cursor-grab",
        isDragging ? "opacity-50 shadow-lg" : "hover:bg-accent/50",
        task.status === 'completed' && "line-through text-muted-foreground bg-muted/50"
      )}
      onClick={() => onClick?.(task)}
    >
      <h4 className="font-medium truncate">{task.description}</h4>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground mt-1">
        {section && <span className="truncate">{section.name}</span>}
        {task.category_name && categoryProps && (
          <span className={cn("px-1.5 py-0.5 rounded-full text-white", categoryProps.backgroundClass)}>
            {task.category_name}
          </span>
        )}
        {task.due_date && (
          <span className="flex items-center gap-1">
            <CalendarIcon className="h-3 w-3" /> {format(parseISO(task.due_date), 'MMM d')}
          </span>
        )}
        {task.priority && task.priority !== 'none' && (
          <span className={cn("flex items-center gap-1", getPriorityClasses())}>
            <Flag className="h-3 w-3" /> {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
          </span>
        )}
      </div>
    </div>
  );
};

export default DraggableScheduleTaskItem;
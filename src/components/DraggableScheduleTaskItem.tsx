import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Task } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';
import { ListTodo } from 'lucide-react';

interface DraggableScheduleTaskItemProps {
  task: Task;
  sections: any[]; // Simplified for now
}

const DraggableScheduleTaskItem: React.FC<DraggableScheduleTaskItemProps> = ({ task }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `task-${task.id}`,
    data: { type: 'task', task },
  });

  const dragStyle = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  const getPriorityColor = (priority: string | null) => {
    if (!priority) return 'border-l-gray-300';
    switch (priority) {
      case 'low': return 'border-l-green-500';
      case 'medium': return 'border-l-yellow-500';
      case 'high': return 'border-l-orange-500';
      case 'urgent': return 'border-l-red-500';
      default: return 'border-l-gray-300';
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={dragStyle}
      {...listeners}
      {...attributes}
      className={cn(
        "p-2 rounded-md bg-card shadow-sm flex items-center gap-2 border-l-4 select-none",
        getPriorityColor(task.priority || null),
        isDragging && "opacity-50"
      )}
    >
      <ListTodo className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <span className="text-sm truncate">{task.description}</span>
    </div>
  );
};

export default DraggableScheduleTaskItem;
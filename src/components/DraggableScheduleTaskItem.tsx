import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Task, TaskSection } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';
import { GripVertical, FolderOpen } from 'lucide-react';

interface DraggableScheduleTaskItemProps {
  task: Task;
  sections: TaskSection[];
}

const DraggableScheduleTaskItem: React.FC<DraggableScheduleTaskItemProps> = ({ task, sections }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `task-${task.id}`,
    data: { type: 'task', task, duration: 30 },
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'border-l-priority-urgent';
      case 'high': return 'border-l-priority-high';
      case 'medium': return 'border-l-priority-medium';
      case 'low': return 'border-l-priority-low';
      default: return 'border-l-gray-500';
    }
  };

  const section = sections.find(s => s.id === task.section_id);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "p-2 rounded-md bg-card shadow-sm flex items-center gap-2 border-l-4",
        getPriorityColor(task.priority),
        isDragging && "opacity-50"
      )}
    >
      <button {...listeners} {...attributes} className="cursor-grab touch-none p-1 -ml-1">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate">{task.description}</p>
        {section && (
          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <FolderOpen className="h-3 w-3" />
            <span>{section.name}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default DraggableScheduleTaskItem;